'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, AlertCircle, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import apiClient from '@/lib/api-client';

interface EmailStats {
  total_sent: number;
  delivered: number;
  failed: number;
  pending: number;
}

export default function EmailDashboardPage() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await apiClient.get('/v1/email/stats');
      setStats(data);
    } catch {
      // API might not exist yet
      setStats({ total_sent: 0, delivered: 0, failed: 0, pending: 0 });
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    { label: 'Total Enviados', value: stats?.total_sent ?? 0, icon: Send, color: 'bg-blue-500' },
    { label: 'Entregados', value: stats?.delivered ?? 0, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Fallidos', value: stats?.failed ?? 0, icon: AlertCircle, color: 'bg-red-500' },
    { label: 'Pendientes', value: stats?.pending ?? 0, icon: Clock, color: 'bg-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Service</h1>
          <p className="text-gray-500 mt-1">Gestion de emails transaccionales y campanas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? '...' : card.value.toLocaleString()}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold">Actividad Reciente</h2>
        </div>
        <p className="text-gray-500 text-sm">
          Los logs de email se mostraran aqui cuando el servicio este activo.
        </p>
      </div>
    </div>
  );
}
