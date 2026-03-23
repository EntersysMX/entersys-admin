'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader,
  AlertCircle,
  CheckCircle,
  XCircle,
  Check,
  FileText,
  Calendar,
  MessageSquare,
  Users,
  Star,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ImprovementSuggestion {
  id: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  category?: string;
}

interface ReportDetail {
  id: string;
  week_start: string;
  week_end: string;
  total_conversations: number;
  total_leads: number;
  avg_quality_score: number;
  status: 'draft' | 'reviewed' | 'approved';
  synthesis?: string;
  claude_analysis?: string;
  gpt4_analysis?: string;
  gemini_analysis?: string;
  improvement_suggestions: ImprovementSuggestion[];
  reviewed_by?: string;
  reviewed_at?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Borrador', cls: 'bg-gray-100 text-gray-600' },
  reviewed: { label: 'Revisado', cls: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Aprobado', cls: 'bg-green-100 text-green-700' },
};

function statusBadge(s: string) {
  return STATUS_BADGE[s] ?? { label: s, cls: 'bg-gray-100 text-gray-500' };
}

function formatWeek(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  return `${s.toLocaleDateString('es-MX', opts)} — ${e.toLocaleDateString('es-MX', { ...opts, year: 'numeric' })}`;
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/** Render markdown-like text: converts **bold** and newlines */
function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return <p className="text-gray-400 italic text-sm">Sin contenido</p>;

  const lines = text.split('\n');
  return (
    <div className="prose prose-sm max-w-none text-gray-700 space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        // Headings
        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-gray-900 mt-3">{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-gray-900 mt-4">{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-gray-900 mt-4">{line.slice(2)}</h1>;
        // Bullet
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        // Bold inline
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
            )}
          </p>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resumen' | 'claude' | 'gpt4' | 'gemini'>('resumen');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingSuggestion, setUpdatingSuggestion] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<ReportDetail>(`/v1/chatbot-intelligence/reports/${id}`)
      .then(setReport)
      .catch((err) => setError(err?.message || 'Error al cargar el reporte'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const updated = await apiClient.patch<ReportDetail>(
        `/v1/chatbot-intelligence/reports/${id}`,
        { status: newStatus },
      );
      setReport(updated);
      toast.success('Estado actualizado');
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar estado');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSuggestionAction = async (
    suggestionId: string,
    action: 'approved' | 'rejected',
  ) => {
    setUpdatingSuggestion(suggestionId);
    try {
      const updated = await apiClient.patch<ReportDetail>(
        `/v1/chatbot-intelligence/reports/${id}`,
        { suggestion_id: suggestionId, suggestion_status: action },
      );
      setReport(updated);
      toast.success(action === 'approved' ? 'Sugerencia aprobada' : 'Sugerencia rechazada');
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar sugerencia');
    } finally {
      setUpdatingSuggestion(null);
    }
  };

  /* ---- Loading / Error ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error || 'Reporte no encontrado'}</p>
        </div>
      </div>
    );
  }

  const badge = statusBadge(report.status);
  const TABS = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'claude', label: 'Claude' },
    { key: 'gpt4', label: 'GPT-4' },
    { key: 'gemini', label: 'Gemini' },
  ] as const;

  const tabContent: Record<typeof activeTab, string | undefined> = {
    resumen: report.synthesis,
    claude: report.claude_analysis,
    gpt4: report.gpt4_analysis,
    gemini: report.gemini_analysis,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">Reporte semanal</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-9">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-sm text-gray-600">{formatWeek(report.week_start, report.week_end)}</p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Conversaciones</p>
            <p className="text-2xl font-bold text-gray-900">{report.total_conversations}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Leads</p>
            <p className="text-2xl font-bold text-gray-900">{report.total_leads}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Star className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Score promedio</p>
            <p className={`text-2xl font-bold ${scoreColor(report.avg_quality_score)}`}>
              {report.avg_quality_score.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          <SimpleMarkdown text={tabContent[activeTab] || ''} />
        </div>
      </div>

      {/* Improvement Suggestions */}
      {report.improvement_suggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
            <h2 className="text-sm font-semibold text-gray-800">
              Sugerencias de mejora ({report.improvement_suggestions.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {report.improvement_suggestions.map((sug) => {
              const isLoading = updatingSuggestion === sug.id;
              return (
                <div key={sug.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1">
                    {sug.category && (
                      <span className="text-[10px] px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full font-medium mr-2">
                        {sug.category}
                      </span>
                    )}
                    <p className="text-sm text-gray-700 mt-1">{sug.text}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {sug.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleSuggestionAction(sug.id, 'approved')}
                          disabled={isLoading}
                          title="Aprobar"
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 border border-green-200 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleSuggestionAction(sug.id, 'rejected')}
                          disabled={isLoading}
                          title="Rechazar"
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sug.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {sug.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Controles del reporte</h2>
        <div className="flex flex-wrap items-center gap-3">
          {report.status === 'draft' && (
            <button
              onClick={() => handleStatusUpdate('reviewed')}
              disabled={updatingStatus}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {updatingStatus ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Marcar como revisado
            </button>
          )}
          {report.status === 'reviewed' && (
            <button
              onClick={() => handleStatusUpdate('approved')}
              disabled={updatingStatus}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              {updatingStatus ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Aprobar cambios
            </button>
          )}
          {report.status === 'approved' && (
            <button
              onClick={() => handleStatusUpdate('applied')}
              disabled={updatingStatus}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {updatingStatus ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Aplicar al chatbot
            </button>
          )}
          {report.reviewed_by && (
            <p className="text-xs text-gray-400 ml-2">
              Revisado por <span className="font-medium text-gray-600">{report.reviewed_by}</span>
              {report.reviewed_at && (
                <> el {new Date(report.reviewed_at).toLocaleDateString('es-MX')}</>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
