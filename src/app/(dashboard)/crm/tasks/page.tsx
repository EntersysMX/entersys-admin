'use client';

import { useEffect, useState } from 'react';
import {
  Loader, AlertCircle, Plus, X, CheckSquare, Clock, Search,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth-store';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500',
};
const STATUS_NEXT: Record<string, string> = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueAt: '', priority: 'medium', assigneeId: '' });

  const fetchTasks = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      const res = await apiClient.get(`/v1/crm/tasks?${params}`);
      setTasks(res.data);
      setMeta(res.meta);
      setPage(p);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, [status, priority]);

  const cycleStatus = async (task: any) => {
    const next = STATUS_NEXT[task.status];
    if (!next) return;
    try {
      await apiClient.put(`/v1/crm/tasks/${task.id}`, { status: next });
      toast.success(`Tarea → ${next}`);
      fetchTasks(page);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreate = async () => {
    if (!form.title) return toast.error('Titulo requerido');
    setSaving(true);
    try {
      await apiClient.post('/v1/crm/tasks', { ...form, assigneeId: form.assigneeId || user?.id, dueAt: form.dueAt || undefined });
      toast.success('Tarea creada');
      setShowCreate(false);
      setForm({ title: '', description: '', dueAt: '', priority: 'medium', assigneeId: '' });
      fetchTasks();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div><div className="flex items-center gap-3 mb-1"><CheckSquare className="w-8 h-8 text-primary-600" /><h1 className="text-3xl font-bold text-gray-900">Tareas</h1></div><p className="text-gray-600">Gestiona tareas y seguimientos</p></div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Plus className="w-4 h-4" /> Nueva Tarea</button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4 flex items-center gap-3">
        <select value={status} onChange={e => setStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los estatus</option><option value="pending">Pendiente</option><option value="in_progress">En progreso</option><option value="completed">Completada</option><option value="cancelled">Cancelada</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todas las prioridades</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="urgent">Urgente</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{meta.total} tarea{meta.total !== 1 ? 's' : ''}</span>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader className="w-10 h-10 animate-spin text-primary-600" /></div> : tasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center"><CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" /><p className="text-gray-500">Sin tareas</p></div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Titulo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vencimiento</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Prioridad</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estatus</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contacto</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Deal</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map(t => {
                const overdue = t.dueAt && t.status !== 'completed' && new Date(t.dueAt) < new Date();
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{t.title}</p>{t.description && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{t.description}</p>}</td>
                    <td className="px-6 py-4">{t.dueAt ? <span className={`text-sm flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}><Clock className="w-3.5 h-3.5" />{new Date(t.dueAt).toLocaleDateString('es-MX')}</span> : <span className="text-sm text-gray-400">—</span>}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span></td>
                    <td className="px-6 py-4"><button onClick={() => cycleStatus(t)} className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${STATUS_COLORS[t.status]}`}>{t.status}</button></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{t.deal?.title || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {meta.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-500">Pagina {page} de {meta.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => fetchTasks(page - 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50">Anterior</button>
                <button disabled={page >= meta.totalPages} onClick={() => fetchTasks(page + 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b"><h3 className="font-semibold">Nueva Tarea</h3><button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Titulo *</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label><input type="date" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-lg">Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Creando...' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
