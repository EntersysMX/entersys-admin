'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import type { ChatSession, ChatMessage } from './page';

interface TicketDialogProps {
  sessionId: string;
  session: ChatSession | null;
  messages: ChatMessage[];
  onClose: () => void;
}

function buildDefaultDescription(session: ChatSession | null, messages: ChatMessage[]): string {
  const lines: string[] = [];

  if (session?.leadName) lines.push(`Cliente: ${session.leadName}`);
  if (session?.leadEmail) lines.push(`Email: ${session.leadEmail}`);
  if (session?.leadPhone) lines.push(`Teléfono: ${session.leadPhone}`);
  if (session?.leadCompany) lines.push(`Empresa: ${session.leadCompany}`);
  if (session?.siteOrigin) lines.push(`Origen: ${session.siteOrigin}`);
  lines.push('');
  lines.push('--- Resumen de conversación ---');

  // Include the last 10 customer messages
  const userMsgs = messages
    .filter((m) => m.role === 'user')
    .slice(-10);

  for (const msg of userMsgs) {
    const time = new Date(msg.createdAt).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
    lines.push(`[${time}] Visitante: ${msg.content}`);
  }

  return lines.join('\n');
}

function buildDefaultTitle(session: ChatSession | null, messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (firstUserMsg) {
    const short = firstUserMsg.content.slice(0, 60);
    return `Chat: ${short}${firstUserMsg.content.length > 60 ? '...' : ''}`;
  }
  const label = session?.leadName || session?.visitorId?.slice(0, 8) || 'Visitante';
  return `Solicitud de chat - ${label}`;
}

export function TicketDialog({ sessionId, session, messages, onClose }: TicketDialogProps) {
  const [title, setTitle] = useState(() => buildDefaultTitle(session, messages));
  const [description, setDescription] = useState(() => buildDefaultDescription(session, messages));
  const [urgency, setUrgency] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Título y descripción son requeridos');
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiClient.post<{ id: number; message: string }>(
        `/v1/chat/agent/sessions/${sessionId}/ticket`,
        { title, description, urgency },
      );
      toast.success(`Ticket #${result.id} creado exitosamente`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error creando ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Crear Ticket GLPI</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgencia</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={1}>Muy baja</option>
              <option value={2}>Baja</option>
              <option value={3}>Media</option>
              <option value={4}>Alta</option>
              <option value={5}>Muy alta</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creando...' : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
