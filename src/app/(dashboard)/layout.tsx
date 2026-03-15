'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { PlatformSidebar } from '@/components/layout/PlatformSidebar';
import { InternalChatWidget } from '@/components/chat/InternalChatWidget';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, fetchMe, user } = useAuthStore();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch user data if not already loaded
    if (!user) {
      fetchMe();
    }
  }, [router, user, fetchMe]);

  // Show loading state while checking auth
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="p-4 pt-14 lg:p-8 lg:pt-8">{children}</div>
      </main>
      <InternalChatWidget />
    </div>
  );
}
