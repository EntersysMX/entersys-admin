'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  MessageSquare,
  Users,
  Star,
  TrendingUp,
  Loader,
  AlertCircle,
  ChevronRight,
  FileText,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface DashboardData {
  stats: {
    conversations_today: number;
    conversations_week: number;
    leads_captured: number;
    avg_quality_score: number;
  };
  lead_rate_trend: Array<{ date: string; count: number; lead_rate: number }>;
  top_questions: Array<{ question: string; count: number }>;
  top_objections: Array<{ objection: string; count: number }>;
  funnel_distribution: {
    awareness: number;
    interest: number;
    consideration: number;
    intent: number;
    conversion: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ChatbotIntelligencePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<DashboardData>('/v1/chatbot-intelligence/dashboard')
      .then(setData)
      .catch((err) => setError(err?.message || 'Error al cargar el dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const funnel = data?.funnel_distribution;
  const funnelStages = [
    { key: 'awareness', label: 'Awareness', color: 'bg-blue-400' },
    { key: 'interest', label: 'Interest', color: 'bg-purple-400' },
    { key: 'consideration', label: 'Consideration', color: 'bg-yellow-400' },
    { key: 'intent', label: 'Intent', color: 'bg-orange-400' },
    { key: 'conversion', label: 'Conversion', color: 'bg-green-500' },
  ];

  const maxFunnelVal = funnel
    ? Math.max(...Object.values(funnel).filter((v) => typeof v === 'number'))
    : 1;

  const trend = data?.lead_rate_trend ?? [];
  const maxTrendCount = trend.length > 0 ? Math.max(...trend.map((d) => d.count), 1) : 1;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Brain className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Chatbot IA</h1>
          </div>
          <p className="text-gray-600">Analisis de inteligencia conversacional del chatbot</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/chatbot-intelligence/conversations"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Ver conversaciones
          </Link>
          <Link
            href="/chatbot-intelligence/reports"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generar reporte
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
          label="Conversaciones hoy"
          value={data?.stats.conversations_today ?? 0}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
          label="Esta semana"
          value={data?.stats.conversations_week ?? 0}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
          label="Leads capturados"
          value={data?.stats.leads_captured ?? 0}
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-100"
          label="Score prom. calidad"
          value={`${(data?.stats.avg_quality_score ?? 0).toFixed(1)}`}
          valueClass={scoreColor(data?.stats.avg_quality_score ?? 0)}
        />
      </div>

      {/* Chart + Top Lists row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Rate Trend — bar chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Tendencia de leads (ultimos 30 dias)
          </h2>
          {trend.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos disponibles</p>
          ) : (
            <div className="flex items-end gap-1 h-40 w-full overflow-x-auto">
              {trend.map((day) => {
                const heightPct = Math.round((day.count / maxTrendCount) * 100);
                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center gap-1 flex-1 min-w-[18px] group relative"
                    title={`${formatDate(day.date)}: ${day.count} conv.`}
                  >
                    <div className="w-full bg-primary-500 rounded-t opacity-80 group-hover:opacity-100 transition-opacity"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                    {trend.length <= 10 && (
                      <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap">
                        {formatDate(day.date)}
                      </span>
                    )}
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      {formatDate(day.date)}: {day.count} conv. · {(day.lead_rate * 100).toFixed(0)}% leads
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Questions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Top preguntas</h2>
          <ol className="space-y-2">
            {(data?.top_questions ?? []).slice(0, 5).map((q, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 flex-1 leading-snug">{q.question}</p>
                <span className="flex-shrink-0 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  {q.count}
                </span>
              </li>
            ))}
            {(data?.top_questions ?? []).length === 0 && (
              <p className="text-sm text-gray-400">Sin datos</p>
            )}
          </ol>
        </div>
      </div>

      {/* Objections + Funnel row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Objections */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Top objeciones</h2>
          <ol className="space-y-2">
            {(data?.top_objections ?? []).slice(0, 5).map((obj, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 flex-1 leading-snug">{obj.objection}</p>
                <span className="flex-shrink-0 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">
                  {obj.count}
                </span>
              </li>
            ))}
            {(data?.top_objections ?? []).length === 0 && (
              <p className="text-sm text-gray-400">Sin datos</p>
            )}
          </ol>
        </div>

        {/* Funnel Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Distribucion de embudo</h2>
          <div className="space-y-3">
            {funnelStages.map((stage) => {
              const val = funnel ? (funnel as any)[stage.key] ?? 0 : 0;
              const pct = maxFunnelVal > 0 ? Math.round((val / maxFunnelVal) * 100) : 0;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-gray-600 flex-shrink-0">{stage.label}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-gray-700">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Acciones rapidas</h2>
        <div className="flex flex-wrap gap-3">
          <QuickLink href="/chatbot-intelligence/conversations" icon={<MessageSquare className="w-4 h-4" />} label="Ver conversaciones" />
          <QuickLink href="/chatbot-intelligence/reports" icon={<FileText className="w-4 h-4" />} label="Generar reporte" />
          <QuickLink href="/chatbot-intelligence/personalities" icon={<Sparkles className="w-4 h-4" />} label="Personalidades" />
        </div>
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function StatCard({
  icon,
  iconBg,
  label,
  value,
  valueClass = 'text-gray-900',
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
    >
      {icon}
      {label}
      <ChevronRight className="w-3.5 h-3.5" />
    </Link>
  );
}
