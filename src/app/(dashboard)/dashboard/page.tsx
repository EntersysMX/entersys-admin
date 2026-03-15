'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, AppWindow, Shield, TrendingUp, ExternalLink, Star, Flame, Trophy, CheckCircle2, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  totalOrganizations: number;
  totalApplications: number;
  activeUsers: number;
}

interface GamificationSummary {
  balance: number;
  currentStreak: number;
  totalEarned: number;
}

interface RoleApp {
  name: string;
  url: string;
  icon: string;
  description: string;
}

const ALL_APPS: RoleApp[] = [
  { name: 'CRM', url: 'https://crm.entersys.mx', icon: '📊', description: 'Gestion de clientes y oportunidades' },
  { name: 'AtomicSales', url: 'https://atomicsales.entersys.mx', icon: '⚡', description: 'Herramienta de ventas' },
  { name: 'Gestion Logistica', url: 'https://app-gestion-logistica.entersys.mx', icon: '📦', description: 'Sistema de logistica y entregas' },
  { name: 'Blog Admin', url: 'https://admin-blog.entersys.mx', icon: '✏️', description: 'Administracion del blog' },
];

const ROLE_APPS: Record<string, string[]> = {
  SALES_AGENT: ['CRM', 'AtomicSales'],
  SALES_SUPERVISOR: ['CRM', 'AtomicSales'],
  SALES_MANAGER: ['CRM', 'AtomicSales'],
  COMPRAS: ['Gestion Logistica', 'CRM'],
  CHOFER: ['Gestion Logistica'],
  SOPORTE_TECNICO: ['Gestion Logistica', 'CRM'],
  GERENTE_SOPORTE: ['Gestion Logistica', 'CRM'],
  RRHH: ['CRM'],
  CONTENT_EDITOR: ['Blog Admin'],
  CONTENT_ADMIN: ['Blog Admin', 'CRM'],
  DIRECTOR: ['CRM', 'AtomicSales', 'Gestion Logistica', 'Blog Admin'],
  PLATFORM_ADMIN: ['CRM', 'AtomicSales', 'Gestion Logistica', 'Blog Admin'],
  SUPER_ADMIN: ['CRM', 'AtomicSales', 'Gestion Logistica', 'Blog Admin'],
  ADMIN: ['CRM', 'AtomicSales', 'Gestion Logistica', 'Blog Admin'],
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalOrganizations: 0,
    totalApplications: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [gamification, setGamification] = useState<GamificationSummary | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const isAdmin = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'ADMIN', 'ORG_ADMIN'].includes(user?.role || '');

  useEffect(() => {
    const role = user?.role || '';
    const admin = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'ADMIN', 'ORG_ADMIN'].includes(role);
    if (admin) {
      fetchStats();
    } else {
      setLoading(false);
    }
    apiClient.get<GamificationSummary>('/v1/gamification/points')
      .then(setGamification)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const handleCheckIn = async (isLate = false) => {
    setCheckingIn(true);
    try {
      const result = await apiClient.post<any>('/v1/gamification/check-in', { isLate });
      toast.success(`Check-in! +${result.pointsEarned} pts (racha: ${result.streak} dias)`);
      setCheckedIn(true);
      setGamification(prev => prev ? { ...prev, balance: prev.balance + result.pointsEarned, currentStreak: result.streak } : prev);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error';
      toast.error(msg);
      if (msg.includes('Ya hiciste')) setCheckedIn(true);
    } finally {
      setCheckingIn(false);
    }
  };

  const fetchStats = async () => {
    try {
      const users = await apiClient.get<any[]>('/v1/users');
      const apps = await apiClient.get<any[]>('/v1/authorization/applications');

      setStats({
        totalUsers: users.length,
        totalOrganizations: new Set(users.map(u => u.organizationId)).size,
        totalApplications: apps.length,
        activeUsers: users.filter(u => !u.lockedUntil).length,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get apps for the current user's role
  const userAppNames = ROLE_APPS[user?.role || ''] || [];
  const userApps = ALL_APPS.filter((app) => userAppNames.includes(app.name));

  const statCards = [
    { name: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500', trend: '+12%' },
    { name: 'Organizations', value: stats.totalOrganizations, icon: Building2, color: 'bg-green-500', trend: '+5%' },
    { name: 'Applications', value: stats.totalApplications, icon: AppWindow, color: 'bg-purple-500', trend: '+3' },
    { name: 'Active Users', value: stats.activeUsers, icon: Shield, color: 'bg-orange-500', trend: '+8%' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {user?.firstName ? `Hola, ${user.firstName}` : 'Platform Dashboard'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isAdmin
            ? 'Overview of your platform statistics and activity'
            : 'Tu espacio de trabajo en ENTERSYS'}
        </p>
      </div>

      {/* Gamification Check-In Card */}
      {gamification && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-sm p-5 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm opacity-90">Balance</span>
                </div>
                <p className="text-2xl font-bold">{gamification.balance.toLocaleString()} pts</p>
              </div>
              <div className="border-l border-white/20 pl-6">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-5 h-5 text-orange-300" />
                  <span className="text-sm opacity-90">Racha</span>
                </div>
                <p className="text-2xl font-bold">{gamification.currentStreak} dias</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!checkedIn ? (
                <>
                  <button
                    onClick={() => handleCheckIn(false)}
                    disabled={checkingIn}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Check-In
                  </button>
                  <button
                    onClick={() => handleCheckIn(true)}
                    disabled={checkingIn}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm disabled:opacity-50"
                  >
                    <Clock className="w-4 h-4" />
                    Tarde
                  </button>
                </>
              ) : (
                <span className="text-sm bg-white/20 px-3 py-1.5 rounded-lg">Check-in hecho hoy</span>
              )}
              <Link
                href="/gamification"
                className="flex items-center gap-1 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
              >
                <Trophy className="w-4 h-4" />
                Ver todo
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid — only for admins/directors */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.name}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {stat.trend}
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">{stat.name}</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* My Apps Section */}
      {userApps.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Mis Aplicaciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {userApps.map((app) => (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{app.icon}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900">{app.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{app.description}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions — for admins */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/users"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer"
            >
              <Users className="w-8 h-8 text-primary-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-600 mt-1">View and edit user permissions</p>
            </a>

            <a
              href="/organizations"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer"
            >
              <Building2 className="w-8 h-8 text-primary-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Organizations</h3>
              <p className="text-sm text-gray-600 mt-1">Manage organization settings</p>
            </a>

            <a
              href="/applications"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer"
            >
              <AppWindow className="w-8 h-8 text-primary-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Applications</h3>
              <p className="text-sm text-gray-600 mt-1">Configure application access</p>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
