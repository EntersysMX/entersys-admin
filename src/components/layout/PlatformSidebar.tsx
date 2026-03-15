'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Shield,
  MessageSquare,
  Target,
  Menu,
  X,
  FileText,
  Mail,
  Headphones,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useLiveChatBadge } from '@/hooks/useLiveChatBadge';
import clsx from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: 'all' | string[];
}

const ALL_NAVIGATION: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: 'all' },
  {
    name: 'Chat en Vivo',
    href: '/live-chat',
    icon: MessageSquare,
    roles: [
      'SALES_AGENT', 'SALES_SUPERVISOR', 'SALES_MANAGER',
      'SOPORTE_TECNICO', 'GERENTE_SOPORTE',
      'DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'ADMIN',
    ],
  },
  {
    name: 'CRM',
    href: '/crm',
    icon: Target,
    roles: [
      'SALES_AGENT', 'SALES_SUPERVISOR', 'SALES_MANAGER',
      'DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'ADMIN',
    ],
  },
  {
    name: 'Mesa de Servicio',
    href: 'https://soporte.entersys.mx',
    icon: Headphones,
    roles: ['SOPORTE_TECNICO', 'GERENTE_SOPORTE', 'DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'ADMIN'],
  },
  {
    name: 'Blog',
    href: '/posts',
    icon: FileText,
    roles: ['DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'ADMIN'],
  },
  {
    name: 'Email',
    href: '/email',
    icon: Mail,
    roles: ['DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'ADMIN'],
  },
  {
    name: 'Equipo',
    href: '/team',
    icon: Users,
    roles: ['RRHH', 'DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'ADMIN'],
  },
  {
    name: 'Users & Permisos',
    href: '/users',
    icon: Shield,
    roles: ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'ADMIN'],
  },
  {
    name: 'Configuracion',
    href: '/settings',
    icon: Settings,
    roles: ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'ADMIN'],
  },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const waitingCount = useLiveChatBadge();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navigation = ALL_NAVIGATION.filter(
    (item) => item.roles === 'all' || item.roles.includes(user?.role || ''),
  );

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-secondary-800">
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-white tracking-tight">EnterSys</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 ml-1">Plataforma Administrativa</p>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-5 py-4 border-b border-secondary-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                {user.lastName?.[0] || ''}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName || ''} {user.lastName || ''}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <span className="inline-block px-2 py-0.5 text-[10px] bg-accent-700 text-white rounded-full mt-1">
                {user.role}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isExternal = item.href.startsWith('http');
          const isActive = !isExternal && (pathname === item.href || pathname?.startsWith(item.href + '/'));
          const Icon = item.icon;

          if (isExternal) {
            return (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-300 hover:bg-secondary-800 hover:text-white transition-colors"
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                {item.name}
              </a>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-secondary-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {item.name}
              {item.href === '/live-chat' && waitingCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {waitingCount > 9 ? '9+' : waitingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-secondary-800">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-gray-300 rounded-lg hover:bg-secondary-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar Sesion
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-secondary-900 text-white rounded-lg shadow-lg"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — mobile: overlay drawer, desktop: fixed */}
      <div
        className={clsx(
          'flex flex-col h-full bg-secondary-900 text-white w-64 flex-shrink-0',
          'fixed lg:relative z-50 lg:z-auto',
          'transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}
