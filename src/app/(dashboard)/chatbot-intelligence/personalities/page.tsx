'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Loader,
  AlertCircle,
  Plus,
  Edit,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Personality {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  is_active: boolean;
  traffic_weight: number;
  stats?: {
    conversations: number;
    leads: number;
    avg_satisfaction: number;
  };
}

interface PersonalityForm {
  name: string;
  description: string;
  system_prompt: string;
  traffic_weight: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function PersonalitiesPage() {
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PersonalityForm>({
    name: '',
    description: '',
    system_prompt: '',
    traffic_weight: 50,
  });

  // Toggle loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPersonalities();
  }, []);

  const fetchPersonalities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<Personality[] | { data: Personality[] }>(
        '/v1/chatbot-intelligence/personalities',
      );
      const list = Array.isArray(res) ? res : (res as any).data ?? [];
      setPersonalities(list);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar personalidades');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '', system_prompt: '', traffic_weight: 50 });
    setShowModal(true);
  };

  const openEdit = (p: Personality) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      system_prompt: p.system_prompt,
      traffic_weight: p.traffic_weight,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const updated = await apiClient.patch<Personality>(
          `/v1/chatbot-intelligence/personalities/${editingId}`,
          form,
        );
        setPersonalities((prev) =>
          prev.map((p) => (p.id === editingId ? updated : p)),
        );
        toast.success('Personalidad actualizada');
      } else {
        const created = await apiClient.post<Personality>(
          '/v1/chatbot-intelligence/personalities',
          form,
        );
        setPersonalities((prev) => [...prev, created]);
        toast.success('Personalidad creada');
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: Personality) => {
    setTogglingId(p.id);
    try {
      const updated = await apiClient.patch<Personality>(
        `/v1/chatbot-intelligence/personalities/${p.id}`,
        { is_active: !p.is_active },
      );
      setPersonalities((prev) =>
        prev.map((item) => (item.id === p.id ? updated : item)),
      );
      toast.success(updated.is_active ? 'Personalidad activada' : 'Personalidad desactivada');
    } catch (err: any) {
      toast.error(err?.message || 'Error al cambiar estado');
    } finally {
      setTogglingId(null);
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
          <Sparkles className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Personalidades</h1>
            <p className="text-gray-600 text-sm">Variantes A/B del chatbot para pruebas de personalidad</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva personalidad
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Cards */}
      {personalities.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Sparkles className="w-14 h-14 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Sin personalidades configuradas</p>
          <p className="text-sm text-gray-400 mt-1">
            Crea la primera personalidad para iniciar pruebas A/B
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personalities.map((p) => (
            <PersonalityCard
              key={p.id}
              personality={p}
              toggling={togglingId === p.id}
              onToggle={() => handleToggle(p)}
              onEdit={() => openEdit(p)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar personalidad' : 'Nueva personalidad'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Amigable, Formal, Agresivo..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Breve descripcion de esta personalidad"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                <textarea
                  value={form.system_prompt}
                  onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                  rows={6}
                  placeholder="Eres un asistente de ventas de EnterSys. Tu tono es..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none font-mono"
                />
              </div>

              {/* Traffic Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso de trafico: <span className="font-bold text-primary-600">{form.traffic_weight}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={form.traffic_weight}
                  onChange={(e) => setForm((f) => ({ ...f, traffic_weight: Number(e.target.value) }))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Actions */}
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
                  {editingId ? 'Guardar cambios' : 'Crear personalidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Card sub-component ---- */

function PersonalityCard({
  personality,
  toggling,
  onToggle,
  onEdit,
}: {
  personality: Personality;
  toggling: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const p = personality;
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border transition-all ${
        p.is_active ? 'border-primary-200 ring-1 ring-primary-100' : 'border-gray-200'
      }`}
    >
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
              {p.is_active && (
                <span className="flex-shrink-0 text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                  Activo
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{p.description || 'Sin descripcion'}</p>
          </div>

          {/* Toggle */}
          <button
            onClick={onToggle}
            disabled={toggling}
            title={p.is_active ? 'Desactivar' : 'Activar'}
            className="flex-shrink-0 text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-50"
          >
            {toggling ? (
              <Loader className="w-6 h-6 animate-spin text-primary-500" />
            ) : p.is_active ? (
              <ToggleRight className="w-7 h-7 text-primary-600" />
            ) : (
              <ToggleLeft className="w-7 h-7" />
            )}
          </button>
        </div>

        {/* Traffic weight */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Peso de trafico</span>
            <span className="font-semibold text-gray-700">{p.traffic_weight}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${p.traffic_weight}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        {p.stats && (
          <div className="grid grid-cols-3 gap-2 mb-4 py-3 border-y border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{p.stats.conversations}</p>
              <p className="text-[10px] text-gray-400">Convs.</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-lg font-bold text-gray-900">{p.stats.leads}</p>
              <p className="text-[10px] text-gray-400">Leads</p>
            </div>
            <div className="text-center">
              <p
                className={`text-lg font-bold ${
                  p.stats.avg_satisfaction >= 4
                    ? 'text-green-600'
                    : p.stats.avg_satisfaction >= 3
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {p.stats.avg_satisfaction.toFixed(1)}
              </p>
              <p className="text-[10px] text-gray-400">Satisf.</p>
            </div>
          </div>
        )}

        {/* System prompt preview */}
        {p.system_prompt && (
          <p className="text-[11px] text-gray-400 font-mono line-clamp-2 bg-gray-50 rounded p-2 mb-3">
            {p.system_prompt}
          </p>
        )}

        {/* Edit button */}
        <button
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Editar
        </button>
      </div>
    </div>
  );
}
