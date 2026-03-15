'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Loader,
  AlertCircle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  UserCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  leadStatus: string;
  leadScore: number;
  source?: string;
  sourceId?: string;
  company?: { id: string; name: string };
  tags?: string[];
  webEvents?: { siteOrigin: string }[];
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CompanyOption {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: 'Nuevo', cls: 'bg-gray-100 text-gray-700' },
  contacted: { label: 'Contactado', cls: 'bg-blue-100 text-blue-700' },
  qualified: { label: 'Calificado', cls: 'bg-purple-100 text-purple-700' },
  converted: { label: 'Convertido', cls: 'bg-green-100 text-green-700' },
  lost: { label: 'Perdido', cls: 'bg-red-100 text-red-700' },
};

function statusLabel(s: string) {
  return STATUS_BADGE[s] ?? { label: s, cls: 'bg-gray-100 text-gray-600' };
}

function scoreColor(score: number) {
  if (score <= 30) return 'bg-red-500';
  if (score <= 60) return 'bg-yellow-400';
  return 'bg-green-500';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    companyId: '',
    leadStatus: 'new',
    source: '',
    tags: '',
  });

  /* ---- Fetch contacts ---- */
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('leadStatus', statusFilter);
      params.set('page', String(page));
      params.set('limit', '20');
      params.set('sortBy', 'createdAt');
      params.set('sortOrder', 'DESC');

      const res = await apiClient.get<{ data: Contact[]; meta: Meta }>(
        `/v1/crm/contacts?${params.toString()}`,
      );
      setContacts(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  /* ---- Debounced search ---- */
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ---- Selection helpers ---- */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Eliminar ${selected.size} contacto(s)?`)) return;
    try {
      await apiClient.post('/v1/crm/contacts/bulk-delete', { ids: Array.from(selected) });
      toast.success(`${selected.size} contacto(s) eliminados`);
      setSelected(new Set());
      fetchContacts();
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar');
    }
  };

  /* ---- Modal: create contact ---- */
  const openModal = async () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      companyId: '',
      leadStatus: 'new',
      source: '',
      tags: '',
    });
    setShowModal(true);
    try {
      const res = await apiClient.get<{ data: CompanyOption[] }>('/v1/crm/companies?limit=200');
      setCompanies(res.data);
    } catch {
      setCompanies([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        leadStatus: form.leadStatus,
      };
      if (form.email) body.email = form.email.trim();
      if (form.phone) body.phone = form.phone.trim();
      if (form.position) body.position = form.position.trim();
      if (form.companyId) body.companyId = form.companyId;
      if (form.source) body.source = form.source.trim();
      if (form.tags) body.tags = form.tags.split(',').map((t: string) => t.trim()).filter(Boolean);

      await apiClient.post('/v1/crm/contacts', body);
      toast.success('Contacto creado');
      setShowModal(false);
      fetchContacts();
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear contacto');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Render ---- */
  if (loading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Contactos</h1>
          </div>
          <p className="text-gray-600">
            Gestiona tus contactos, prospectos y clientes del CRM
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Contacto
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, email, telefono..."
            className="w-full outline-none text-gray-700 placeholder-gray-400 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 outline-none"
        >
          <option value="">Todos los estados</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s).label}
            </option>
          ))}
        </select>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar ({selected.size})
          </button>
        )}
      </div>

      {/* Table */}
      {contacts.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <UserCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No hay contactos</p>
            <p className="text-sm text-gray-400 mt-1">
              Crea tu primer contacto para comenzar a gestionar tu CRM.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={contacts.length > 0 && selected.size === contacts.length}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Telefono
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Lead Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Fuente
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((contact) => {
                  const badge = statusLabel(contact.leadStatus);
                  const initials =
                    (contact.firstName?.[0] || '') + (contact.lastName?.[0] || '');
                  return (
                    <tr
                      key={contact.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        window.location.href = `/crm/contacts/${contact.id}`;
                      }}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(contact.id)}
                          onChange={() => toggleSelect(contact.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-700 text-xs font-bold uppercase">
                              {initials || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm leading-tight">
                              {contact.firstName} {contact.lastName}
                            </p>
                            {contact.position && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {contact.position}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {contact.email || <span className="text-gray-400">--</span>}
                      </td>
                      {/* Phone */}
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {contact.phone || <span className="text-gray-400">--</span>}
                      </td>
                      {/* Company */}
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {contact.company?.name || (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      {/* Lead Score */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${scoreColor(contact.leadScore)}`}
                              style={{ width: `${Math.min(contact.leadScore, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-6 text-right">
                            {contact.leadScore}
                          </span>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      {/* Source */}
                      <td className="px-4 py-3">
                        {(() => {
                          const s = contact.source;
                          const origin = contact.webEvents?.[0]?.siteOrigin || contact.sourceId || '';
                          const sourceLabels: Record<string, { label: string; cls: string }> = {
                            web_form: { label: 'Formulario', cls: 'bg-blue-100 text-blue-700' },
                            chatbot: { label: 'Chatbot', cls: 'bg-purple-100 text-purple-700' },
                            manual: { label: 'Manual', cls: 'bg-gray-100 text-gray-600' },
                            import: { label: 'Importado', cls: 'bg-yellow-100 text-yellow-700' },
                            mautic_import: { label: 'Migrado', cls: 'bg-orange-100 text-orange-700' },
                          };
                          const badge = sourceLabels[s || ''] || { label: s || '--', cls: 'bg-gray-100 text-gray-600' };
                          const shortOrigin = origin.replace(/\.entersys2k\.com$/, '').replace(/^www\.?/, '') || null;
                          return (
                            <div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                                {badge.label}
                              </span>
                              {shortOrigin && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px]" title={origin}>
                                  {shortOrigin}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Mostrando {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} contacto
              {meta.total !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1,
                )
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  typeof item === 'string' ? (
                    <span key={`dots-${idx}`} className="px-1 text-xs text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                        item === page
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo Contacto</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefono
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Puesto
                </label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa
                  </label>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado del lead
                  </label>
                  <select
                    value={form.leadStatus}
                    onChange={(e) => setForm((f) => ({ ...f, leadStatus: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s).label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuente
                  </label>
                  <input
                    type="text"
                    value={form.source}
                    onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                    placeholder="web, referido, evento..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="vip, industria, etc."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Separados por coma</p>
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
                  Crear Contacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
