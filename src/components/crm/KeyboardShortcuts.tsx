'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Keyboard } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Shortcut definitions                                               */
/* ------------------------------------------------------------------ */

const SHORTCUTS = [
  { chord: 'g d', label: 'Dashboard', href: '/crm/dashboard' },
  { chord: 'g c', label: 'Contactos', href: '/crm/contacts' },
  { chord: 'g e', label: 'Empresas', href: '/crm/companies' },
  { chord: 'g p', label: 'Pipeline / Deals', href: '/crm/deals' },
  { chord: 'g t', label: 'Tareas', href: '/crm/tasks' },
  { chord: 'g f', label: 'Segmentos', href: '/crm/segments' },
  { chord: 'g a', label: 'Automations', href: '/crm/automations' },
  { chord: 'g s', label: 'Settings', href: '/crm/settings' },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeyRef = useRef<string | null>(null);

  const isInputFocused = useCallback(() => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if ((document.activeElement as HTMLElement)?.isContentEditable) return true;
    return false;
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if modifier keys (except shift for ?) or input focused
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInputFocused()) return;

      const key = e.key.toLowerCase();

      // Show help modal on ?
      if (e.key === '?') {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Escape closes help
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
        return;
      }

      // Chord: first key "g"
      if (key === 'g' && !pendingKeyRef.current) {
        e.preventDefault();
        pendingKeyRef.current = 'g';
        // 1-second window for second key
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        chordTimerRef.current = setTimeout(() => {
          pendingKeyRef.current = null;
        }, 1000);
        return;
      }

      // Chord: second key after "g"
      if (pendingKeyRef.current === 'g') {
        const match = SHORTCUTS.find(
          (s) => s.chord === `g ${key}`,
        );
        if (match) {
          e.preventDefault();
          router.push(match.href);
        }
        // Reset chord regardless
        pendingKeyRef.current = null;
        if (chordTimerRef.current) {
          clearTimeout(chordTimerRef.current);
          chordTimerRef.current = null;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    };
  }, [router, isInputFocused, showHelp]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setShowHelp(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">
              Atajos de teclado
            </h2>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Shortcut list */}
        <div className="px-5 py-4 space-y-4">
          {/* Navigation shortcuts */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Navegacion
            </h3>
            <div className="space-y-2">
              {SHORTCUTS.map((s) => {
                const [first, second] = s.chord.split(' ');
                return (
                  <div
                    key={s.chord}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700">{s.label}</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 font-mono text-xs">
                        {first}
                      </kbd>
                      <span className="text-xs text-gray-300">then</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 font-mono text-xs">
                        {second}
                      </kbd>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Other shortcuts */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              General
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Buscar (Command Palette)</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 font-mono text-xs">
                    &#8984;
                  </kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 font-mono text-xs">
                    K
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Mostrar atajos</span>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 font-mono text-xs">
                  ?
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center px-4 py-2.5 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-400">
            Presiona{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-mono text-[10px]">
              Esc
            </kbd>{' '}
            para cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
