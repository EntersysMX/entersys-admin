'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Settings,
  Loader,
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Download,
  FileText,
  History,
  ToggleLeft,
  Eye,
  Database,
  Users,
  Merge,
  Check,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CustomField {
  id: string;
  entityType: string;
  name: string;
  label: string;
  fieldType: string;
  options?: string[];
  required: boolean;
  sortOrder: number;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string;
  changedByUser?: { firstName: string; lastName: string; email: string };
  changes: Record<string, any>;
  createdAt: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ENTITY_TYPES = ['Contact', 'Company', 'Deal'] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

const FIELD_TYPES = [
  'text',
  'number',
  'date',
  'select',
  'multiselect',
  'boolean',
  'url',
  'email',
  'phone',
] as const;

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  number: 'Numero',
  date: 'Fecha',
  select: 'Select',
  multiselect: 'Multi-select',
  boolean: 'Si/No',
  url: 'URL',
  email: 'Email',
  phone: 'Telefono',
};

const LEAD_STATUSES = ['', 'new', 'contacted', 'qualified', 'converted', 'lost'] as const;
const SOURCES = ['', 'chatbot', 'manual', 'import', 'web', 'referral', 'event'] as const;

const AUDIT_ACTIONS = ['', 'create', 'update', 'delete', 'import', 'export'] as const;
const AUDIT_ENTITIES = ['', 'Contact', 'Company', 'Deal', 'Task', 'CustomField'] as const;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-tabs                                                           */
/* ------------------------------------------------------------------ */

type SettingsTab = 'custom-fields' | 'import-export' | 'duplicates' | 'audit-log';

const settingsTabs: { id: SettingsTab; label: string; icon: typeof Database }[] = [
  { id: 'custom-fields', label: 'Campos Personalizados', icon: Database },
  { id: 'import-export', label: 'Importar / Exportar', icon: FileText },
  { id: 'duplicates', label: 'Duplicados', icon: Users },
  { id: 'audit-log', label: 'Audit Log', icon: History },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CrmSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('custom-fields');

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Settings className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-600">
          Configura campos personalizados, importa/exporta datos y revisa el historial de cambios.
        </p>
      </div>

      {/* Internal tabs */}
      <div className="mb-6 flex gap-1 bg-gray-100 rounded-lg p-1">
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'custom-fields' && <CustomFieldsTab />}
      {activeTab === 'import-export' && <ImportExportTab />}
      {activeTab === 'duplicates' && <DuplicatesTab />}
      {activeTab === 'audit-log' && <AuditLogTab />}
    </div>
  );
}

/* ================================================================== */
/*  TAB 1: Custom Fields                                               */
/* ================================================================== */

function CustomFieldsTab() {
  const [entityType, setEntityType] = useState<EntityType>('Contact');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: '',
    name: '',
    fieldType: 'text',
    options: '',
    required: false,
  });

  const fetchFields = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<CustomField[]>(
        `/v1/crm/custom-fields?entityType=${entityType}`,
      );
      const data = Array.isArray(res) ? res : (res as any).data ?? [];
      setFields(data.sort((a: CustomField, b: CustomField) => a.sortOrder - b.sortOrder));
    } catch (err: any) {
      setError(err?.message || 'Error al cargar campos');
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const openCreate = () => {
    setEditing(null);
    setForm({ label: '', name: '', fieldType: 'text', options: '', required: false });
    setShowModal(true);
  };

  const openEdit = (field: CustomField) => {
    setEditing(field);
    setForm({
      label: field.label,
      name: field.name,
      fieldType: field.fieldType,
      options: field.options?.join('\n') ?? '',
      required: field.required,
    });
    setShowModal(true);
  };

  const handleLabelChange = (label: string) => {
    setForm((f) => ({
      ...f,
      label,
      name: editing ? f.name : slugify(label),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) {
      toast.error('El label es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        entityType,
        label: form.label.trim(),
        name: form.name.trim() || slugify(form.label),
        fieldType: form.fieldType,
        required: form.required,
      };
      if (['select', 'multiselect'].includes(form.fieldType) && form.options.trim()) {
        body.options = form.options
          .split('\n')
          .map((o: string) => o.trim())
          .filter(Boolean);
      }

      if (editing) {
        await apiClient.put(`/v1/crm/custom-fields/${editing.id}`, body);
        toast.success('Campo actualizado');
      } else {
        await apiClient.post('/v1/crm/custom-fields', body);
        toast.success('Campo creado');
      }
      setShowModal(false);
      fetchFields();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (field: CustomField) => {
    if (!confirm(`Eliminar campo "${field.label}"? Esto no se puede deshacer.`)) return;
    try {
      await apiClient.delete(`/v1/crm/custom-fields/${field.id}`);
      toast.success('Campo eliminado');
      fetchFields();
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar');
    }
  };

  const handleReorder = async (field: CustomField, direction: 'up' | 'down') => {
    const idx = fields.findIndex((f) => f.id === field.id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === fields.length - 1))
      return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = [...fields];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    // Optimistic update
    setFields(reordered);

    try {
      const ids = reordered.map((f) => f.id);
      await apiClient.put('/v1/crm/custom-fields/reorder', { entityType, ids });
    } catch (err: any) {
      toast.error('Error al reordenar');
      fetchFields();
    }
  };

  return (
    <>
      {/* Entity selector + Add button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Entidad:</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Campo
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : fields.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">
            No hay campos personalizados para {entityType}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Agrega campos personalizados para capturar informacion adicional.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                    Orden
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Requerido
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, idx) => (
                  <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleReorder(field, 'up')}
                          className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button
                          disabled={idx === fields.length - 1}
                          onClick={() => handleReorder(field, 'down')}
                          className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">{field.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{field.label}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {field.required ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          Si
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(field)}
                          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(field)}
                          className="p-1.5 rounded hover:bg-red-100 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Editar Campo' : 'Nuevo Campo Personalizado'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Ej: Fecha de Nacimiento"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (slug)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="fecha_de_nacimiento"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono"
                  disabled={!!editing}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Se genera automaticamente del label. No se puede cambiar despues de crear.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    value={form.fieldType}
                    onChange={(e) => setForm((f) => ({ ...f, fieldType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {FIELD_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.required}
                      onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Requerido</span>
                  </label>
                </div>
              </div>

              {['select', 'multiselect'].includes(form.fieldType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opciones</label>
                  <textarea
                    value={form.options}
                    onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                    rows={4}
                    placeholder={'Opcion 1\nOpcion 2\nOpcion 3'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Una opcion por linea</p>
                </div>
              )}

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
                  {editing ? 'Guardar Cambios' : 'Crear Campo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  TAB 2: Import / Export                                             */
/* ================================================================== */

function ImportExportTab() {
  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Export state
  const [exportStatus, setExportStatus] = useState('');
  const [exportLeadStatus, setExportLeadStatus] = useState('');
  const [exportSource, setExportSource] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setImportResult(null);

    // Parse preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      const rows = lines.slice(0, 6).map((l) =>
        l.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')),
      );
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await csvFile.text();
      const res = await apiClient.post<ImportResult>('/v1/crm/import/contacts', {
        csv: text,
        skipDuplicates,
        updateExisting,
      });
      setImportResult(res);
      toast.success('Importacion completada');
    } catch (err: any) {
      toast.error(err?.message || 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('format', 'csv');
      if (exportLeadStatus) params.set('leadStatus', exportLeadStatus);
      if (exportSource) params.set('source', exportSource);

      // Use fetch directly for file download
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `https://api.entersys.mx/v1/crm/export/contacts?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) throw new Error('Error al exportar');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Archivo descargado');
    } catch (err: any) {
      toast.error(err?.message || 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Import Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Importar Contactos</h3>
        </div>

        <div className="space-y-4">
          {/* File input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 text-sm border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors w-full justify-center"
            >
              <FileText className="w-4 h-4" />
              {csvFile ? csvFile.name : 'Seleccionar archivo CSV'}
            </button>
          </div>

          {/* Preview */}
          {csvPreview.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase">
                Vista previa (primeras {Math.min(csvPreview.length - 1, 5)} filas)
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {csvPreview[0]?.map((header, i) => (
                        <th
                          key={i}
                          className="px-2 py-1.5 text-left text-gray-600 font-semibold whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {csvPreview.slice(1, 6).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[150px] truncate"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Omitir duplicados</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Actualizar existentes</span>
            </label>
          </div>

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={!csvFile || importing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center"
          >
            {importing ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar
          </button>

          {/* Results */}
          {importResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <p className="font-medium text-green-800 mb-1">Resultado de importacion</p>
              <div className="grid grid-cols-2 gap-1 text-green-700 text-xs">
                <span>Importados: {importResult.imported}</span>
                <span>Omitidos: {importResult.skipped}</span>
                <span>Actualizados: {importResult.updated}</span>
                <span>Errores: {importResult.errors?.length || 0}</span>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="mt-2 text-xs text-red-700 max-h-24 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Exportar Contactos</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado del Lead</label>
            <select
              value={exportLeadStatus}
              onChange={(e) => setExportLeadStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Todos</option>
              <option value="new">Nuevo</option>
              <option value="contacted">Contactado</option>
              <option value="qualified">Calificado</option>
              <option value="converted">Convertido</option>
              <option value="lost">Perdido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label>
            <select
              value={exportSource}
              onChange={(e) => setExportSource(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Todas</option>
              <option value="chatbot">Chatbot</option>
              <option value="manual">Manual</option>
              <option value="import">Import</option>
              <option value="web">Web</option>
              <option value="referral">Referido</option>
              <option value="event">Evento</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors w-full justify-center"
          >
            {exporting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Exportar CSV
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  TAB 3: Audit Log                                                   */
/* ================================================================== */

function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expanded rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (entityFilter) params.set('entity', entityFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await apiClient.get<{ data: AuditEntry[]; meta: Meta }>(
        `/v1/crm/audit?${params.toString()}`,
      );
      const data = Array.isArray(res) ? res : res.data ?? [];
      const resMeta = Array.isArray(res) ? { total: data.length, page: 1, limit: 20, totalPages: 1 } : res.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 };
      setEntries(Array.isArray(data) ? data : []);
      setMeta(resMeta);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar audit log');
    } finally {
      setLoading(false);
    }
  }, [page, entityFilter, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const actionBadge = (action: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      create: { label: 'Crear', cls: 'bg-green-100 text-green-700' },
      update: { label: 'Editar', cls: 'bg-blue-100 text-blue-700' },
      delete: { label: 'Eliminar', cls: 'bg-red-100 text-red-700' },
      import: { label: 'Importar', cls: 'bg-purple-100 text-purple-700' },
      export: { label: 'Exportar', cls: 'bg-yellow-100 text-yellow-700' },
    };
    return map[action] ?? { label: action, cls: 'bg-gray-100 text-gray-600' };
  };

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4 flex items-center gap-3 flex-wrap">
        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 outline-none"
        >
          <option value="">Todas las entidades</option>
          {AUDIT_ENTITIES.filter(Boolean).map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 outline-none"
        >
          <option value="">Todas las acciones</option>
          {AUDIT_ACTIONS.filter(Boolean).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <span>Desde:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <span>Hasta:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">No hay registros en el audit log</p>
          <p className="text-sm text-gray-400 mt-1">
            Las acciones del CRM se registraran automaticamente aqui.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Entidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Accion
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                    Cambios
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => {
                  const badge = actionBadge(entry.action);
                  const isExpanded = expanded.has(entry.id);
                  const userName = entry.changedByUser
                    ? `${entry.changedByUser.firstName} ${entry.changedByUser.lastName}`
                    : entry.changedBy || '--';

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {entry.entityType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {entry.entityId?.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{userName}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                          title="Ver cambios"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded changes panels */}
          {entries
            .filter((e) => expanded.has(e.id))
            .map((entry) => (
              <div
                key={`changes-${entry.id}`}
                className="px-6 py-3 bg-gray-50 border-t border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    Cambios — {entry.entityType} {entry.entityId?.slice(0, 8)}
                  </p>
                  <button
                    onClick={() => toggleExpand(entry.id)}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
                <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-48">
                  {JSON.stringify(entry.changes, null, 2)}
                </pre>
              </div>
            ))}

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Mostrando {(meta.page - 1) * meta.limit + 1}
              {'\u2013'}
              {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} registro
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
    </>
  );
}

/* ================================================================== */
/*  TAB 4: Duplicates                                                  */
/* ================================================================== */

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

const MATCH_LABELS: Record<string, string> = {
  email: 'Email',
  phone: 'Teléfono',
  name: 'Nombre',
};

function DuplicatesTab() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/v1/crm/duplicates/contacts');
      setGroups(Array.isArray(data) ? data : []);
      setScanned(true);
    } catch (e: any) {
      toast.error(e.message || 'Error al buscar duplicados');
    }
    setLoading(false);
  }, []);

  const handleMerge = useCallback(async (primaryId: string, secondaryId: string) => {
    setMerging(secondaryId);
    try {
      await apiClient.post('/v1/crm/duplicates/merge', { primaryId, secondaryId });
      toast.success('Contactos fusionados');
      setGroups((prev) => prev.filter((g) =>
        !(g.contacts.some((c: any) => c.id === primaryId) && g.contacts.some((c: any) => c.id === secondaryId))
      ));
    } catch (e: any) {
      toast.error(e.message || 'Error al fusionar');
    }
    setMerging(null);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">Detección de Duplicados</h2>
          <p className="text-sm text-gray-500 mt-0.5">Encuentra y fusiona contactos duplicados por email, teléfono o nombre.</p>
        </div>
        <button
          onClick={scan}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          {scanned ? 'Re-escanear' : 'Escanear duplicados'}
        </button>
      </div>

      {!scanned && !loading && (
        <div className="p-12 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Haz clic en &quot;Escanear duplicados&quot; para buscar contactos duplicados.</p>
        </div>
      )}

      {scanned && groups.length === 0 && (
        <div className="p-12 text-center text-gray-400">
          <Check className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <p className="text-green-600 font-medium">No se encontraron duplicados</p>
        </div>
      )}

      {groups.length > 0 && (
        <div className="divide-y divide-gray-100">
          {groups.map((group: any, gi: number) => (
            <div key={gi} className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_STYLES[group.confidence] || ''}`}>
                  {group.confidence === 'high' ? 'Alta' : group.confidence === 'medium' ? 'Media' : 'Baja'} confianza
                </span>
                <span className="text-xs text-gray-400">
                  Coincidencia por {MATCH_LABELS[group.matchType] || group.matchType}
                </span>
              </div>
              <div className="space-y-2">
                {group.contacts.map((contact: any, ci: number) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                        {contact.firstName?.[0]}{contact.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{contact.firstName} {contact.lastName}</p>
                        <p className="text-xs text-gray-500">{contact.email || contact.phone || '—'}</p>
                      </div>
                    </div>
                    {ci > 0 && (
                      <button
                        onClick={() => handleMerge(group.contacts[0].id, contact.id)}
                        disabled={merging === contact.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 disabled:opacity-50"
                        title={`Fusionar en ${group.contacts[0].firstName} ${group.contacts[0].lastName}`}
                      >
                        {merging === contact.id ? <Loader className="w-3 h-3 animate-spin" /> : <Merge className="w-3 h-3" />}
                        Fusionar con primero
                      </button>
                    )}
                    {ci === 0 && (
                      <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded">Principal</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

