'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader, TrendingUp, DollarSign, Users, Target, Clock,
  Award, AlertTriangle, RefreshCw, Calendar, ArrowUpRight,
  ArrowDownRight, Zap, BarChart3, Cpu, Activity,
  Database, Rocket, Plus,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  FunnelChart, Funnel, LabelList,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const STAGE_COLORS: Record<string, string> = {
  Prospecto: '#64748b', Calificado: '#3b82f6', Propuesta: '#6366f1',
  'Negociacion': '#f59e0b', 'Cerrado Ganado': '#10b981', 'Cerrado Perdido': '#ef4444',
};

const fmtMXN = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);
const fmtK = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;

export default function CrmDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [nudges, setNudges] = useState<any[]>([]);
  const [aiCosts, setAiCosts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [period, setPeriod] = useState('30');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const from = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    try {
      const [m, f, n, ac] = await Promise.all([
        apiClient.get(`/v1/crm/dashboard/metrics?from=${from}`),
        apiClient.get('/v1/crm/dashboard/forecast'),
        apiClient.get('/v1/crm/ai/nudges?mine=true').catch(() => []),
        apiClient.get(`/v1/crm/dashboard/ai-costs?from=${from}`).catch(() => null),
      ]);
      setMetrics(m);
      setForecast(f);
      setNudges(Array.isArray(n) ? n : []);
      setAiCosts(ac);
    } catch {}
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const seedDemoData = async () => {
    setSeeding(true);
    try {
      await apiClient.post('/v1/crm/dashboard/seed');
      await fetchData();
    } catch {}
    setSeeding(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader className="w-10 h-10 animate-spin text-primary-600" /></div>;
  if (!metrics) return <div className="text-center text-gray-400 py-20">No se pudieron cargar las metricas</div>;

  const p = metrics.pipeline;
  const wr = metrics.winRate;
  const forecastData = forecast?.pipelines?.[0];
  const isEmpty = p.openDeals === 0 && p.closedWon === 0 && p.closedLost === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard CRM</h1>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
            <option value="365">1 ano</option>
          </select>
          <button onClick={fetchData} className="p-2 text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Empty State Banner */}
      {isEmpty && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Rocket className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Bienvenido al Dashboard CRM</h2>
              <p className="text-sm text-gray-600 mt-1">
                Aun no hay deals ni pipelines configurados. Para ver el dashboard en accion puedes:
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={seedDemoData}
                  disabled={seeding}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {seeding ? <Loader className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {seeding ? 'Generando...' : 'Generar datos demo'}
                </button>
                <a
                  href="/crm/deals"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Crear tu primer deal
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          label="Pipeline abierto"
          value={fmtMXN(p.totalOpenValue)}
          sub={`${p.openDeals} deals activos`}
          color="green"
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          label="Forecast ponderado"
          value={fmtMXN(p.weightedValue)}
          sub="Valor x probabilidad"
          color="blue"
        />
        <KPICard
          icon={<Award className="w-5 h-5 text-purple-600" />}
          label="Win Rate"
          value={`${wr.rate}%`}
          sub={`${wr.won} ganados / ${wr.total} cerrados`}
          color="purple"
        />
        <KPICard
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          label="Tiempo promedio cierre"
          value={p.avgCloseTimeDays > 0 ? `${p.avgCloseTimeDays} dias` : 'N/A'}
          sub={`${p.closedWon} deals cerrados`}
          color="amber"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals by Stage (Funnel) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Deals por Etapa</h3>
          {p.dealsByStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={p.dealsByStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(v: number) => fmtK(v)} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => fmtMXN(Number(v))} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {p.dealsByStage.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Sin deals en pipeline" hint="Crea deals y asignalos a etapas para ver la distribucion" />
          )}
        </div>

        {/* Leads by Source (Pie) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Leads por Fuente</h3>
          {metrics.leadsBySource.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="60%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics.leadsBySource}
                    dataKey="count"
                    nameKey="source"
                    cx="50%" cy="50%"
                    outerRadius={90} innerRadius={50}
                  >
                    {metrics.leadsBySource.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-[40%] space-y-2">
                {metrics.leadsBySource.map((s: any, i: number) => (
                  <div key={s.source} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 truncate">{s.source}</span>
                    <span className="font-semibold text-gray-900 ml-auto">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart message="Sin leads registrados" hint="Los contactos se capturan del chatbot, formularios web o importacion CSV" />
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity by Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Actividades por Tipo</h3>
          {metrics.activityByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.activityByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Sin actividades en el periodo" hint="Las actividades se crean al llamar, enviar emails o mover deals" />
          )}
        </div>

        {/* Contacts Over Time */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Nuevos Contactos</h3>
          {metrics.contactsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics.contactsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.substring(5)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Sin contactos en el periodo" hint="Ajusta el periodo o espera a que lleguen nuevos leads" />
          )}
        </div>
      </div>

      {/* Forecast + Nudges Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forecast */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Forecast por Etapa</h3>
          {forecastData?.stages?.length > 0 ? (
            <div className="space-y-3">
              {forecastData.stages.filter((s: any) => s.dealCount > 0).map((stage: any) => (
                <div key={stage.stageId}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color || '#94a3b8' }} />
                      <span className="text-gray-700">{stage.stageName}</span>
                      <span className="text-xs text-gray-400">({stage.dealCount} deals, {stage.probability}%)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{fmtMXN(stage.weightedValue)}</span>
                      <span className="text-xs text-gray-400 ml-1">/ {fmtMXN(stage.totalValue)}</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${forecastData.totalValue > 0 ? (stage.totalValue / forecastData.totalValue) * 100 : 0}%`,
                        backgroundColor: stage.color || '#94a3b8',
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total forecast ponderado</span>
                <span className="text-lg font-bold text-primary-700">{fmtMXN(forecastData.weightedValue)}</span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">Sin deals en pipeline</div>
          )}

          {/* Monthly Forecast */}
          {forecast?.monthlyForecast?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Proyeccion Mensual</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={forecast.monthlyForecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => fmtK(v)} />
                  <Tooltip formatter={(v: any) => fmtMXN(Number(v))} />
                  <Bar dataKey="weightedValue" fill="#10b981" radius={[4, 4, 0, 0]} name="Ponderado" />
                  <Bar dataKey="totalValue" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Nudges / Alerts Sidebar */}
        <div className="space-y-6">
          {/* AI Nudges */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Alertas AI</h3>
              <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{nudges.length}</span>
            </div>
            {nudges.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 text-center">Sin alertas pendientes</div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {nudges.slice(0, 8).map((n: any, i: number) => (
                  <div key={i} className={`px-4 py-3 border-l-2 ${n.urgency === 'high' ? 'border-red-400 bg-red-50/50' : n.urgency === 'medium' ? 'border-yellow-400 bg-yellow-50/50' : 'border-gray-300'}`}>
                    <p className="text-xs font-medium text-gray-900 line-clamp-1">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deals by Owner */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Deals por Vendedor</h3>
            </div>
            {metrics.dealsByOwner.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 text-center">Sin datos</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {metrics.dealsByOwner.map((o: any) => (
                  <div key={o.ownerId} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{o.ownerName}</p>
                      <p className="text-xs text-gray-400">{o.dealCount} deals</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{fmtMXN(o.totalValue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lead Status Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Leads por Estatus</h3>
            </div>
            <div className="p-4 space-y-2">
              {metrics.leadsByStatus.map((s: any) => {
                const total = metrics.leadsByStatus.reduce((sum: number, x: any) => sum + x.count, 0);
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                const colors: Record<string, string> = {
                  new: '#94a3b8', contacted: '#3b82f6', qualified: '#8b5cf6', converted: '#10b981', lost: '#ef4444',
                };
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 capitalize">{s.status}</span>
                      <span className="font-medium">{s.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[s.status] || '#94a3b8' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Contacts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Top Contactos (Score)</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {metrics.topContacts.slice(0, 5).map((c: any) => (
                <div key={c.id} className="px-4 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                    {c.company?.name && <p className="text-xs text-gray-400">{c.company.name}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.leadScore <= 30 ? 'bg-red-500' : c.leadScore <= 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${c.leadScore}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{c.leadScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* AI Cost Analytics */}
      {aiCosts && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Costos AI por Tier</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tier breakdown */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Distribucion por Tier</h3>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">${aiCosts.totals.costUsd.toFixed(2)} <span className="text-xs font-normal text-gray-400">USD</span></p>
                  <p className="text-xs text-gray-400">{aiCosts.totals.messages.toLocaleString()} mensajes</p>
                </div>
              </div>

              {aiCosts.byTier.length > 0 ? (
                <div className="space-y-3">
                  {aiCosts.byTier.map((t: any) => {
                    const msgPct = aiCosts.totals.messages > 0 ? (t.messages / aiCosts.totals.messages) * 100 : 0;
                    const costPct = aiCosts.totals.costUsd > 0 ? (t.costUsd / aiCosts.totals.costUsd) * 100 : 0;
                    const tierColors: Record<number, string> = { 1: '#10b981', 2: '#3b82f6', 3: '#8b5cf6', 4: '#f59e0b' };
                    const color = tierColors[t.tier] || '#94a3b8';

                    return (
                      <div key={t.tier} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-sm font-medium text-gray-900">T{t.tier}: {t.label}</span>
                            <span className="text-xs text-gray-400">{t.model}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">${t.costUsd.toFixed(4)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-gray-400">Mensajes</span>
                            <p className="font-semibold text-gray-700">{t.messages.toLocaleString()} <span className="text-gray-400">({msgPct.toFixed(1)}%)</span></p>
                          </div>
                          <div>
                            <span className="text-gray-400">% del costo</span>
                            <p className="font-semibold" style={{ color }}>{costPct.toFixed(1)}%</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Latencia prom.</span>
                            <p className="font-semibold text-gray-700">{t.avgLatencyMs}ms</p>
                          </div>
                        </div>
                        {/* Cost vs traffic bar */}
                        <div className="mt-2 flex gap-1 items-center">
                          <span className="text-[10px] text-gray-400 w-12">Trafico</span>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${msgPct}%`, backgroundColor: color, opacity: 0.5 }} />
                          </div>
                          <span className="text-[10px] text-gray-400 w-12">Costo</span>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${costPct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 text-sm">Sin datos de AI en el periodo</div>
              )}

              {/* Token totals */}
              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>Tokens entrada: <span className="font-semibold text-gray-700">{(aiCosts.totals.tokensInput / 1000).toFixed(1)}K</span></div>
                <div>Tokens salida: <span className="font-semibold text-gray-700">{(aiCosts.totals.tokensOutput / 1000).toFixed(1)}K</span></div>
              </div>
            </div>

            {/* Daily cost trend */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-900">Tendencia Diaria</h3>
              </div>
              {aiCosts.dailyTrend.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={aiCosts.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.substring(5)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                      <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(4)}`, 'Costo USD']} labelFormatter={(d) => String(d)} />
                      <Bar dataKey="costUsd" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Avg daily cost */}
                  <div className="mt-3 text-center text-xs text-gray-500">
                    Promedio diario: <span className="font-semibold text-indigo-600">${(aiCosts.totals.costUsd / Math.max(aiCosts.dailyTrend.length, 1)).toFixed(4)} USD</span>
                    {' '}| Proyeccion mensual: <span className="font-semibold text-gray-700">${((aiCosts.totals.costUsd / Math.max(aiCosts.dailyTrend.length, 1)) * 30).toFixed(2)} USD</span>
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyChart({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="h-[250px] flex flex-col items-center justify-center text-center px-4">
      <BarChart3 className="w-8 h-8 text-gray-300 mb-2" />
      <p className="text-sm font-medium text-gray-500">{message}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-[280px]">{hint}</p>
    </div>
  );
}

function KPICard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const bgMap: Record<string, string> = {
    green: 'bg-green-50 border-green-200', blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200', amber: 'bg-amber-50 border-amber-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${bgMap[color] || 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-medium text-gray-500 uppercase">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
