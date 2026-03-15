import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const LIVE_CHAT_ROLES = [
  'SALES_AGENT', 'SALES_SUPERVISOR', 'SALES_MANAGER',
  'SOPORTE_TECNICO', 'GERENTE_SOPORTE',
  'DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'ADMIN',
];

export function useLiveChatBadge(): number {
  const [count, setCount] = useState(0);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user || !LIVE_CHAT_ROLES.includes(user.role)) return;

    let cancelled = false;

    const fetchCount = async () => {
      try {
        const data = await apiClient.get<{ waiting: number; active: number; total: number }>('/v1/chat/agent/sessions/count');
        if (!cancelled) setCount(data.waiting || data.total || 0);
      } catch {
        // Silently fail — badge is non-critical
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 15000); // poll every 15s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  return count;
}
