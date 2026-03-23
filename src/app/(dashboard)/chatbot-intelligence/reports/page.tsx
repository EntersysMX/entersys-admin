'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Loader,
  AlertCircle,
  Plus,
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

interface Report {
  id: string;
  week_start: string;
  week_end: string;
  total_conversations: number;
  total_leads: number;
  avg_quality_score: number;
  status: 'draft' | 'reviewed' | 'approved';
  created_at: string;
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
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('es-MX', opts)} — ${e.toLocaleDateString('es-MX', { ...opts, year: 'numeric' })}`;
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<Report[] | { data: Report[] }>('/v1/chatbot-intelligence/reports');
      const list = Array.isArray(res) ? res : (res as any).data ?? [];
      setReports(list);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newReport = await apiClient.post<Report>('/v1/chatbot-intelligence/reports/generate');
      toast.success('Reporte generado exitosamente');
      setReports((prev) => [newReport, ...prev]);
    } catch (err: any) {
      toast.error(err?.message || 'Error al generar el reporte');
    } finally {
      setGenerating(false);
    }
  };

  /* ---- Render ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reportes semanales</h1>
            <p className="text-gray-600 text-sm">Analisis semanales generados por IA</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {generating ? 'Generando...' : 'Generar nuevo reporte'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* List */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-14 h-14 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Sin reportes todavia</p>
          <p className="text-sm text-gray-400 mt-1">Genera el primer reporte semanal para ver el analisis</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const badge = statusBadge(report.status);
            return (
              <div
                key={report.id}
                onClick={() => router.push(`/chatbot-intelligence/reports/${report.id}`)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-primary-200 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900">
                        {formatWeek(report.week_start, report.week_end)}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                        <span>{report.total_conversations} conversaciones</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>{report.total_leads} leads</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Star className="w-3.5 h-3.5 text-yellow-400" />
                        <span className={`font-medium ${scoreColor(report.avg_quality_score)}`}>
                          {report.avg_quality_score.toFixed(1)} avg
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">
                      {new Date(report.created_at).toLocaleDateString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-primary-600 font-medium mt-1">Ver reporte &rarr;</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
