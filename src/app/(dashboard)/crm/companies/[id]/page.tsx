'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader, AlertCircle, ArrowLeft, Mail, Phone as PhoneIcon, Globe,
  Calendar, FileText, MessageSquare, ArrowRight, Plus, X, Building2, Users,
  Sparkles, Brain, RefreshCw,
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

const ACTIVITY_ICONS: Record<string, any> = {
  call: PhoneIcon, email: Mail, meeting: Calendar, note: FileText,
  chat: MessageSquare, deal_moved: ArrowRight, ai_summary: FileText,
};

const SCORE_COLOR = (s: number) => s <= 30 ? 'bg-red-500' : s <= 60 ? 'bg-yellow-500' : 'bg-green-500';
const fmtMXN = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);

  // Custom fields
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [editingCustomFields, setEditingCustomFields] = useState(false);
  const [savingCustomFields, setSavingCustomFields] = useState(false);

  const fetchCompany = () => {
    setLoading(true);
    apiClient.get(`/v1/crm/companies/${id}`)
      .then(data => { setCompany(data); setAiSummary(data.summary || null); })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const fetchCustomFields = async () => {
    try {
      const [fields, values] = await Promise.all([
        apiClient.get('/v1/crm/custom-fields?entity=company'),
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

  useEffect(() => { fetchCompany(); fetchCustomFields(); }, [id]);

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const result = await apiClient.post(`/v1/crm/ai/companies/${id}/enrich`);
      if (result.summary) {
        setAiSummary(result.summary);
        toast.success('Empresa enriquecida');
      }
    } catch (e: any) { toast.error(e.message); }
    setEnriching(false);
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const result = await apiClient.post(`/v1/crm/ai/companies/${id}/enrich`);
      if (result.summary) setAiSummary(result.summary);
      toast.success('Resumen generado');
    } catch (e: any) { toast.error(e.message); }
    setSummaryLoading(false);
  };

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
  if (error || !company) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800"><AlertCircle className="w-4 h-4" />{error || 'Empresa no encontrada'}</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => router.push('/crm/companies')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft className="w-4 h-4" /> Volver a empresas</button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-secondary-100 flex items-center justify-center text-secondary-700 font-bold text-xl"><Building2 className="w-8 h-8" /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {company.razonSocial && company.razonSocial !== company.name && <p className="text-sm text-gray-500">{company.razonSocial}</p>}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                {company.industry && <span>{company.industry}</span>}
                {company.size && <span>{company.size} empleados</span>}
                {company.domain && <a href={`https://${company.domain}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1"><Globe className="w-3 h-3" />{company.domain}</a>}
              </div>
            </div>
          </div>
          <button onClick={handleEnrich} disabled={enriching} className="flex items-center gap-1 px-3 py-2 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50">
            {enriching ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
          {company.phone && <div className="flex items-center gap-2 text-sm"><PhoneIcon className="w-4 h-4 text-gray-400" />{company.phone}</div>}
          {company.rfc && <div className="flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-gray-400" />{company.rfc}</div>}
          {(company.city || company.state) && <div className="flex items-center gap-2 text-sm text-gray-500">{[company.city, company.state].filter(Boolean).join(', ')}</div>}
          {company.country && <div className="text-sm text-gray-500">{company.country}</div>}
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-purple-600" /><h3 className="text-sm font-semibold text-purple-900">Resumen AI</h3></div>
          <button onClick={handleGenerateSummary} disabled={summaryLoading} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
            {summaryLoading ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} {aiSummary ? 'Regenerar' : 'Generar'}
          </button>
        </div>
        {aiSummary ? <p className="text-sm text-gray-700">{aiSummary}</p> : <p className="text-sm text-gray-400 italic">Haz clic en &quot;Generar&quot; para obtener un resumen AI de esta empresa.</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contacts */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900"><Users className="w-4 h-4 inline mr-2" />Contactos ({company.contacts?.length || 0})</h2></div>
            {(company.contacts?.length || 0) === 0 ? <p className="p-6 text-sm text-gray-400 text-center">Sin contactos</p> : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Puesto</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Score</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {company.contacts.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/crm/contacts/${c.id}`)}>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{c.email || '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{c.position || '—'}</td>
                      <td className="px-6 py-3"><div className="flex items-center gap-1"><div className="w-12 h-1.5 bg-gray-200 rounded-full"><div className={`h-full rounded-full ${SCORE_COLOR(c.leadScore || 0)}`} style={{ width: `${c.leadScore || 0}%` }} /></div><span className="text-xs text-gray-500">{c.leadScore || 0}</span></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Actividad</h2></div>
            {(company.activities?.length || 0) === 0 ? <p className="p-6 text-sm text-gray-400 text-center">Sin actividades</p> : (
              <div className="divide-y divide-gray-50">
                {company.activities.map((a: any) => {
                  const Icon = ACTIVITY_ICONS[a.type] || FileText;
                  return (
                    <div key={a.id} className="px-6 py-4 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-gray-500" /></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-900">{a.title || a.type}</p><span className="text-xs text-gray-400">{timeAgo(a.createdAt)}</span></div>
                        {a.content && <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{a.content}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Deals */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
            <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900 text-sm">Deals</h3></div>
            {(company.deals?.length || 0) === 0 ? <p className="p-4 text-sm text-gray-400">Sin deals</p> : (
              <div className="divide-y divide-gray-50">
                {company.deals.map((d: any) => (
                  <div key={d.id} className="px-4 py-3">
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
    </div>
  );
}
