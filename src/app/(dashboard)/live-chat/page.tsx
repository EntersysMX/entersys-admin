'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { SessionList } from './SessionList';
import { ChatPanel } from './ChatPanel';
import { TicketDialog } from './TicketDialog';

const WS_URL = 'https://api.entersys.mx/chat';

export interface ChatSession {
  id: string;
  visitorId: string;
  siteOrigin: string;
  status: string;
  leadName?: string | null;
  leadEmail?: string | null;
  leadPhone?: string | null;
  leadCompany?: string | null;
  funnelStage?: string;
  leadScore?: number;
  createdAt: string;
  transferredAt?: string | null;
  agentId?: string | null;
  messages?: { content: string; role: string; createdAt: string }[];
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  department: string;
  isAvailable: boolean;
  isOnline: boolean;
}

export default function LiveChatPage() {
  const user = useAuthStore((s) => s.user);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [waitingSessions, setWaitingSessions] = useState<ChatSession[]>([]);
  const [mySessions, setMySessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeDetail, setActiveDetail] = useState<ChatSession | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const notifSound = useRef<HTMLAudioElement | null>(null);

  // Initialize agent profile
  useEffect(() => {
    const init = async () => {
      try {
        const data = await apiClient.get<Agent>('/v1/chat/agent/me');
        setAgent(data);
        setIsAvailable(data.isAvailable);
      } catch (err) {
        toast.error('Error cargando perfil de agente');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Setup notification sound
  useEffect(() => {
    notifSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczGj2markup');
    // Use a simple beep — fallback approach
    notifSound.current = null;
  }, []);

  const playNotifSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not available
    }
  }, []);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiClient.get<{ waiting: ChatSession[]; mine: ChatSession[] }>(
        '/v1/chat/agent/sessions',
      );
      setWaitingSessions(data.waiting);
      setMySessions(data.mine);
    } catch {
      // silently fail
    }
  }, []);

  // Poll sessions
  useEffect(() => {
    if (!agent) return;
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [agent, fetchSessions]);

  // WebSocket connection
  useEffect(() => {
    if (!agent) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(WS_URL, {
      query: { role: 'agent', token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Agent WebSocket connected');
    });

    socket.on('new_transfer', (data) => {
      playNotifSound();
      toast('Nuevo chat pendiente', { icon: '🔔' });
      fetchSessions();
    });

    socket.on('message', (data) => {
      if (data.type === 'message' && data.senderRole === 'customer') {
        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            role: 'user',
            content: data.content,
            createdAt: data.createdAt,
          },
        ]);
      } else if (data.type === 'customer_disconnected') {
        toast('El visitante se ha desconectado', { icon: '⚠️' });
      }
    });

    socket.on('session_joined', (data) => {
      console.log('Joined session:', data.sessionId);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [agent, playNotifSound, fetchSessions]);

  // Select a session
  const selectSession = useCallback(
    async (sessionId: string) => {
      setActiveSessionId(sessionId);

      try {
        const [msgs, detail] = await Promise.all([
          apiClient.get<ChatMessage[]>(`/v1/chat/agent/sessions/${sessionId}/messages`),
          apiClient.get<ChatSession>(`/v1/chat/agent/sessions/${sessionId}`),
        ]);
        setMessages(msgs);
        setActiveDetail(detail);
      } catch {
        toast.error('Error cargando mensajes');
      }

      // Tell WS to join this session for real-time
      if (socketRef.current) {
        socketRef.current.emit('join_session', { sessionId });
      }
    },
    [],
  );

  // Accept a waiting session
  const acceptSession = useCallback(
    async (sessionId: string) => {
      try {
        await apiClient.post(`/v1/chat/agent/sessions/${sessionId}/accept`);
        toast.success('Sesión aceptada');
        await fetchSessions();
        selectSession(sessionId);
      } catch (err: any) {
        toast.error(err.message || 'Error aceptando sesión');
      }
    },
    [fetchSessions, selectSession],
  );

  // Send a message
  const sendMessage = useCallback(
    (content: string) => {
      if (!socketRef.current || !activeSessionId) return;

      socketRef.current.emit('message', { content });

      // Optimistic append
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          role: 'assistant',
          content,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [activeSessionId],
  );

  // Close a session
  const closeSession = useCallback(
    async (sessionId: string) => {
      if (!confirm('¿Cerrar esta conversación?')) return;

      try {
        await apiClient.post(`/v1/chat/agent/sessions/${sessionId}/close`);
        toast.success('Sesión cerrada');

        if (socketRef.current) {
          socketRef.current.emit('leave_session', { sessionId });
        }

        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setMessages([]);
          setActiveDetail(null);
        }

        await fetchSessions();
      } catch (err: any) {
        toast.error(err.message || 'Error cerrando sesión');
      }
    },
    [activeSessionId, fetchSessions],
  );

  // Toggle availability
  const toggleAvailability = useCallback(async () => {
    const newVal = !isAvailable;
    try {
      await apiClient.patch('/v1/chat/agent/me/status', { isAvailable: newVal });
      setIsAvailable(newVal);
      toast.success(newVal ? 'Ahora estás disponible' : 'No disponible');
    } catch {
      toast.error('Error cambiando disponibilidad');
    }
  }, [isAvailable]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-130px)]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat en Vivo</h1>
          <p className="text-sm text-gray-500">
            {agent?.department === 'support' ? 'Soporte Técnico' : 'Ventas'} — {agent?.name}
          </p>
        </div>

        <button
          onClick={toggleAvailability}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isAvailable
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          {isAvailable ? 'Disponible' : 'No disponible'}
        </button>
      </div>

      {/* Main content: 2-column layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Session list */}
        <SessionList
          waitingSessions={waitingSessions}
          mySessions={mySessions}
          activeSessionId={activeSessionId}
          onSelect={selectSession}
          onAccept={acceptSession}
        />

        {/* Right: Chat panel */}
        {activeSessionId && activeDetail ? (
          <ChatPanel
            session={activeDetail}
            messages={messages}
            onSend={sendMessage}
            onClose={() => closeSession(activeSessionId)}
            onCreateTicket={() => setShowTicketDialog(true)}
          />
        ) : (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg font-medium">Selecciona una conversación</p>
              <p className="text-sm mt-1">
                {waitingSessions.length > 0
                  ? `${waitingSessions.length} chat(s) pendiente(s)`
                  : 'No hay chats pendientes'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Ticket dialog */}
      {showTicketDialog && activeSessionId && (
        <TicketDialog
          sessionId={activeSessionId}
          session={activeDetail}
          messages={messages}
          onClose={() => setShowTicketDialog(false)}
        />
      )}
    </div>
  );
}
