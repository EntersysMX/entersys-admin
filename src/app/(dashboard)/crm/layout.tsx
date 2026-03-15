'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Users, Building2, Kanban, CheckSquare, BarChart3, Settings, Search, Filter, Zap } from 'lucide-react';
import CommandPalette from '@/components/crm/CommandPalette';
import KeyboardShortcuts from '@/components/crm/KeyboardShortcuts';

const tabs = [
  { href: '/crm/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/crm/contacts', label: 'Contactos', icon: Users },
  { href: '/crm/companies', label: 'Empresas', icon: Building2 },
  { href: '/crm/deals', label: 'Deals', icon: Kanban },
  { href: '/crm/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/crm/segments', label: 'Segmentos', icon: Filter },
  { href: '/crm/automations', label: 'Automations', icon: Zap },
  { href: '/crm/settings', label: 'Settings', icon: Settings },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex items-center -mb-px overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-0 whitespace-nowrap">
            {tabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              );
            })}
          </div>
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
            className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 mb-1 text-xs text-gray-400 bg-gray-100 rounded-md border border-gray-200 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buscar</span>
            <kbd className="hidden sm:inline ml-1 px-1 py-0.5 rounded bg-gray-200 text-[10px] font-mono">&#8984;K</kbd>
          </button>
        </nav>
      </div>

      <CommandPalette />
      <KeyboardShortcuts />

      {children}
    </div>
  );
}
