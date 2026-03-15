'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, MessageCircle } from 'lucide-react';
import type { ChatSession } from './page';

interface SessionListProps {
  waitingSessions: ChatSession[];
  mySessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onAccept: (id: string) => void;
}

function getVisitorLabel(session: ChatSession): string {
  if (session.leadName) return session.leadName;
  if (session.leadEmail) return session.leadEmail;
  return `Visitante ${session.visitorId.slice(0, 8)}`;
}

function getLastMessage(session: ChatSession): string {
  if (!session.messages?.length) return 'Sin mensajes';
  return session.messages[0].content.slice(0, 80) + (session.messages[0].content.length > 80 ? '...' : '');
}

function getTimeAgo(date: string | null | undefined): string {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

function getSiteLabel(origin: string): string {
  if (origin.includes('seguridad')) return 'Seguridad';
  if (origin.includes('conectividad')) return 'Conectividad';
  if (origin.includes('soporte')) return 'Soporte';
  if (origin.includes('test')) return 'Test';
  return 'Principal';
}

export function SessionList({
  waitingSessions,
  mySessions,
  activeSessionId,
  onSelect,
  onAccept,
}: SessionListProps) {
  return (
    <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
      {/* Waiting / Pending */}
      <div className="px-4 py-3 border-b border-gray-100 bg-amber-50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            Pendientes ({waitingSessions.length})
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {waitingSessions.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No hay chats pendientes
          </div>
        )}

        {waitingSessions.map((session) => (
          <div
            key={session.id}
            className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
              activeSessionId === session.id ? 'bg-primary-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelect(session.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {getVisitorLabel(session)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{getLastMessage(session)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400">
                    {getSiteLabel(session.siteOrigin)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {getTimeAgo(session.transferredAt || session.createdAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept(session.id);
                }}
                className="ml-2 px-2.5 py-1 bg-primary-500 text-white text-xs font-medium rounded-md hover:bg-primary-600 transition-colors flex-shrink-0"
              >
                Aceptar
              </button>
            </div>
          </div>
        ))}

        {/* My active chats */}
        <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800">
              Mis Chats ({mySessions.length})
            </span>
          </div>
        </div>

        {mySessions.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            Sin chats activos
          </div>
        )}

        {mySessions.map((session) => (
          <div
            key={session.id}
            className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
              activeSessionId === session.id ? 'bg-primary-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelect(session.id)}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 truncate">
                {getVisitorLabel(session)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate">{getLastMessage(session)}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-400">
                {getSiteLabel(session.siteOrigin)}
              </span>
              <span className="text-[10px] text-gray-400">
                {getTimeAgo(session.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
