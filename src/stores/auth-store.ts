import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // All UserRole values from backend
  organizationId: string | null;
  isEmailVerified: boolean;
}

interface AuthState {
  user: User | null;
  organizationId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setOrganization: (orgId: string) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

function hydrateUser(): { user: User | null; organizationId: string | null } {
  if (typeof window === 'undefined') return { user: null, organizationId: null };
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw) as User;
      return { user, organizationId: user.organizationId };
    }
  } catch {}
  return { user: null, organizationId: null };
}

const initial = hydrateUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initial.user,
  organizationId: initial.organizationId,
  isLoading: false,
  isAuthenticated: !!initial.user,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await apiClient.post<LoginResponse>('/v1/auth/login', {
        email,
        password,
      });

      // Store tokens in localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.organizationId) {
        localStorage.setItem('organizationId', data.user.organizationId);
      }

      // Store in first-party cookie for this application only
      if (typeof document !== 'undefined') {
        document.cookie = `auth_token=${data.accessToken}; path=/; max-age=${15 * 60}; secure; samesite=lax`;
      }

      set({
        user: data.user,
        organizationId: data.user.organizationId,
        isAuthenticated: true,
        isLoading: false,
      });

      toast.success('Login successful!');
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post<LoginResponse>('/v1/auth/register', data);

      // Store tokens
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      if (response.user.organizationId) {
        localStorage.setItem('organizationId', response.user.organizationId);
      }

      set({
        user: response.user,
        organizationId: response.user.organizationId,
        isAuthenticated: true,
        isLoading: false,
      });

      toast.success('Registration successful!');
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('organizationId');

    // Clear first-party cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'auth_token=; path=/; max-age=0';
    }

    set({
      user: null,
      organizationId: null,
      isAuthenticated: false,
    });

    toast.success('Logged out successfully');
    window.location.href = '/login';
  },

  fetchMe: async () => {
    try {
      const user = await apiClient.get<User>('/v1/auth/me');

      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        organizationId: user.organizationId,
        isAuthenticated: true,
      });
    } catch (error) {
      // Clear auth if fetch fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('organizationId');

      set({
        user: null,
        organizationId: null,
        isAuthenticated: false,
      });
    }
  },

  setOrganization: (orgId: string) => {
    localStorage.setItem('organizationId', orgId);
    set({ organizationId: orgId });
  },
}));
