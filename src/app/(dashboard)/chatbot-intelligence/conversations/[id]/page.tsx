'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader,
  AlertCircle,
  Brain,
  Star,
  Send,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Bot,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'bot';
  content: string;
  timestamp: string;
}

interface SPINScores {
  situation: number;
  problem: number;
  implication: number;
  need_payoff: number;
}

interface Analysis {
  quality_score: number;
  spin_scores: SPINScores;
  sentiment: string;
  recommendations: string[];
}

interface FeedbackItem {
  id: string;
  rating: string;
  correction?: string;
  tags: string[];
  created_at: string;
  reviewer?: string;
}

interface ConversationDetail {
  id: string;
  created_at: string;
  message_count: number;
  funnel_stage: string | null;
  has_lead: boolean;
  lead_phone?: string;
  messages: Message[];
  analysis?: Analysis;
  feedbacks?: FeedbackItem[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const RATING_OPTIONS = [
  { value: 'excellent', label: 'Excelente', cls: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' },
  { value: 'good', label: 'Bueno', cls: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' },
  { value: 'needs_improvement', label: 'Necesita mejora', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200' },
  { value: 'bad', label: 'Malo', cls: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' },
];

const FEEDBACK_TAGS = [
  { value: 'missed_objection', label: 'Objecion perdida' },
  { value: 'wrong_info', label: 'Info incorrecta' },
  { value: 'good_close', label: 'Buen cierre' },
  { value: 'slow_response', label: 'Respuesta lenta' },
  { value: 'off_topic', label: 'Fuera de tema' },
];

function sentimentBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    positive: { label: 'Positivo', cls: 'bg-green-100 text-green-700' },
    neutral: { label: 'Neutral', cls: 'bg-gray-100 text-gray-600' },
    negative: { label: 'Negativo', cls: 'bg-red-100 text-red-700' },
  };
  return map[s] ?? { label: s, cls: 'bg-gray-100 text-gray-500' };
}

function ScoreGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.min(Math.max(value * 10, 0), 100);
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-semibold text-gray-700">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatTime(str: string) {
  return new Date(str).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatDatetime(str: string) {
  return new Date(str).toLocaleString('es-MX', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analyze
  const [analyzing, setAnalyzing] = useState(false);

  // Feedback form
  const [fbRating, setFbRating] = useState('');
  const [fbCorrection, setFbCorrection] = useState('');
  const [fbTags, setFbTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .get<ConversationDetail>(`/v1/chatbot-intelligence/conversations/${id}`)
      .then(setConv)
      .catch((err) => setError(err?.message || 'Error al cargar la conversacion'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await apiClient.post<ConversationDetail>(
        `/v1/chatbot-intelligence/conversations/${id}/analyze`,
      );
      setConv(result);
      toast.success('Analisis completado');
    } catch (err: any) {
      toast.error(err?.message || 'Error al analizar');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleTag = (tag: string) => {
    setFbTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmitFeedback = async () => {
    if (!fbRating) {
      toast.error('Selecciona una calificacion');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/v1/chatbot-intelligence/conversations/${id}/feedback`, {
        rating: fbRating,
        correction: fbCorrection || undefined,
        tags: fbTags,
      });
      toast.success('Feedback enviado');
      setFbRating('');
      setFbCorrection('');
      setFbTags([]);
      // Refresh
      const refreshed = await apiClient.get<ConversationDetail>(
        `/v1/chatbot-intelligence/conversations/${id}`,
      );
      setConv(refreshed);
    } catch (err: any) {
      toast.error(err?.message || 'Error al enviar feedback');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Loading / Error ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !conv) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error || 'Conversacion no encontrada'}</p>
        </div>
      </div>
    );
  }

  const analysis = conv.analysis;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Detalle de conversacion</h1>
          <p className="text-sm text-gray-500">
            {formatDatetime(conv.created_at)} · {conv.message_count} mensajes
            {conv.has_lead && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <User className="w-3 h-3" />
                Lead capturado
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Chat transcript */}
        <div className="flex-1 lg:w-[60%] bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
            <p className="text-sm font-medium text-gray-700">Transcripcion</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[600px]">
            {conv.messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No hay mensajes en esta conversacion</p>
            ) : (
              conv.messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                        isUser ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      {isUser ? (
                        <User className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-green-500 text-white rounded-tr-sm'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Analysis + Feedback */}
        <div className="lg:w-[40%] space-y-4">
          {/* Analysis Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Analisis IA</p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {analyzing ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Brain className="w-3.5 h-3.5" />
                )}
                Analizar con IA
              </button>
            </div>

            <div className="p-5">
              {analysis ? (
                <div className="space-y-4">
                  {/* Quality Score */}
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-500 mb-1">Score de calidad</p>
                    <p
                      className={`text-5xl font-bold ${
                        analysis.quality_score >= 80
                          ? 'text-green-600'
                          : analysis.quality_score >= 60
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {analysis.quality_score.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">de 100</p>
                  </div>

                  {/* SPIN Scores */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">SPIN Scores</p>
                    <ScoreGauge label="Situation" value={analysis.spin_scores.situation} />
                    <ScoreGauge label="Problem" value={analysis.spin_scores.problem} />
                    <ScoreGauge label="Implication" value={analysis.spin_scores.implication} />
                    <ScoreGauge label="Need-Payoff" value={analysis.spin_scores.need_payoff} />
                  </div>

                  {/* Sentiment */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">Sentimiento:</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sentimentBadge(analysis.sentiment).cls}`}>
                      {sentimentBadge(analysis.sentiment).label}
                    </span>
                  </div>

                  {/* Recommendations */}
                  {analysis.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Recomendaciones</p>
                      <ul className="space-y-1.5">
                        {analysis.recommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <RefreshCw className="w-3.5 h-3.5 text-primary-500 flex-shrink-0 mt-0.5" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Brain className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Sin analisis todavia</p>
                  <p className="text-xs text-gray-400 mt-1">Haz clic en "Analizar con IA" para generar</p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
              <p className="text-sm font-medium text-gray-700">Enviar feedback</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Rating */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Calificacion *</p>
                <div className="grid grid-cols-2 gap-2">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFbRating(opt.value)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        fbRating === opt.value
                          ? opt.cls + ' ring-2 ring-offset-1 ring-current'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Correction */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Que debio decir el bot?
                </label>
                <textarea
                  value={fbCorrection}
                  onChange={(e) => setFbCorrection(e.target.value)}
                  rows={3}
                  placeholder="Escribe aqui la respuesta correcta o sugerencia..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Etiquetas</p>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_TAGS.map((tag) => (
                    <button
                      key={tag.value}
                      onClick={() => toggleTag(tag.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                        fbTags.includes(tag.value)
                          ? 'bg-primary-100 border-primary-300 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {fbTags.includes(tag.value) ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3 opacity-40" />
                      )}
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmitFeedback}
                disabled={submitting || !fbRating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar feedback
              </button>
            </div>
          </div>

          {/* Previous Feedbacks */}
          {conv.feedbacks && conv.feedbacks.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <p className="text-sm font-medium text-gray-700">
                  Feedbacks anteriores ({conv.feedbacks.length})
                </p>
              </div>
              <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                {conv.feedbacks.map((fb) => {
                  const ratingOpt = RATING_OPTIONS.find((r) => r.value === fb.rating);
                  return (
                    <div key={fb.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        {ratingOpt && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ratingOpt.cls}`}>
                            {ratingOpt.label}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{formatDatetime(fb.created_at)}</span>
                      </div>
                      {fb.correction && (
                        <p className="text-xs text-gray-600 italic">"{fb.correction}"</p>
                      )}
                      {fb.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {fb.tags.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                              {FEEDBACK_TAGS.find((ft) => ft.value === t)?.label ?? t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
