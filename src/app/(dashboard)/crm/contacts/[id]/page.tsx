'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader, AlertCircle, ArrowLeft, Mail, Phone as PhoneIcon, MapPin,
  Calendar, FileText, MessageSquare, ArrowRight, Edit2, Plus, X,
  Clock, Tag, Briefcase, User, Sparkles, Brain, TrendingUp,
  BarChart3, Zap, RefreshCw, Send, ChevronDown, ChevronUp,
  AlertTriangle, Target, Activity,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`;
  if (s < 604800) return `hace ${Math.floor(s / 86400)}d`;
  return new Date(date).toLocaleDateString('es-MX');
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

const ACTIVITY_ICONS: Record<string, any> = {
  call: PhoneIcon, email: Mail, meeting: Calendar, note: FileText,
  chat: MessageSquare, deal_moved: ArrowRight, ai_summary: Sparkles,
  task_completed: FileText,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700',
};

const URGENCY_COLORS: Record<string, string> = {
  low: 'border-gray-200 bg-gray-50', medium: 'border-yellow-200 bg-yellow-50', high: 'border-red-200 bg-red-50',
};

const fmtMXN = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [actForm, setActForm] = useState({ type: 'note', title: '', content: '', duration: '', direction: '' });
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [actPage, setActPage] = useState(1);
  const [actTotal, setActTotal] = useState(0);

  // AI state
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const [nudges, setNudges] = useState<any[]>([]);
  const [nudgesLoading, setNudgesLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [nlQuery, setNlQuery] = useState('');
  const [nlAnswer, setNlAnswer] = useState<string | null>(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '' });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Custom fields
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [editingCustomFields, setEditingCustomFields] = useState(false);
  const [savingCustomFields, setSavingCustomFields] = useState(false);

  const fetchContact = async () => {
    try {
      const data = await apiClient.get(`/v1/crm/contacts/${id}`);
      setContact(data);
      setAiSummary(data.summary || null);
      setEditForm({ firstName: data.firstName, lastName: data.lastName, email: data.email || '', phone: data.phone || '', position: data.position || '', leadStatus: data.leadStatus });
    } catch (e: any) { setError(e.message); }
  };

  const fetchActivities = async (page = 1) => {
    try {
      const res = await apiClient.get(`/v1/crm/activities?contactId=${id}&page=${page}&limit=20`);
      setActivities(res.data);
      setActTotal(res.meta.total);
      setActPage(page);
    } catch {}
  };

  const fetchCustomFields = async () => {
    try {
      const [fields, values] = await Promise.all([
        apiClient.get('/v1/crm/custom-fields?entity=contact'),
        apiClient.get(`/v1/crm/custom-fields/values/${id}`),
      ]);
      setCustomFields(Array.isArray(fields) ? fields : []);
      const valMap: Record<string, string> = {};
      if (Array.isArray(values)) {
        values.forEach((v: any) => { valMap[v.fieldId] = v.value || ''; });
      }
      setCustomValues(valMap);
    } catch {}
  };

  useEffect(() => { setLoading(true); Promise.all([fetchContact(), fetchActivities(), fetchCustomFields()]).finally(() => setLoading(false)); }, [id]);

  const handleAddActivity = async () => {
    setSaving(true);
    try {
      await apiClient.post('/v1/crm/activities', { ...actForm, contactId: id, duration: actForm.duration ? parseInt(actForm.duration) : undefined, direction: actForm.direction || undefined });
      toast.success('Actividad registrada');
      setShowAddActivity(false);
      setActForm({ type: 'note', title: '', content: '', duration: '', direction: '' });
      fetchActivities();
      fetchContact();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/v1/crm/contacts/${id}`, editForm);
      toast.success('Contacto actualizado');
      setShowEdit(false);
      fetchContact();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  // --- AI Actions ---

  const handleScore = useCallback(async () => {
    setScoringLoading(true);
    try {
      const result = await apiClient.post(`/v1/crm/ai/contacts/${id}/score`);
      setScoreBreakdown(result);
      setShowScoreDetail(true);
      fetchContact(); // refresh score on header
      toast.success(`Lead score: ${result.total}`);
    } catch (e: any) { toast.error(e.message); }
    setScoringLoading(false);
  }, [id]);

  const handleSendEmail = useCallback(async () => {
    if (!emailForm.subject.trim() || !emailForm.body.trim()) return;
    setSendingEmail(true);
    try {
      await apiClient.post('/v1/crm/emails/send', { contactId: id, subject: emailForm.subject, body: emailForm.body });
      toast.success('Email enviado');
      setShowEmailModal(false);
      setEmailForm({ subject: '', body: '' });
      fetchActivities();
      fetchContact();
    } catch (e: any) { toast.error(e.message); }
    setSendingEmail(false);
  }, [id, emailForm]);

  const handleGenerateSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const result = await apiClient.post(`/v1/crm/ai/contacts/${id}/summary`);
      setAiSummary(result.summary);
      toast.success('Resumen generado');
    } catch (e: any) { toast.error(e.message); }
    setSummaryLoading(false);
  }, [id]);

  const handleEnrich = useCallback(async () => {
    setEnriching(true);
    try {
      const result = await apiClient.post(`/v1/crm/ai/contacts/${id}/enrich`);
      if (result.enriched) {
        toast.success(`Enriquecido: ${result.fields.join(', ')}`);
        fetchContact();
      } else {
        toast.success('El contacto ya esta completo');
      }
    } catch (e: any) { toast.error(e.message); }
    setEnriching(false);
  }, [id]);

  const handleNlQuery = useCallback(async () => {
    if (!nlQuery.trim()) return;
    setNlLoading(true);
    try {
      const result = await apiClient.post('/v1/crm/ai/query', { question: nlQuery });
      setNlAnswer(result.answer);
    } catch (e: any) { toast.error(e.message); }
    setNlLoading(false);
  }, [nlQuery]);

  const fetchNudges = useCallback(async () => {
    setNudgesLoading(true);
    try {
      const result = await apiClient.get('/v1/crm/ai/nudges?mine=true');
      setNudges(Array.isArray(result) ? result : []);
    } catch {}
    setNudgesLoading(false);
  }, []);

  const handleSaveCustomFields = async () => {
    setSavingCustomFields(true);
    try {
      const values = Object.entries(customValues)
        .filter(([, value]) => value !== '')
        .map(([fieldId, value]) => ({ fieldId, value }));
      await apiClient.put(`/v1/crm/custom-fields/values/${id}`, { values });
      toast.success('Campos guardados');
      setEditingCustomFields(false);
    } catch (e: any) { toast.error(e.message); }
    setSavingCustomFields(false);
  };

  const renderCustomFieldInput = (field: any) => {
    const val = customValues[field.id] || '';
    const update = (v: string) => setCustomValues({ ...customValues, [field.id]: v });
    const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

    switch (field.type) {
      case 'number':
        return <input type="number" value={val} onChange={e => update(e.target.value)} className={inputClass} />;
      case 'date':
        return <input type="date" value={val} onChange={e => update(e.target.value)} className={inputClass} />;
      case 'boolean':
        return <input type="checkbox" checked={val === 'true'} onChange={e => update(e.target.checked ? 'true' : 'false')} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />;
      case 'select':
        return (
          <select value={val} onChange={e => update(e.target.value)} className={inputClass}>
            <option value="">— Seleccionar —</option>
            {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'multiselect': {
        const selected = val ? val.split(',') : [];
        return (
          <div className="space-y-1">
            {(field.options || []).map((opt: string) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(opt)} onChange={e => {
                  const next = e.target.checked ? [...selected, opt] : selected.filter((s: string) => s !== opt);
                  update(next.join(','));
                }} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                {opt}
              </label>
            ))}
          </div>
        );
      }
      default:
        return <input type="text" value={val} onChange={e => update(e.target.value)} className={inputClass} />;
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader className="w-10 h-10 animate-spin text-primary-600" /></div>;
  if (error || !contact) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800"><AlertCircle className="w-4 h-4" />{error || 'Contacto no encontrado'}</div>;

  const score = contact.leadScore || 0;
  const scoreColor = score <= 30 ? 'bg-red-500' : score <= 60 ? 'bg-yellow-500' : 'bg-green-500';
  const scoreTextColor = score <= 30 ? 'text-red-600' : score <= 60 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back */}
      <button onClick={() => router.push('/crm/contacts')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver a contactos
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
              {contact.firstName?.[0]}{contact.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{contact.firstName} {contact.lastName}</h1>
              {contact.position && <p className="text-gray-500">{contact.position}</p>}
              {contact.company && <p className="text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => router.push(`/crm/companies/${contact.company.id}`)}>{contact.company.name}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[contact.leadStatus] || 'bg-gray-100'}`}>{contact.leadStatus}</span>
                <button onClick={handleScore} disabled={scoringLoading} className="flex items-center gap-1 group" title="Recalcular lead score">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${scoreColor} transition-all duration-500`} style={{ width: `${score}%` }} /></div>
                  <span className={`text-xs font-semibold ${scoreTextColor}`}>{score}</span>
                  {scoringLoading ? <Loader className="w-3 h-3 animate-spin text-gray-400" /> : <RefreshCw className="w-3 h-3 text-gray-300 group-hover:text-primary-500 transition-colors" />}
                </button>
                {contact.sentiment && <span className={`text-xs px-1.5 py-0.5 rounded ${contact.sentiment === 'positive' ? 'bg-green-100 text-green-700' : contact.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{contact.sentiment}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contact.email && <button onClick={() => setShowEmailModal(true)} className="flex items-center gap-1 px-3 py-2 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"><Mail className="w-4 h-4" /> Email</button>}
            {contact.phone && <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-2 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50"><MessageSquare className="w-4 h-4" /> WhatsApp</a>}
            <button onClick={handleEnrich} disabled={enriching} className="flex items-center gap-1 px-3 py-2 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50">
              {enriching ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI
            </button>
            <button onClick={() => setShowEdit(true)} className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"><Edit2 className="w-4 h-4" /> Editar</button>
          </div>
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
          {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Mail className="w-4 h-4" />{contact.email}</a>}
          {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-gray-700"><PhoneIcon className="w-4 h-4" />{contact.phone}</a>}
          {contact.source && <div className="flex items-center gap-2 text-sm text-gray-500"><Tag className="w-4 h-4" />Fuente: {contact.source}</div>}
          <div className="flex items-center gap-2 text-sm text-gray-500"><Calendar className="w-4 h-4" />{new Date(contact.createdAt).toLocaleDateString('es-MX')}</div>
        </div>

        {/* Tags */}
        {contact.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {contact.tags.map((t: any) => <span key={t.tag || t.id} className="px-2 py-0.5 bg-accent-100 text-accent-800 rounded-full text-xs">{t.tag}</span>)}
          </div>
        )}
      </div>

      {/* AI Summary Card */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-purple-900">Resumen AI</h3>
          </div>
          <button onClick={handleGenerateSummary} disabled={summaryLoading} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
            {summaryLoading ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {aiSummary ? 'Regenerar' : 'Generar'}
          </button>
        </div>
        {aiSummary ? (
          <p className="text-sm text-gray-700">{aiSummary}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">Haz clic en &quot;Generar&quot; para obtener un resumen AI de este contacto.</p>
        )}
      </div>

      {/* Score Breakdown (collapsible) */}
      {scoreBreakdown && (
        <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden">
          <button onClick={() => setShowScoreDetail(!showScoreDetail)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">Lead Score Breakdown</span>
              <span className={`text-lg font-bold ${scoreTextColor}`}>{scoreBreakdown.total}</span>
            </div>
            {showScoreDetail ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showScoreDetail && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
                El Lead Score (0-100) mide la probabilidad de conversión del contacto. A mayor puntaje, mayor prioridad para el equipo comercial. Se calcula automáticamente con 5 factores:
              </p>
              {/* Score bars */}
              {[
                { label: 'Engagement', desc: 'Interacciones (emails, llamadas, notas)', value: scoreBreakdown.engagement, max: 25, color: 'bg-blue-500' },
                { label: 'Recencia', desc: 'Qué tan reciente fue el último contacto', value: scoreBreakdown.recency, max: 20, color: 'bg-green-500' },
                { label: 'Empresa', desc: 'Datos de empresa completos y relevantes', value: scoreBreakdown.companyFit, max: 20, color: 'bg-purple-500' },
                { label: 'Web', desc: 'Visitas, formularios y clicks en el sitio', value: scoreBreakdown.webActivity, max: 20, color: 'bg-orange-500' },
                { label: 'Deals', desc: 'Progreso de oportunidades en el pipeline', value: scoreBreakdown.dealProgress, max: 15, color: 'bg-pink-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600" title={item.desc}>{item.label}</span>
                    <span className="font-medium text-gray-900">{item.value}/{item.max}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-1">{item.desc}</p>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${(item.value / item.max) * 100}%` }} />
                  </div>
                </div>
              ))}
              {/* Factors */}
              {scoreBreakdown.factors?.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Factores clave:</p>
                  <div className="flex flex-wrap gap-1">
                    {scoreBreakdown.factors.map((f: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* NL Query */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Pregunta al CRM</h3>
            </div>
            <div className="flex gap-2">
              <input
                value={nlQuery}
                onChange={e => setNlQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNlQuery()}
                placeholder="Ej: Cuantos deals abiertos tiene este contacto?"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button onClick={handleNlQuery} disabled={nlLoading || !nlQuery.trim()} className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {nlLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            {nlAnswer && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">{nlAnswer}</div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Actividad ({actTotal})</h2>
              <button onClick={() => setShowAddActivity(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Plus className="w-4 h-4" /> Agregar</button>
            </div>
            {activities.length === 0 ? (
              <div className="p-8 text-center text-gray-400"><MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />Sin actividades registradas</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {activities.map((a: any) => {
                  const Icon = ACTIVITY_ICONS[a.type] || FileText;
                  const isAi = a.type === 'ai_summary';
                  return (
                    <div key={a.id} className={`px-6 py-4 flex gap-3 ${isAi ? 'bg-purple-50/50' : ''}`}>
                      <div className={`w-8 h-8 rounded-full ${isAi ? 'bg-purple-100' : 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${isAi ? 'text-purple-500' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{a.title || a.type}{isAi && <span className="ml-1.5 text-xs text-purple-500">AI</span>}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(a.createdAt)}</span>
                        </div>
                        {a.summary && <p className="text-sm text-purple-700 mt-0.5 italic">{a.summary}</p>}
                        {a.content && !a.summary && (() => {
                          try {
                            const parsed = JSON.parse(a.content);
                            if (typeof parsed === 'object' && parsed !== null) {
                              return (
                                <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                                  {Object.entries(parsed).filter(([, v]) => v).map(([k, v]) => (
                                    <div key={k}><span className="font-medium text-gray-500 capitalize">{k}:</span> {String(v)}</div>
                                  ))}
                                </div>
                              );
                            }
                          } catch {}
                          return <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{a.content}</p>;
                        })()}
                        <div className="flex items-center gap-2 mt-1">
                          {a.duration && <span className="text-xs text-gray-400">{Math.floor(a.duration / 60)}min</span>}
                          {a.sentiment && <span className={`text-xs px-1.5 py-0.5 rounded ${a.sentiment === 'positive' ? 'bg-green-100 text-green-700' : a.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{a.sentiment}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {actTotal > 20 && (
              <div className="px-6 py-3 border-t border-gray-100 flex justify-center gap-2">
                <button disabled={actPage <= 1} onClick={() => fetchActivities(actPage - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Anterior</button>
                <button disabled={actPage * 20 >= actTotal} onClick={() => fetchActivities(actPage + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Siguiente</button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Proactive Nudges */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Sugerencias AI</h3>
              </div>
              <button onClick={fetchNudges} disabled={nudgesLoading} className="text-xs text-gray-400 hover:text-gray-600">
                {nudgesLoading ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              </button>
            </div>
            {nudges.length === 0 ? (
              <div className="p-4">
                <button onClick={fetchNudges} disabled={nudgesLoading} className="w-full text-center text-sm text-primary-600 hover:text-primary-700">
                  {nudgesLoading ? 'Analizando...' : 'Cargar sugerencias'}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {nudges.slice(0, 5).map((n: any, i: number) => (
                  <div key={i} className={`px-4 py-3 border-l-2 ${URGENCY_COLORS[n.urgency] || ''}`}>
                    <p className="text-xs font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.description}</p>
                    {n.suggestedAction && (
                      <p className="text-xs text-primary-600 mt-1 font-medium">{n.suggestedAction}</p>
                    )}
                  </div>
                ))}
                {nudges.length > 5 && <div className="px-4 py-2 text-xs text-gray-400 text-center">+{nudges.length - 5} mas</div>}
              </div>
            )}
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900 text-sm">Tareas pendientes</h3></div>
            {(contact.tasks?.length || 0) === 0 ? <p className="p-4 text-sm text-gray-400">Sin tareas</p> : (
              <div className="divide-y divide-gray-50">
                {contact.tasks.map((t: any) => (
                  <div key={t.id} className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-gray-900">{t.title}</p>
                      {t.isAutoGenerated && <span title="Generada por AI"><Sparkles className="w-3 h-3 text-purple-400" /></span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {t.dueAt && <span className={`text-xs ${new Date(t.dueAt) < new Date() ? 'text-red-600' : 'text-gray-400'}`}><Clock className="w-3 h-3 inline mr-0.5" />{new Date(t.dueAt).toLocaleDateString('es-MX')}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[t.priority] || ''}`}>{t.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deals */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900 text-sm">Deals</h3></div>
            {(contact.deals?.length || 0) === 0 ? <p className="p-4 text-sm text-gray-400">Sin deals</p> : (
              <div className="divide-y divide-gray-50">
                {contact.deals.map((d: any) => (
                  <div key={d.id} className="px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/crm/deals`)}>
                    <p className="text-sm font-medium text-gray-900">{d.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {d.value && <span className="text-xs text-gray-600">{fmtMXN(Number(d.value))}</span>}
                      {d.stage && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: d.stage.color + '20', color: d.stage.color }}>{d.stage.name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Campos personalizados</h3>
                <button onClick={() => setEditingCustomFields(!editingCustomFields)} className="text-xs text-primary-600 hover:text-primary-700">
                  {editingCustomFields ? 'Cancelar' : 'Editar'}
                </button>
              </div>
              <div className="px-4 py-3 space-y-3">
                {customFields.map((field: any) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-gray-500">{field.label}</label>
                    {editingCustomFields ? (
                      renderCustomFieldInput(field)
                    ) : (
                      <p className="text-sm text-gray-900">{customValues[field.id] || '—'}</p>
                    )}
                  </div>
                ))}
                {editingCustomFields && (
                  <button onClick={handleSaveCustomFields} disabled={savingCustomFields} className="w-full px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                    {savingCustomFields ? 'Guardando...' : 'Guardar campos'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddActivity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddActivity(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b"><h3 className="font-semibold">Agregar Actividad</h3><button onClick={() => setShowAddActivity(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={actForm.type} onChange={e => setActForm({ ...actForm, type: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="note">Nota</option><option value="call">Llamada</option><option value="email">Email</option><option value="meeting">Reunion</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Titulo</label><input value={actForm.title} onChange={e => setActForm({ ...actForm, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label><textarea rows={3} value={actForm.content} onChange={e => setActForm({ ...actForm, content: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              {(actForm.type === 'call' || actForm.type === 'meeting') && (
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Duracion (segundos)</label><input type="number" value={actForm.duration} onChange={e => setActForm({ ...actForm, duration: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              )}
              {(actForm.type === 'call' || actForm.type === 'email') && (
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
                  <select value={actForm.direction} onChange={e => setActForm({ ...actForm, direction: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">—</option><option value="inbound">Entrante</option><option value="outbound">Saliente</option>
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowAddActivity(false)} className="px-4 py-2 text-sm border rounded-lg">Cancelar</button>
              <button onClick={handleAddActivity} disabled={saving} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b"><h3 className="font-semibold">Editar Contacto</h3><button onClick={() => setShowEdit(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label><input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label><input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label><input value={editForm.position} onChange={e => setEditForm({ ...editForm, position: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Estatus</label>
                <select value={editForm.leadStatus} onChange={e => setEditForm({ ...editForm, leadStatus: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="new">Nuevo</option><option value="contacted">Contactado</option><option value="qualified">Calificado</option><option value="converted">Convertido</option><option value="lost">Perdido</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm border rounded-lg">Cancelar</button>
              <button onClick={handleEdit} disabled={saving} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="font-semibold">Enviar Email</h3>
                <p className="text-xs text-gray-400">Para: {contact.email}</p>
              </div>
              <button onClick={() => setShowEmailModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label><input value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="Ej: Seguimiento - {{company}}" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label><textarea rows={6} value={emailForm.body} onChange={e => setEmailForm({ ...emailForm, body: e.target.value })} placeholder="Hola {{firstName}}, ..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <p className="text-xs text-gray-400">Variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{company}}'}, {'{{position}}'}, {'{{email}}'}</p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancelar</button>
              <button onClick={handleSendEmail} disabled={sendingEmail || !emailForm.subject.trim() || !emailForm.body.trim()} className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{sendingEmail ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
