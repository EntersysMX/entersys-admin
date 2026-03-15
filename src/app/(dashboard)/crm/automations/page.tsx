'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Plus, Trash2, Power, PowerOff, ChevronDown, ChevronUp, X,
  Play, Activity,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Automation {
  id: string;
  name: string;
  isActive: boolean;
  triggerEvent: string;
  triggerFilters: any[] | null;
  actions: any[];
  executionCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface AutomationStats {
  total: number;
  active: number;
  totalExecutions: number;
}

const TRIGGER_EVENTS = [
  { value: 'form_submit', label: 'Form Submitted', description: 'When a contact submits a form' },
  { value: 'cta_click', label: 'CTA Clicked', description: 'When a CTA button is clicked' },
  { value: 'deal_stage_changed', label: 'Deal Stage Changed', description: 'When a deal moves to a different stage' },
  { value: 'lead_score_threshold', label: 'Lead Score Threshold', description: 'When lead score reaches a value' },
  { value: 'tag_added', label: 'Tag Added', description: 'When a tag is added to a contact' },
  { value: 'contact_created', label: 'Contact Created', description: 'When a new contact is created' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email', fields: ['subject', 'body'] },
  { value: 'add_tag', label: 'Add Tag', fields: ['tag'] },
  { value: 'remove_tag', label: 'Remove Tag', fields: ['tag'] },
  { value: 'create_task', label: 'Create Task', fields: ['title', 'description', 'priority', 'dueDays'] },
  { value: 'change_lead_status', label: 'Change Lead Status', fields: ['status'] },
  { value: 'create_activity', label: 'Log Activity', fields: ['title', 'content'] },
];

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTrigger, setFormTrigger] = useState('form_submit');
  const [formFilters, setFormFilters] = useState<any[]>([]);
  const [formActions, setFormActions] = useState<any[]>([{ type: 'add_tag', tag: '' }]);

  const loadData = useCallback(async () => {
    try {
      const [automationsData, statsData] = await Promise.all([
        apiClient.get('/v1/crm/automations'),
        apiClient.get('/v1/crm/automations/stats'),
      ]);
      setAutomations(automationsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load automations', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!formName.trim()) return;
    try {
      const payload = {
        name: formName,
        triggerEvent: formTrigger,
        triggerFilters: formFilters.length > 0 ? formFilters : null,
        actions: formActions,
      };
      if (editingId) {
        await apiClient.put(`/v1/crm/automations/${editingId}`, payload);
      } else {
        await apiClient.post('/v1/crm/automations', payload);
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save automation', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this automation?')) return;
    try {
      await apiClient.delete(`/v1/crm/automations/${id}`);
      loadData();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await apiClient.post(`/v1/crm/automations/${id}/toggle`);
      loadData();
    } catch (err) {
      console.error('Failed to toggle', err);
    }
  };

  const handleEdit = (a: Automation) => {
    setEditingId(a.id);
    setFormName(a.name);
    setFormTrigger(a.triggerEvent);
    setFormFilters(a.triggerFilters || []);
    setFormActions(a.actions.length > 0 ? a.actions : [{ type: 'add_tag', tag: '' }]);
    setShowCreate(true);
  };

  const resetForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setFormName('');
    setFormTrigger('form_submit');
    setFormFilters([]);
    setFormActions([{ type: 'add_tag', tag: '' }]);
  };

  const addAction = () => setFormActions([...formActions, { type: 'add_tag', tag: '' }]);
  const removeAction = (i: number) => setFormActions(formActions.filter((_, idx) => idx !== i));

  const updateAction = (i: number, updates: Record<string, any>) => {
    const updated = [...formActions];
    updated[i] = { ...updated[i], ...updates };
    setFormActions(updated);
  };

  const addFilter = () => setFormFilters([...formFilters, { field: '', operator: 'equals', value: '' }]);
  const removeFilterItem = (i: number) => setFormFilters(formFilters.filter((_, idx) => idx !== i));

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading automations...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="text-sm text-gray-500 mt-1">Set up automatic actions triggered by CRM events</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: Zap, color: 'text-blue-600 bg-blue-50' },
            { label: 'Active', value: stats.active, icon: Power, color: 'text-green-600 bg-green-50' },
            { label: 'Executions', value: stats.totalExecutions, icon: Play, color: 'text-purple-600 bg-purple-50' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Automation' : 'New Automation'}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Tag new form leads"
            />
          </div>

          {/* Trigger */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">When this happens...</label>
            <select
              value={formTrigger}
              onChange={e => setFormTrigger(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              {TRIGGER_EVENTS.map(t => (
                <option key={t.value} value={t.value}>{t.label} — {t.description}</option>
              ))}
            </select>
          </div>

          {/* Trigger Filters */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Conditions (optional)</label>
            {formFilters.map((f, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  value={f.field}
                  onChange={e => { const u = [...formFilters]; u[i] = { ...u[i], field: e.target.value }; setFormFilters(u); }}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm flex-1"
                  placeholder="Field (e.g. siteOrigin)"
                />
                <select
                  value={f.operator}
                  onChange={e => { const u = [...formFilters]; u[i] = { ...u[i], operator: e.target.value }; setFormFilters(u); }}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                  <option value="gt">greater than</option>
                  <option value="lt">less than</option>
                </select>
                <input
                  value={f.value}
                  onChange={e => { const u = [...formFilters]; u[i] = { ...u[i], value: e.target.value }; setFormFilters(u); }}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm flex-1"
                  placeholder="Value"
                />
                <button onClick={() => removeFilterItem(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={addFilter} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              + Add condition
            </button>
          </div>

          {/* Actions */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Then do these actions...</label>
            {formActions.map((action, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={action.type}
                    onChange={e => updateAction(i, { type: e.target.value })}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  {formActions.length > 1 && (
                    <button onClick={() => removeAction(i)} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  )}
                </div>

                {/* Action-specific fields */}
                {action.type === 'send_email' && (
                  <div className="space-y-2">
                    <input value={action.subject || ''} onChange={e => updateAction(i, { subject: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" placeholder="Email subject" />
                    <textarea value={action.body || ''} onChange={e => updateAction(i, { body: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" rows={2} placeholder="Email body (supports {{firstName}}, {{lastName}}, etc.)" />
                  </div>
                )}
                {(action.type === 'add_tag' || action.type === 'remove_tag') && (
                  <input value={action.tag || ''} onChange={e => updateAction(i, { tag: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" placeholder="Tag name" />
                )}
                {action.type === 'create_task' && (
                  <div className="space-y-2">
                    <input value={action.title || ''} onChange={e => updateAction(i, { title: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" placeholder="Task title" />
                    <div className="flex gap-2">
                      <select value={action.priority || 'medium'} onChange={e => updateAction(i, { priority: e.target.value })}
                        className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white">
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input type="number" value={action.dueDays || 1} onChange={e => updateAction(i, { dueDays: parseInt(e.target.value) })}
                        className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-24" placeholder="Due in days" min={1} />
                      <span className="text-sm text-gray-500 self-center">days from trigger</span>
                    </div>
                  </div>
                )}
                {action.type === 'change_lead_status' && (
                  <select value={action.status || ''} onChange={e => updateAction(i, { status: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white">
                    <option value="">Select status...</option>
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                {action.type === 'create_activity' && (
                  <div className="space-y-2">
                    <input value={action.title || ''} onChange={e => updateAction(i, { title: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" placeholder="Activity title" />
                    <textarea value={action.content || ''} onChange={e => updateAction(i, { content: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" rows={2} placeholder="Activity content" />
                  </div>
                )}
              </div>
            ))}
            <button onClick={addAction} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              + Add action
            </button>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              onClick={handleSave}
              disabled={!formName.trim() || formActions.length === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {editingId ? 'Update Automation' : 'Create Automation'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {automations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600">No automations yet</h3>
          <p className="text-sm text-gray-400 mt-1">Create your first automation to automate CRM workflows</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map(a => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggle(a.id); }}
                  className={`p-1.5 rounded-md transition-colors ${a.isActive ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                >
                  {a.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{a.name}</h3>
                  <p className="text-xs text-gray-500">
                    Trigger: <span className="font-medium">{TRIGGER_EVENTS.find(t => t.value === a.triggerEvent)?.label || a.triggerEvent}</span>
                    {' · '}{a.actions.length} action{a.actions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Activity className="w-4 h-4" />
                  <span>{a.executionCount}</span>
                </div>
                {expandedId === a.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>

              {expandedId === a.id && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                  {a.triggerFilters && a.triggerFilters.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Conditions</h4>
                      <div className="flex flex-wrap gap-2">
                        {a.triggerFilters.map((f: any, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium">
                            {f.field} <span className="text-amber-400">{f.operator}</span> {String(f.value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Actions</h4>
                    <div className="space-y-1.5">
                      {a.actions.map((action: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md text-xs">
                          <Zap className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                          <span className="font-medium">{ACTION_TYPES.find(t => t.value === action.type)?.label || action.type}</span>
                          {action.tag && <span className="text-gray-500">"{action.tag}"</span>}
                          {action.subject && <span className="text-gray-500 truncate">"{action.subject}"</span>}
                          {action.title && <span className="text-gray-500 truncate">"{action.title}"</span>}
                          {action.status && <span className="text-gray-500">"{action.status}"</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(a); }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                  {a.lastTriggeredAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Last triggered: {new Date(a.lastTriggeredAt).toLocaleString()}
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
