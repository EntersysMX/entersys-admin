'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Loader,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Conversation {
  id: string;
  created_at: string;
  message_count: number;
  funnel_stage: string | null;
  has_lead: boolean;
  quality_score: number | null;
  lead_phone?: string;
}

interface Meta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface ApiResponse {
  data: Conversation[];
  meta: Meta;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const FUNNEL_STAGES = ['awareness', 'interest', 'consideration', 'intent', 'conversion'];

const FUNNEL_BADGE: Record<string, { label: string; cls: string }> = {
  awareness: { label: 'Awareness', cls: 'bg-blue-100 text-blue-700' },
  interest: { label: 'Interest', cls: 'bg-purple-100 text-purple-700' },
  consideration: { label: 'Consideration', cls: 'bg-yellow-100 text-yellow-700' },
  intent: { label: 'Intent', cls: 'bg-orange-100 text-orange-700' },
  conversion: { label: 'Conversion', cls: 'bg-green-100 text-green-700' },
};

function funnelBadge(stage: string | null) {
  if (!stage) return { label: 'Sin etapa', cls: 'bg-gray-100 text-gray-500' };
  return FUNNEL_BADGE[stage] ?? { label: stage, cls: 'bg-gray-100 text-gray-600' };
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-green-600 font-semibold';
  if (score >= 60) return 'text-yellow-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function formatDatetime(str: string) {
  const d = new Date(str);
  return d.toLocaleString('es-MX', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ConversationsPage() {
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, per_page: 20, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hasLead, setHasLead] = useState('');
  const [minMessages, setMinMessages] = useState('');
  const [funnelStage, setFunnelStage] = useState('');
  const [page, setPage] = useState(1);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('per_page', '20');
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (hasLead !== '') params.set('has_lead', hasLead);
      if (minMessages) params.set('min_messages', minMessages);
      if (funnelStage) params.set('funnel_stage', funnelStage);

      const res = await apiClient.get<ApiResponse>(
        `/v1/chatbot-intelligence/conversations?${params.toString()}`,
      );
      setConversations(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar conversaciones');
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, hasLead, minMessages, funnelStage]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleFilterChange = () => {
    setPage(1);
  };

  const handleRowClick = (id: string) => {
    router.push(`/chatbot-intelligence/conversations/${id}`);
  };

  /* ---- Render ---- */
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <MessageSquare className="w-8 h-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conversaciones</h1>
          <p className="text-gray-600 text-sm">Historial de todas las conversaciones del chatbot</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); handleFilterChange(); }}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); handleFilterChange(); }}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tiene lead</label>
            <select
              value={hasLead}
              onChange={(e) => { setHasLead(e.target.value); handleFilterChange(); }}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-primary-500"
            >
              <option value="">Todos</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min. mensajes</label>
            <input
              type="number"
              min="0"
              value={minMessages}
              onChange={(e) => { setMinMessages(e.target.value); handleFilterChange(); }}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Etapa del embudo</label>
            <select
              value={funnelStage}
              onChange={(e) => { setFunnelStage(e.target.value); handleFilterChange(); }}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-primary-500"
            >
              <option value="">Todas</option>
              {FUNNEL_STAGES.map((s) => (
                <option key={s} value={s}>{funnelBadge(s).label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading && conversations.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="w-10 h-10 animate-spin text-primary-600" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <MessageSquare className="w-14 h-14 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No hay conversaciones</p>
          <p className="text-sm text-gray-400 mt-1">Intenta ajustar los filtros de busqueda</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading && (
            <div className="h-1 bg-primary-200 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-primary-500 animate-pulse" />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mensajes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Etapa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score calidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conversations.map((conv) => {
                  const fb = funnelBadge(conv.funnel_stage);
                  return (
                    <tr
                      key={conv.id}
                      onClick={() => handleRowClick(conv.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDatetime(conv.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">{conv.message_count}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${fb.cls}`}>
                          {fb.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {conv.has_lead ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <User className="w-3 h-3" />
                            Lead
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${scoreColor(conv.quality_score)}`}>
                          {conv.quality_score !== null ? conv.quality_score.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRowClick(conv.id); }}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {meta.total} conversacion{meta.total !== 1 ? 'es' : ''}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              {Array.from({ length: meta.total_pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === meta.total_pages || Math.abs(p - page) <= 1)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  typeof item === 'string' ? (
                    <span key={`dots-${idx}`} className="px-1 text-xs text-gray-400">...</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                        item === page ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
              <button
                disabled={page >= meta.total_pages}
                onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
