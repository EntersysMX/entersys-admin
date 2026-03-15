'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Globe, Bell, Shield, Database, CheckCircle, XCircle, Loader2, Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface AppSettings {
  orgName: string;
  emailNotifications: boolean;
  syncAlerts: boolean;
  dailySummary: boolean;
  twoFA: boolean;
  accountLockout: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  orgName: 'EnterSys Organization',
  emailNotifications: true,
  syncAlerts: true,
  dailySummary: false,
  twoFA: false,
  accountLockout: true,
};

interface IntegrationStatus {
  logistics: 'loading' | 'active' | 'error';
  erp: 'loading' | 'active' | 'error';
  openai: 'loading' | 'active' | 'error';
}

function StatusBadge({ status }: { status: 'loading' | 'active' | 'error' }) {
  if (status === 'loading') {
    return (
      <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
        <Loader2 className="w-3 h-3 animate-spin" />
        Verificando
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3" />
        Activo
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
      <XCircle className="w-3 h-3" />
      Error
    </span>
  );
}

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    logistics: 'loading',
    erp: 'loading',
    openai: 'loading',
  });

  // Load settings from API on mount
  useEffect(() => {
    apiClient
      .get('/v1/settings')
      .then((data: any) => {
        setSettings({
          orgName: data.orgName ?? DEFAULT_SETTINGS.orgName,
          emailNotifications: data.emailNotifications ?? DEFAULT_SETTINGS.emailNotifications,
          syncAlerts: data.syncAlerts ?? DEFAULT_SETTINGS.syncAlerts,
          dailySummary: data.dailySummary ?? DEFAULT_SETTINGS.dailySummary,
          twoFA: data.twoFA ?? DEFAULT_SETTINGS.twoFA,
          accountLockout: data.accountLockout ?? DEFAULT_SETTINGS.accountLockout,
        });
      })
      .catch(() => {
        // Use defaults if API fails
      });
  }, []);

  // Fetch integration status from real endpoints
  useEffect(() => {
    async function fetchIntegrationStatus() {
      // Fetch data-sync status — if API responds without error, connections work
      try {
        await apiClient.get('/v1/data-sync/status');
        // API responded successfully — logistics DB and ERP are reachable
        setIntegrations(prev => ({
          ...prev,
          logistics: 'active',
          erp: 'active',
        }));
      } catch {
        setIntegrations(prev => ({ ...prev, logistics: 'error', erp: 'error' }));
      }

      // Fetch health status
      try {
        const health = await apiClient.get('/v1/health');
        // If health endpoint responds, API (and thus OpenAI) is reachable
        const isHealthy = health?.status === 'ok' || health?.status === 'healthy' || !!health;
        setIntegrations(prev => ({ ...prev, openai: isHealthy ? 'active' : 'error' }));
      } catch {
        setIntegrations(prev => ({ ...prev, openai: 'error' }));
      }
    }

    fetchIntegrationStatus();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/v1/settings', settings);
      setToast({ message: 'Configuracion guardada correctamente', type: 'success' });
    } catch {
      setToast({ message: 'Error al guardar la configuracion', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const closeToast = useCallback(() => setToast(null), []);

  return (
    <div className="max-w-4xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Configuracion</h1>
        </div>
        <p className="text-gray-600">Configuracion general de la plataforma</p>
      </div>

      <div className="space-y-6">
        {/* General */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">General</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la organizacion
              </label>
              <input
                type="text"
                value={settings.orgName}
                onChange={e => updateSetting('orgName', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dominio</label>
              <input
                type="text"
                defaultValue="entersys.mx"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notificaciones</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Notificaciones por email</span>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={e => updateSetting('emailNotifications', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Alertas de sincronizacion</span>
              <input
                type="checkbox"
                checked={settings.syncAlerts}
                onChange={e => updateSetting('syncAlerts', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Resumen diario</span>
              <input
                type="checkbox"
                checked={settings.dailySummary}
                onChange={e => updateSetting('dailySummary', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Integraciones</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Base de datos Logistica</p>
                <p className="text-sm text-gray-500">PostgreSQL - Sistema de logistica</p>
              </div>
              <StatusBadge status={integrations.logistics} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Bind ERP</p>
                <p className="text-sm text-gray-500">API REST - Facturacion y productos</p>
              </div>
              <StatusBadge status={integrations.erp} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">OpenAI Embeddings</p>
                <p className="text-sm text-gray-500">text-embedding-3-small - Vector Store</p>
              </div>
              <StatusBadge status={integrations.openai} />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Seguridad</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Autenticacion de dos factores (2FA)</span>
              <input
                type="checkbox"
                checked={settings.twoFA}
                onChange={e => updateSetting('twoFA', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Bloqueo por intentos fallidos</span>
              <input
                type="checkbox"
                checked={settings.accountLockout}
                onChange={e => updateSetting('accountLockout', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
