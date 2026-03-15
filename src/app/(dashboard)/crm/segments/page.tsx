'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Filter, Plus, RefreshCw, Trash2, Users, ChevronDown, ChevronUp,
  Eye, BarChart3, X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface SegmentFilter {
  field: string;
  operator: string;
  value: any;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  filters: SegmentFilter[];
  contactCount: number;
  isActive: boolean;
  lastCalculatedAt: string | null;
  createdAt: string;
  _count?: { campaigns: number };
}

const FILTER_FIELDS = [
  { value: 'leadStatus', label: 'Lead Status', type: 'select', options: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
  { value: 'source', label: 'Source', type: 'select', options: ['chatbot', 'manual', 'import', 'web_form', 'erp'] },
  { value: 'leadScore', label: 'Lead Score', type: 'number' },
  { value: 'email', label: 'Email', type: 'string' },
  { value: 'phone', label: 'Phone', type: 'string' },
  { value: 'firstName', label: 'First Name', type: 'string' },
  { value: 'lastName', label: 'Last Name', type: 'string' },
  { value: 'position', label: 'Position', type: 'string' },
  { value: 'tag', label: 'Tag', type: 'string' },
  { value: 'companyId', label: 'Has Company', type: 'exists' },
  { value: 'createdAt', label: 'Created Date', type: 'date' },
  { value: 'lastContactedAt', label: 'Last Contacted', type: 'date' },
];

const STRING_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const NUMBER_OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
];

const DATE_OPERATORS = [
  { value: 'gt', label: 'after' },
  { value: 'lt', label: 'before' },
  { value: 'gte', label: 'on or after' },
  { value: 'lte', label: 'on or before' },
];

function getOperators(fieldType: string) {
  switch (fieldType) {
    case 'number': return NUMBER_OPERATORS;
    case 'date': return DATE_OPERATORS;
    case 'select': return [{ value: 'equals', label: 'is' }, { value: 'not_equals', label: 'is not' }];
    case 'exists': return [{ value: 'is_empty', label: 'no' }, { value: 'is_not_empty', label: 'yes' }];
    default: return STRING_OPERATORS;
  }
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFilters, setFormFilters] = useState<SegmentFilter[]>([{ field: 'leadStatus', operator: 'equals', value: 'new' }]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadSegments = useCallback(async () => {
    try {
      const data = await apiClient.get('/v1/crm/segments');
      setSegments(data);
    } catch (err) {
      console.error('Failed to load segments', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSegments(); }, [loadSegments]);

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const count = await apiClient.post('/v1/crm/segments/preview-count', { filters: formFilters });
      setPreviewCount(typeof count === 'number' ? count : count?.count || 0);
    } catch {
      setPreviewCount(0);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    try {
      if (editingId) {
        await apiClient.put(`/v1/crm/segments/${editingId}`, {
          name: formName, description: formDescription, filters: formFilters,
        });
      } else {
        await apiClient.post('/v1/crm/segments', {
          name: formName, description: formDescription, filters: formFilters,
        });
      }
      resetForm();
      loadSegments();
    } catch (err) {
      console.error('Failed to save segment', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this segment?')) return;
    try {
      await apiClient.delete(`/v1/crm/segments/${id}`);
      loadSegments();
    } catch (err) {
      console.error('Failed to delete segment', err);
    }
  };

  const handleRecalculate = async (id: string) => {
    try {
      await apiClient.post(`/v1/crm/segments/${id}/recalculate`);
      loadSegments();
    } catch (err) {
      console.error('Failed to recalculate', err);
    }
  };

  const handleEdit = (segment: Segment) => {
    setEditingId(segment.id);
    setFormName(segment.name);
    setFormDescription(segment.description || '');
    setFormFilters(segment.filters.length > 0 ? segment.filters : [{ field: 'leadStatus', operator: 'equals', value: '' }]);
    setShowCreate(true);
    setPreviewCount(segment.contactCount);
  };

  const resetForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormFilters([{ field: 'leadStatus', operator: 'equals', value: '' }]);
    setPreviewCount(null);
  };

  const addFilter = () => setFormFilters([...formFilters, { field: 'leadStatus', operator: 'equals', value: '' }]);
  const removeFilter = (i: number) => setFormFilters(formFilters.filter((_, idx) => idx !== i));

  const updateFilter = (i: number, key: keyof SegmentFilter, val: any) => {
    const updated = [...formFilters];
    updated[i] = { ...updated[i], [key]: val };
    // Reset operator/value when field changes
    if (key === 'field') {
      const fieldDef = FILTER_FIELDS.find(f => f.value === val);
      const ops = getOperators(fieldDef?.type || 'string');
      updated[i].operator = ops[0].value;
      updated[i].value = '';
    }
    setFormFilters(updated);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading segments...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Segments</h1>
          <p className="text-sm text-gray-500 mt-1">Create dynamic contact groups with filters</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Segment
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Segment' : 'New Segment'}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. Hot Leads"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filters (all must match)</label>
            {formFilters.map((filter, i) => {
              const fieldDef = FILTER_FIELDS.find(f => f.value === filter.field);
              const operators = getOperators(fieldDef?.type || 'string');
              const needsValue = !['is_empty', 'is_not_empty'].includes(filter.operator);

              return (
                <div key={i} className="flex items-center gap-2 mb-2">
                  {i > 0 && <span className="text-xs text-gray-400 font-medium w-8">AND</span>}
                  {i === 0 && <span className="w-8" />}
                  <select
                    value={filter.field}
                    onChange={e => updateFilter(i, 'field', e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    {FILTER_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <select
                    value={filter.operator}
                    onChange={e => updateFilter(i, 'operator', e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    {operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {needsValue && fieldDef?.type === 'select' ? (
                    <select
                      value={filter.value}
                      onChange={e => updateFilter(i, 'value', e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white flex-1"
                    >
                      <option value="">Select...</option>
                      {fieldDef.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : needsValue && fieldDef?.type === 'date' ? (
                    <input
                      type="date"
                      value={filter.value}
                      onChange={e => updateFilter(i, 'value', e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm flex-1"
                    />
                  ) : needsValue ? (
                    <input
                      type={fieldDef?.type === 'number' ? 'number' : 'text'}
                      value={filter.value}
                      onChange={e => updateFilter(i, 'value', e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm flex-1"
                      placeholder="Value"
                    />
                  ) : null}
                  {formFilters.length > 1 && (
                    <button onClick={() => removeFilter(i)} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
            <button onClick={addFilter} className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-1">
              + Add filter
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {previewLoading ? 'Counting...' : 'Preview Count'}
            </button>
            {previewCount !== null && (
              <span className="text-sm font-medium text-gray-700">
                <Users className="w-4 h-4 inline mr-1" />
                {previewCount} contacts match
              </span>
            )}
            <div className="flex-1" />
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              onClick={handleSave}
              disabled={!formName.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {editingId ? 'Update Segment' : 'Create Segment'}
            </button>
          </div>
        </div>
      )}

      {/* Segments List */}
      {segments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600">No segments yet</h3>
          <p className="text-sm text-gray-400 mt-1">Create your first segment to group contacts dynamically</p>
        </div>
      ) : (
        <div className="space-y-3">
          {segments.map(segment => (
            <div key={segment.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === segment.id ? null : segment.id)}
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${segment.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{segment.name}</h3>
                  {segment.description && <p className="text-xs text-gray-500 truncate">{segment.description}</p>}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{segment.contactCount}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Filter className="w-3.5 h-3.5" />
                  {segment.filters.length} filter{segment.filters.length !== 1 ? 's' : ''}
                </div>
                {segment._count?.campaigns ? (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <BarChart3 className="w-3.5 h-3.5" />
                    {segment._count.campaigns} campaign{segment._count.campaigns !== 1 ? 's' : ''}
                  </div>
                ) : null}
                {expandedId === segment.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>

              {expandedId === segment.id && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Filters</h4>
                    <div className="flex flex-wrap gap-2">
                      {segment.filters.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                          {FILTER_FIELDS.find(ff => ff.value === f.field)?.label || f.field}
                          <span className="text-blue-400">{f.operator}</span>
                          {!['is_empty', 'is_not_empty'].includes(f.operator) && (
                            <span className="font-semibold">{String(f.value)}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(segment); }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRecalculate(segment.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Recalculate
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(segment.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                  {segment.lastCalculatedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Last calculated: {new Date(segment.lastCalculatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
