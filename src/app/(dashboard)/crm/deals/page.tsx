'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Kanban,
  Loader,
  AlertCircle,
  Plus,
  X,
  ChevronRight,
  DollarSign,
  User,
  Building2,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Deal {
  id: string;
  title: string;
  value?: number;
  probability?: number;
  contact?: { id: string; firstName: string; lastName: string };
  company?: { id: string; name: string };
  stage?: { id: string; name: string };
}

interface Stage {
  id: string;
  name: string;
  order: number;
  color?: string;
  deals: Deal[];
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STAGE_COLORS = [
  'bg-gray-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-red-500',
];

function formatMXN(value?: number) {
  if (value == null) return '--';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function stageTotal(stage: Stage): number {
  return stage.deals.reduce((sum, d) => sum + (d.value || 0), 0);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DealsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Move deal
  const [movingDealId, setMovingDealId] = useState<string | null>(null);

  // Edit deal inline
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editProb, setEditProb] = useState('');

  const startEditDeal = (deal: any) => {
    setEditingDealId(deal.id);
    setEditValue(deal.value != null ? String(deal.value) : '');
    setEditProb(deal.probability != null ? String(deal.probability) : '10');
    setMovingDealId(null);
  };

  const saveEditDeal = async (dealId: string) => {
    try {
      const body: any = {};
      if (editValue) body.value = parseFloat(editValue);
      if (editProb) body.probability = parseInt(editProb);
      await apiClient.put(`/v1/crm/deals/${dealId}`, body);
      setEditingDealId(null);
      fetchPipelines();
    } catch (err) {
      console.error('Error updating deal:', err);
    }
  };

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [form, setForm] = useState({
    title: '',
    value: '',
    contactId: '',
    companyId: '',
    stageId: '',
  });

  /* ---- Fetch pipelines ---- */
  const fetchPipelines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<Pipeline[]>('/v1/crm/pipelines');
      setPipelines(res);
      if (res.length > 0) {
        setActivePipeline(res[0]);
      } else {
        setActivePipeline(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cargar pipelines');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---- Fetch pipeline deals (kanban data) ---- */
  const fetchKanban = useCallback(async (pipelineId: string) => {
    try {
      const res = await apiClient.get<Pipeline>(
        `/v1/crm/deals/pipeline/${pipelineId}`,
      );
      const sorted = (res.stages || []).sort((a, b) => a.order - b.order);
      setStages(sorted);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar deals del pipeline');
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  useEffect(() => {
    if (activePipeline) {
      fetchKanban(activePipeline.id);
    }
  }, [activePipeline, fetchKanban]);

  /* ---- Seed default pipeline ---- */
  const handleSeed = async () => {
    setSeeding(true);
    try {
      await apiClient.post('/v1/crm/pipelines/seed-default');
      toast.success('Pipeline creado');
      fetchPipelines();
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear pipeline');
    } finally {
      setSeeding(false);
    }
  };

  /* ---- Move deal to stage ---- */
  const handleMoveDeal = async (dealId: string, newStageId: string) => {
    try {
      await apiClient.put(`/v1/crm/deals/${dealId}`, { stageId: newStageId });
      toast.success('Deal movido');
      setMovingDealId(null);
      if (activePipeline) fetchKanban(activePipeline.id);
    } catch (err: any) {
      toast.error(err?.message || 'Error al mover deal');
    }
  };

  /* ---- Create deal ---- */
  const openModal = async () => {
    setForm({ title: '', value: '', contactId: '', companyId: '', stageId: stages[0]?.id || '' });
    setShowModal(true);
    try {
      const [contactsRes, companiesRes] = await Promise.all([
        apiClient.get<{ data: ContactOption[] }>('/v1/crm/contacts?limit=200'),
        apiClient.get<{ data: CompanyOption[] }>('/v1/crm/companies?limit=200'),
      ]);
      setContacts(contactsRes.data);
      setCompanies(companiesRes.data);
    } catch {
      setContacts([]);
      setCompanies([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('El titulo es obligatorio');
      return;
    }
    if (!activePipeline) return;
    setSaving(true);
    try {
      const body: any = {
        title: form.title.trim(),
        pipelineId: activePipeline.id,
        stageId: form.stageId || stages[0]?.id,
      };
      if (form.value) body.value = parseFloat(form.value);
      if (form.contactId) body.contactId = form.contactId;
      if (form.companyId) body.companyId = form.companyId;

      await apiClient.post('/v1/crm/deals', body);
      toast.success('Deal creado');
      setShowModal(false);
      fetchKanban(activePipeline.id);
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear deal');
    } finally {
      setSaving(false);
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

  /* No pipelines — seed */
  if (!activePipeline) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Kanban className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Pipeline de Ventas</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium mb-2">No hay pipelines configurados</p>
            <p className="text-sm text-gray-400 mb-6">
              Crea el pipeline por defecto con las etapas estandar de ventas.
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {seeding ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Crear Pipeline por Defecto
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Kanban className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Pipeline de Ventas</h1>
          </div>
          <p className="text-gray-600">{activePipeline.name}</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Deal
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            className="flex-shrink-0 w-72 bg-gray-50 rounded-lg border border-gray-200 flex flex-col max-h-[calc(100vh-280px)]"
          >
            {/* Column header */}
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${stage.color || STAGE_COLORS[idx % STAGE_COLORS.length]}`}
                  />
                  <h3 className="text-sm font-semibold text-gray-800">{stage.name}</h3>
                </div>
                <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
                  {stage.deals.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Total: {formatMXN(stageTotal(stage))}
              </p>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {stage.deals.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-400">Sin deals</p>
                </div>
              ) : (
                stage.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow transition-shadow"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-1.5">{deal.title}</p>

                    {/* Inline edit mode */}
                    {editingDealId === deal.id ? (
                      <div className="border-t border-gray-100 pt-2 mt-1 space-y-2">
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase">Valor (MXN)</label>
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="0.00"
                            className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 rounded focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase">Probabilidad (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editProb}
                            onChange={(e) => setEditProb(e.target.value)}
                            className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 rounded focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => saveEditDeal(deal.id)} className="flex-1 px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors">Guardar</button>
                          <button onClick={() => setEditingDealId(null)} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 mb-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-sm font-semibold text-green-700">
                            {deal.value != null ? formatMXN(deal.value) : '$0'}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1">({deal.probability || 0}%)</span>
                        </div>

                        <div className="space-y-1 mb-2">
                          {deal.contact && (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {deal.contact.firstName} {deal.contact.lastName}
                              </span>
                            </div>
                          )}
                          {deal.company && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-600">{deal.company.name}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Action buttons */}
                    {editingDealId !== deal.id && movingDealId !== deal.id && (
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => startEditDeal(deal)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <DollarSign className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          onClick={() => setMovingDealId(deal.id)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                          Mover
                        </button>
                      </div>
                    )}

                    {/* Move stage selector */}
                    {movingDealId === deal.id ? (
                      <div className="border-t border-gray-100 pt-2 mt-2">
                        <p className="text-xs text-gray-500 mb-1">Mover a:</p>
                        <div className="space-y-1">
                          {stages
                            .filter((s) => s.id !== stage.id)
                            .map((s) => (
                              <button
                                key={s.id}
                                onClick={() => handleMoveDeal(deal.id, s.id)}
                                className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors text-left"
                              >
                                <ChevronRight className="w-3 h-3 text-gray-400" />
                                {s.name}
                              </button>
                            ))}
                          <button
                            onClick={() => setMovingDealId(null)}
                            className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo Deal</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titulo *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Implementacion ERP - Empresa XYZ"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor (MXN)
                  </label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Etapa</label>
                  <select
                    value={form.stageId}
                    onChange={(e) => setForm((f) => ({ ...f, stageId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
                  <select
                    value={form.contactId}
                    onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Sin contacto</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                  <select
                    value={form.companyId}
                    onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Sin empresa</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader className="w-4 h-4 animate-spin" />}
                  Crear Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
