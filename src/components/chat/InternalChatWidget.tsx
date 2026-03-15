'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Download, FileSpreadsheet, BarChart3, Trophy, CheckCircle2, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const API_URL = 'https://api.entersys.mx';

export function InternalChatWidget() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpenRef = useRef(isOpen);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
      oscillator.onended = () => ctx.close();
    } catch {
      // AudioContext not available or blocked — silently ignore
    }
  }, []);

  // Check if user has internal chat permission
  const hasAccess = user && ![
    'VISITOR', 'LEAD', 'MEMBER',
  ].includes(user.role);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const createSession = async (): Promise<string> => {
    if (sessionId) return sessionId;

    try {
      const response = await apiClient.post<{ id: string }>('/v1/internal-chat/sessions');
      setSessionId(response.id);
      return response.id;
    } catch (error) {
      console.error('Failed to create internal chat session:', error);
      throw error;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    const assistantMsgId = `resp-${Date.now()}`;

    try {
      const sid = await createSession();

      // Add empty assistant message that will be filled progressively
      setMessages((prev) => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      }]);

      await apiClient.postStream(
        `/v1/internal-chat/sessions/${sid}/messages/stream`,
        { content: userMessage },
        {
          onChunk: (text) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + text }
                  : m,
              ),
            );
          },
          onDone: () => {
            setIsLoading(false);
            if (!isOpenRef.current) {
              setUnreadCount((c) => c + 1);
              playBeep();
            }
          },
          onError: (errorMsg) => {
            console.error('Stream error:', errorMsg);
            setIsLoading(false);
          },
        },
      );
    } catch (error) {
      console.error('Stream failed, falling back to normal endpoint:', error);

      // Fallback: remove empty assistant msg and use normal endpoint
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));

      try {
        const sid = sessionId!;
        const response = await apiClient.post<{ content: string; meta: any }>(
          `/v1/internal-chat/sessions/${sid}/messages`,
          { content: userMessage },
        );

        setMessages((prev) => [...prev, {
          id: `fb-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          createdAt: new Date().toISOString(),
        }]);
      } catch (fallbackError) {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Error al enviar el mensaje. Intenta de nuevo.',
          createdAt: new Date().toISOString(),
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewSession = () => {
    setSessionId(null);
    setMessages([]);
  };

  const downloadExcel = async (reportType: 'invoices' | 'clients' | 'products') => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_URL}/v1/internal-chat/reports/${reportType}/excel`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Excel download failed:', error);
    }
  };

  if (!hasAccess) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-105 flex items-center justify-center"
          title="Asistente ENTERSYS"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[440px] h-[580px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <div>
                <h3 className="font-semibold text-sm">ENTERSYS Intelligence</h3>
                <p className="text-[10px] text-primary-200">Asistente central de operaciones</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href="/gamification"
                className="p-1.5 rounded-lg transition-colors text-xs hover:bg-primary-700"
                title="Gamificacion"
              >
                <Trophy className="w-4 h-4" />
              </a>
              <button
                onClick={() => setShowReports(!showReports)}
                className={`p-1.5 rounded-lg transition-colors text-xs ${showReports ? 'bg-primary-700' : 'hover:bg-primary-700'}`}
                title="Reportes y descargas"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                onClick={startNewSession}
                className="p-1.5 hover:bg-primary-700 rounded-lg transition-colors text-xs"
                title="Nueva conversacion"
              >
                +
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reports Panel */}
          {showReports && (
            <div className="bg-gray-50 border-b border-gray-200 p-3 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-700 mb-2">Descargar Reportes en Excel</p>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadExcel('invoices')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Facturas
                </button>
                <button
                  onClick={() => downloadExcel('clients')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Clientes
                </button>
                <button
                  onClick={() => downloadExcel('products')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Productos
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm mt-8">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Hola{user?.firstName ? `, ${user.firstName}` : ''}.</p>
                <p className="mt-1">Soy tu asistente de inteligencia de ENTERSYS.</p>
                <p className="mt-1 text-xs text-gray-400">
                  Tengo acceso a datos de {getRoleContext(user?.role || '')}. Preguntame lo que necesites.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {getSuggestedQuestions(user?.role || '').map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(q); }}
                      className="px-3 py-1.5 text-xs bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`px-3 py-2 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'max-w-[85%] bg-primary-600 text-white rounded-br-sm'
                      : 'max-w-[95%] bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-1 prose-table:my-1 prose-ul:my-1 prose-li:my-0.5">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-2 rounded-lg border border-gray-300 bg-white shadow-sm">
                              <table className="min-w-full text-xs border-collapse">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-primary-600 text-white">{children}</thead>
                          ),
                          th: ({ children }) => (
                            <th className="px-3 py-1.5 font-semibold text-left text-[11px] text-white whitespace-nowrap border-r border-primary-500 last:border-r-0">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-3 py-1.5 border-t border-gray-200 text-[11px] text-gray-700 whitespace-nowrap border-r border-gray-100 last:border-r-0">
                              {children}
                            </td>
                          ),
                          tr: ({ children, ...props }) => {
                            // Zebra striping via CSS even/odd
                            return (
                              <tr className="even:bg-gray-50 hover:bg-primary-50 transition-colors">
                                {children}
                              </tr>
                            );
                          },
                          img: ({ src, alt }) => (
                            <img
                              src={src}
                              alt={alt || 'Chart'}
                              className="rounded-lg border border-gray-200 my-2 max-w-full cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => src && window.open(src, '_blank')}
                            />
                          ),
                          a: ({ href, children }) => {
                            const isSheet = href?.includes('docs.google.com/spreadsheets');
                            const isDoc = href?.includes('docs.google.com/document');
                            if (isSheet) {
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 my-2 bg-green-50 border border-green-200 rounded-lg text-green-700 hover:bg-green-100 transition-colors no-underline text-xs font-medium"
                                >
                                  <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                                  <span className="flex-1">{children}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              );
                            }
                            if (isDoc) {
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 my-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors no-underline text-xs font-medium"
                                >
                                  <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                                  <span className="flex-1">{children}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              );
                            }
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline hover:text-primary-800">
                                {children}
                              </a>
                            );
                          },
                          hr: () => <hr className="my-3 border-gray-200" />,
                          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getRoleContext(role: string): string {
  const contexts: Record<string, string> = {
    SALES_AGENT: 'portafolio, servicios, clientes y casos de exito',
    SALES_SUPERVISOR: 'ventas, equipo, portafolio y rendimiento',
    SALES_MANAGER: 'estrategia comercial, analytics y facturacion',
    COMPRAS: 'facturas, clientes, productos, ordenes y proveedores',
    SOPORTE_TECNICO: 'soporte tecnico, procedimientos y SLAs',
    GERENTE_SOPORTE: 'metricas de soporte, equipo y tendencias',
    CHOFER: 'entregas, rutas, direcciones y logistica',
    RRHH: 'politicas, procesos internos y directorio',
    CONTENT_EDITOR: 'contenido, marca y guias de estilo',
    CONTENT_ADMIN: 'estrategia de contenido y analytics',
    DIRECTOR: 'toda la operacion: ventas, facturas, clientes, productos, logistica',
    PLATFORM_ADMIN: 'la plataforma, sistemas, facturacion y datos completos',
    SUPER_ADMIN: 'todo el sistema sin restricciones',
  };
  return contexts[role] || 'tu area de trabajo';
}

function getSuggestedQuestions(role: string): string[] {
  const gamificationQ = ['Mis puntos', 'Leaderboard'];
  const suggestions: Record<string, string[]> = {
    SALES_AGENT: ['Servicios ENTERSYS', 'Portafolio completo', ...gamificationQ],
    SALES_SUPERVISOR: ['Resumen de ventas', 'Top clientes', ...gamificationQ],
    SALES_MANAGER: ['Facturacion de este mes', 'Graficame las ventas', ...gamificationQ],
    COMPRAS: ['Facturas de hoy', 'Grafica de facturas', ...gamificationQ],
    SOPORTE_TECNICO: ['Procedimientos tecnicos', 'SLAs activos', ...gamificationQ],
    GERENTE_SOPORTE: ['Metricas del equipo', 'Tendencias de soporte', ...gamificationQ],
    CHOFER: ['Mis entregas de hoy', 'Rutas pendientes', ...gamificationQ],
    RRHH: ['Politicas internas', 'Procesos de RRHH', ...gamificationQ],
    DIRECTOR: ['Analisis de ventas', 'Genera un video de ventas', 'Genera un documento', ...gamificationQ],
    SUPER_ADMIN: ['Reporte ejecutivo', 'Genera un video operativo', 'Genera un documento', ...gamificationQ],
    PLATFORM_ADMIN: ['Analisis del sistema', 'Genera un video de clientes', ...gamificationQ],
  };
  return suggestions[role] || ['Ayuda', ...gamificationQ];
}
