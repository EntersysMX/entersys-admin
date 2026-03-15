'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Building2,
  Kanban,
  CheckSquare,
  X,
  Loader,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SearchResult {
  contacts: Array<{ id: string; firstName: string; lastName: string; email?: string; phone?: string }>;
  companies: Array<{ id: string; name: string; domain?: string }>;
  deals: Array<{ id: string; title: string; value?: number; stage?: { name: string } }>;
  tasks: Array<{ id: string; title: string; status: string }>;
}

interface FlatItem {
  type: 'contact' | 'company' | 'deal' | 'task';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TASK_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

interface ResultGroup {
  type: string;
  label: string;
  items: FlatItem[];
}

function flattenResults(data: SearchResult): ResultGroup[] {
  const groups: ResultGroup[] = [];

  if (data.contacts?.length) {
    groups.push({
      type: 'contacts',
      label: 'Contactos',
      items: data.contacts.map((c) => ({
        type: 'contact' as const,
        id: c.id,
        title: `${c.firstName} ${c.lastName}`.trim(),
        subtitle: c.email || c.phone || '',
        href: `/crm/contacts/${c.id}`,
      })),
    });
  }

  if (data.companies?.length) {
    groups.push({
      type: 'companies',
      label: 'Empresas',
      items: data.companies.map((c) => ({
        type: 'company' as const,
        id: c.id,
        title: c.name,
        subtitle: c.domain || '',
        href: `/crm/companies/${c.id}`,
      })),
    });
  }

  if (data.deals?.length) {
    groups.push({
      type: 'deals',
      label: 'Deals',
      items: data.deals.map((d) => ({
        type: 'deal' as const,
        id: d.id,
        title: d.title,
        subtitle: d.value ? `$${d.value.toLocaleString()}` : d.stage?.name || '',
        href: '/crm/deals',
      })),
    });
  }

  if (data.tasks?.length) {
    groups.push({
      type: 'tasks',
      label: 'Tareas',
      items: data.tasks.map((t) => ({
        type: 'task' as const,
        id: t.id,
        title: t.title,
        subtitle: TASK_STATUS_LABEL[t.status] || t.status,
        href: '/crm/tasks',
      })),
    });
  }

  return groups;
}

const TYPE_ICON: Record<string, typeof Users> = {
  contact: Users,
  company: Building2,
  deal: Kanban,
  task: CheckSquare,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Flatten all items for keyboard navigation
  const allItems = results.flatMap((g) => g.items);

  /* ---- Global keyboard shortcut ---- */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  /* ---- Focus input when opened ---- */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  /* ---- Debounced search ---- */
  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.get<SearchResult>(
        `/v1/crm/search?q=${encodeURIComponent(term)}&limit=5`,
      );
      setResults(flattenResults(data));
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  /* ---- Navigate to item ---- */
  const navigateTo = useCallback(
    (item: FlatItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  /* ---- Keyboard navigation inside palette ---- */
  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % Math.max(allItems.length, 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + Math.max(allItems.length, 1)) % Math.max(allItems.length, 1));
      return;
    }
    if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault();
      navigateTo(allItems[selectedIndex]);
    }
  }

  if (!open) return null;

  /* ---- Render ---- */
  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette card */}
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Buscar contactos, empresas, deals, tareas..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          {loading && <Loader className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />}
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!query.trim() && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Escribe para buscar...
            </div>
          )}

          {query.trim() && !loading && allItems.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Sin resultados
            </div>
          )}

          {results.map((group) => (
            <div key={group.type}>
              <div className="px-4 pt-3 pb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {group.label}
              </div>
              {group.items.map((item) => {
                flatIndex++;
                const isSelected = flatIndex === selectedIndex;
                const Icon = TYPE_ICON[item.type] || Search;
                const idx = flatIndex; // capture for click
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => navigateTo(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="text-xs text-gray-400 truncate ml-auto">
                        {item.subtitle}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-center gap-3 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-mono text-[10px]">
              &uarr;&darr;
            </kbd>{' '}
            navegar
          </span>
          <span className="text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-mono text-[10px]">
              Enter
            </kbd>{' '}
            seleccionar
          </span>
          <span className="text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-mono text-[10px]">
              Esc
            </kbd>{' '}
            cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
