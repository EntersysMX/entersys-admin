/**
 * API Client with automatic session handling
 *
 * Features:
 * - Automatic token injection
 * - 401 handling with redirect to login
 * - Refresh token on expiration
 * - Cookie cleanup on logout
 */

import Cookies from 'js-cookie';

// API URL - EnterSys backend
const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.entersys.mx/api')
  : (process.env.NEXT_PUBLIC_API_URL || 'https://api.entersys.mx/api');

export class ApiClient {
  private static instance: ApiClient;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private getAccessToken(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem('accessToken') || undefined;
  }

  private getRefreshToken(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem('refreshToken') || undefined;
  }

  private clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('organizationId');

    // Clear cookies
    Cookies.remove('auth_token');
    Cookies.remove('entersys_access_token', { domain: '.entersys.mx' });
    Cookies.remove('entersys_refresh_token', { domain: '.entersys.mx' });
    Cookies.remove('entersys_user', { domain: '.entersys.mx' });
  }

  private redirectToLogin(returnUrl?: string) {
    const loginUrl = new URL('/login', window.location.origin);
    if (returnUrl) {
      loginUrl.searchParams.set('returnUrl', returnUrl);
    } else if (window.location.pathname !== '/login') {
      loginUrl.searchParams.set('returnUrl', window.location.pathname);
    }
    window.location.href = loginUrl.toString();
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update localStorage with new tokens
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        console.log('Received 401, attempting token refresh...');

        // Try to refresh the token
        const refreshed = await this.refreshAccessToken();

        if (refreshed) {
          // Retry the original request with new token
          const newToken = this.getAccessToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
          }

          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });

          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }

        // Refresh failed or retry failed, clear session and redirect
        console.log('Token refresh failed, redirecting to login...');
        this.clearSession();
        this.redirectToLogin();

        throw new Error('Session expired');
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        error.response = { data: errorData, status: response.status };
        throw error;
      }

      // Parse and return JSON response
      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Convenience methods
  get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * POST with SSE streaming response.
   * Calls onChunk for each text chunk and onDone when complete.
   * Returns the full accumulated text.
   */
  async postStream(
    endpoint: string,
    body: any,
    callbacks: {
      onChunk: (text: string) => void;
      onDone: (meta: any) => void;
      onError?: (error: string) => void;
    },
  ): Promise<string> {
    const token = this.getAccessToken();
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return this.postStream(endpoint, body, callbacks);
      }
      this.clearSession();
      this.redirectToLogin();
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);
          if (event.type === 'chunk') {
            fullText += event.text;
            callbacks.onChunk(event.text);
          } else if (event.type === 'done') {
            callbacks.onDone(event.meta);
          } else if (event.type === 'error') {
            callbacks.onError?.(event.message);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    return fullText;
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();

// Export for convenience
export default apiClient;
