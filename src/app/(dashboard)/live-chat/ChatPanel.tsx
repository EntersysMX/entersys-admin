'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Ticket, X, User, Globe, Phone, Mail, Building } from 'lucide-react';
import type { ChatSession, ChatMessage } from './page';

interface ChatPanelProps {
  session: ChatSession;
  messages: ChatMessage[];
  onSend: (content: string) => void;
  onClose: () => void;
  onCreateTicket: () => void;
}

function getVisitorLabel(session: ChatSession): string {
  if (session.leadName) return session.leadName;
  if (session.leadEmail) return session.leadEmail;
  return `Visitante ${session.visitorId.slice(0, 8)}`;
}

export function ChatPanel({ session, messages, onSend, onClose, onCreateTicket }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on session change
  useEffect(() => {
    inputRef.current?.focus();
  }, [session.id]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">{getVisitorLabel(session)}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {session.siteOrigin}
            </span>
            {session.leadEmail && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {session.leadEmail}
              </span>
            )}
            {session.leadPhone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {session.leadPhone}
              </span>
            )}
            {session.leadCompany && (
              <span className="flex items-center gap-1">
                <Building className="w-3 h-3" />
                {session.leadCompany}
              </span>
            )}
          </div>
        </div>

        {session.leadScore !== undefined && session.leadScore > 0 && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
            Score: {session.leadScore}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg) => {
          const isAgent = msg.role === 'assistant';
          const isSystem = msg.role === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                  isAgent
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${isAgent ? 'text-green-100' : 'text-gray-400'}`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input + Actions */}
      <div className="border-t border-gray-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onCreateTicket}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Ticket className="w-3.5 h-3.5" />
            Crear Ticket
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cerrar Chat
          </button>
        </div>
      </div>
    </div>
  );
}
