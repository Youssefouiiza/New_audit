'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Brain, Download, FileText, AlertTriangle,
  CheckCircle, Clock, Shield, BookOpen, Loader2, RefreshCw
} from 'lucide-react';

const RAG_API = 'http://localhost:8000';

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  CRITICAL: { label: 'CRITIQUE', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  HIGH:     { label: 'ÉLEVÉ',    color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  MEDIUM:   { label: 'MODÉRÉ',   color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  LOW:      { label: 'FAIBLE',   color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

const SEV_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CRITICAL: { label: 'Critique', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-400' },
  HIGH:     { label: 'Élevé',   icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-400' },
  MEDIUM:   { label: 'Modéré',  icon: <Clock className="h-4 w-4" />, color: 'text-yellow-400' },
  LOW:      { label: 'Faible',  icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-400' },
};

export default function AnalysePage() {
  useAuth();
  const { id } = useParams() as { id: string };
  const [audit, setAudit] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [ragHealth, setRagHealth] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    checkRagHealth();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  const loadData = async () => {
    try {
      const [a, d] = await Promise.all([
        apiFetch(`/api/audits/${id}`),
        apiFetch(`/api/documents/audit/${id}`),
      ]);
      setAudit(a);
      setDocs(Array.isArray(d) ? d : []);
    } catch (e: any) { toast.error(e.message); }
  };

  const checkRagHealth = async () => {
    try {
      const res = await fetch(`${RAG_API}/health`);
      if (res.ok) setRagHealth(await res.json());
    } catch { setRagHealth(null); }
  };

  const startAnalysis = async () => {
    if (!ragHealth) {
      toast.error("Le service RAG n'est pas démarré. Lancez : python rag_api_service.py");
      return;
    }
    setStatus('loading');
    setResult(null);
    setErrorMsg('');

    try {
      setStep('Préparation des documents…');

      const documentUrls = docs.map(doc => ({
        filename: doc.fileName,
        download_url: doc.downloadUrl,
        doc_id: doc.id,
      }));

      setStep('Envoi au service RAG…');
      const payload = {
        audit_id: id,
        audit_title: audit?.title || 'Audit',
        audit_description: audit?.description || '',
        document_urls: documentUrls,
        document_texts: [],
        model: 'mistral',
      };

      const res = await fetch(`${RAG_API}/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Erreur RAG : ${res.status}`);
      setStatus('running');
      setStep('Téléchargement et analyse des documents par le RAG…');

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`${RAG_API}/analyse/${id}/status`);
          const data = await statusRes.json();
          if (data.status === 'done') {
            clearInterval(pollRef.current!);
            setResult(data.result);
            setStatus('done');
            toast.success('✅ Analyse terminée !');
          } else if (data.status === 'error') {
            clearInterval(pollRef.current!);
            setErrorMsg(data.error || 'Erreur inconnue');
            setStatus('error');
          }
        } catch {}
      }, 2000);

    } catch (e: any) {
      setStatus('error');
      setErrorMsg((e as Error).message);
    }
  };

  const downloadReport = () => {
    window.open(`${RAG_API}/report/${id}/download`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      <AnalyseHeader audit={audit} id={id} />
      <RagStatusBanner health={ragHealth} onRefresh={checkRagHealth} />
      <DocumentsList docs={docs} />
      
      <MainAction
        status={status}
        ragHealth={ragHealth}
        errorMsg={errorMsg}
        step={step}
        onStart={startAnalysis}
      />

      <AnalyseResults
        status={status}
        result={result}
        id={id}
        onStart={startAnalysis}
        onDownload={downloadReport}
      />
    </div>
  );
}

// ── Sous-composants pour réduire la complexité ────────────────

function AnalyseHeader({ audit, id }: { audit: any; id: string }) {
  return (
    <div className="flex items-center gap-4">
      <Link href={`/audit/${id}`}
        className="h-10 w-10 glass rounded-xl flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex-shrink-0">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
          <Brain className="h-6 w-6 text-indigo-400" />
          Analyse RAG Juridique Marocaine
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {audit?.title || '…'} — Comparaison avec le droit marocain (base locale)
        </p>
      </div>
    </div>
  );
}

function RagStatusBanner({ health, onRefresh }: { health: any; onRefresh: () => void }) {
  const isOk = !!health;
  return (
    <div className={`glass rounded-2xl p-4 border flex items-center gap-4 ${isOk ? 'border-green-500/20' : 'border-red-500/20'}`}>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOk ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
        <Shield className={`h-5 w-5 ${isOk ? 'text-green-400' : 'text-red-400'}`} />
      </div>
      <div className="flex-1">
        <p className={`font-medium text-sm ${isOk ? 'text-green-400' : 'text-red-400'}`}>
          {isOk ? '✅ Service RAG connecté' : '❌ Service RAG non disponible'}
        </p>
        {isOk ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            Base : {health.chunks_indexed.toLocaleString()} chunks indexés •
            Modèles : {health.models_available?.join(', ')}
          </p>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">
            Lancez : <code className="bg-[var(--muted)] px-1 rounded">cd audit_rag_maroc && python rag_api_service.py</code>
          </p>
        )}
      </div>
      <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
        <RefreshCw className="h-4 w-4 text-[var(--muted-foreground)]" />
      </button>
    </div>
  );
}

function DocumentsList({ docs }: { docs: any[] }) {
  return (
    <div className="glass rounded-2xl p-5 border border-[var(--border)]">
      <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2 mb-3">
        <FileText className="h-5 w-5 text-blue-400" /> Documents à analyser ({docs.length})
      </h2>
      {docs.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Aucun document uploadé sur cet audit.</p>
      ) : (
        <div className="space-y-2">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2 bg-[var(--muted)]/40 rounded-xl">
              <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <span className="text-sm text-[var(--foreground)] flex-1">{d.fileName}</span>
              <span className="text-xs text-[var(--muted-foreground)]">{(d.fileSize / 1024).toFixed(1)} KB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MainAction({ status, ragHealth, errorMsg, step, onStart }: any) {
  if (status === 'loading' || status === 'running') {
    return (
      <div className="glass rounded-2xl p-10 flex flex-col items-center gap-5 border border-indigo-500/20">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <Brain className="h-10 w-10 text-indigo-400" />
          </div>
          <Loader2 className="h-20 w-20 text-indigo-400 absolute inset-0 animate-spin opacity-30" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-[var(--foreground)] text-lg">Analyse en cours…</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{step}</p>
          <p className="text-xs text-[var(--muted-foreground)]/60 mt-2">
            Interrogation de la base juridique marocaine via RAG + génération du rapport Word
          </p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (status === 'idle' || status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        {status === 'error' && (
          <div className="w-full glass rounded-xl p-4 border border-red-500/20 text-red-400 text-sm">
            ❌ Erreur : {errorMsg}
          </div>
        )}
        <button
          onClick={onStart}
          disabled={!ragHealth}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-base font-semibold hover:opacity-90 transition-all shadow-xl shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Brain className="h-5 w-5" />
          Lancer l&apos;analyse juridique RAG
        </button>
        <p className="text-xs text-[var(--muted-foreground)] text-center max-w-md">
          L&apos;analyse compare les documents avec la base de droit marocain (10 domaines juridiques)
          et génère un rapport Word téléchargeable.
        </p>
      </div>
    );
  }

  return null;
}

function AnalyseResults({ status, result, id, onStart, onDownload }: any) {
  if (status !== 'done' || !result) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {result.no_documents && <NoDocumentsResult result={result} id={id} onDownload={onDownload} />}
      {result.ollama_required && <OllamaRequiredResult result={result} onStart={onStart} />}
      {!result.no_documents && !result.ollama_required && (
        <NormalResults result={result} onStart={onStart} onDownload={onDownload} />
      )}
    </div>
  );
}

function NoDocumentsResult({ result, id, onDownload }: any) {
  return (
    <div className="glass rounded-2xl p-8 border border-orange-500/20 flex flex-col items-center gap-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
        <FileText className="h-8 w-8 text-orange-400" />
      </div>
      <div>
        <p className="font-semibold text-lg text-orange-400">Documents requis</p>
        <p className="text-sm text-[var(--muted-foreground)] mt-2 max-w-md">{result.summary}</p>
      </div>
      <Link href={`/audit/${id}`}
        className="flex items-center gap-2 px-6 py-3 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl text-sm font-medium hover:bg-orange-500/30 transition-all">
        <ArrowLeft className="h-4 w-4" /> Retour à l&apos;audit pour uploader des documents
      </Link>
      {result.report_filename && (
        <button onClick={onDownload} className="text-xs text-[var(--muted-foreground)] underline">
          Télécharger rapport (vide)
        </button>
      )}
    </div>
  );
}

function OllamaRequiredResult({ result, onStart }: any) {
  return (
    <div className="glass rounded-2xl p-8 border border-yellow-500/20 flex flex-col items-center gap-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
        <Brain className="h-8 w-8 text-yellow-400" />
      </div>
      <div>
        <p className="font-semibold text-lg text-yellow-400">Ollama LLM requis</p>
        <p className="text-sm text-[var(--muted-foreground)] mt-2 max-w-md">{result.summary}</p>
      </div>
      <div className="w-full max-w-lg space-y-2 text-left">
        {result.recommandations?.map((r: any, i: number) => (
          <div key={i} className="flex gap-3 bg-[var(--muted)]/30 rounded-xl p-3">
            <span className="text-yellow-400 flex-shrink-0">⚡</span>
            <div>
              <p className="text-sm text-[var(--foreground)]">{r.action}</p>
              {r.reference && (
                <a href={r.reference} target="_blank" rel="noreferrer"
                  className="text-xs text-indigo-400 underline mt-0.5 block">{r.reference}</a>
              )}
            </div>
          </div>
        ))}
      </div>
      <button onClick={onStart}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all">
        <RefreshCw className="h-4 w-4" /> Réessayer (une fois Ollama lancé)
      </button>
    </div>
  );
}

function NormalResults({ result, onStart, onDownload }: any) {
  const risk = RISK_CONFIG[result.risk_level] || RISK_CONFIG.LOW;
  return (
    <>
      <div className="glass rounded-2xl p-6 border border-[var(--border)] flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className={`text-5xl font-bold ${risk.color}`}>{result.risk_score}</div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Score de Risque Juridique</p>
            <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-sm font-bold ${risk.bg} ${risk.color} border ${risk.border}`}>
              {risk.label}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-40">
          <div className="h-3 w-full rounded-full bg-[var(--muted)]">
            <div className={`h-3 rounded-full transition-all ${result.risk_score > 70 ? 'bg-red-500' : result.risk_score > 40 ? 'bg-orange-500' : result.risk_score > 20 ? 'bg-yellow-500' : 'bg-green-500'
              }`} style={{ width: `${result.risk_score}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          <span className="text-xs text-[var(--muted-foreground)]">Modèle : {result.model_used}</span>
          {result.report_filename && (
            <button onClick={onDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-green-500/20">
              <Download className="h-4 w-4" /> Télécharger Rapport Word
            </button>
          )}
          <button onClick={onStart}
            className="flex items-center gap-2 px-4 py-2.5 glass border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] hover:border-indigo-500 transition-all">
            <RefreshCw className="h-4 w-4" /> Relancer
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-[var(--border)]">
        <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-indigo-400" /> Résumé de l&apos;analyse
        </h2>
        <p className="text-sm text-[var(--foreground)] leading-relaxed">{result.summary}</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" /> Non-conformités détectées
          </h2>
          <span className={`text-sm font-bold px-3 py-1 rounded-lg ${result.violations?.length ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
            }`}>
            {result.violations?.length || 0} violation(s)
          </span>
        </div>
        <div className="p-5 space-y-4">
          {!result.violations?.length ? (
            <div className="flex items-center gap-3 py-6 justify-center text-green-400">
              <CheckCircle className="h-6 w-6" />
              <p>Aucune non-conformité détectée ✅</p>
            </div>
          ) : result.violations.map((v: any, i: number) => (
            <ViolationCard key={i} v={v} />
          ))}
        </div>
      </div>

      {result.sources?.length > 0 && <SourcesList sources={result.sources} />}
      {result.recommandations?.length > 0 && <RecommendationsList recommendations={result.recommandations} />}

      <div className={`glass rounded-2xl p-5 border ${risk.border}`}>
        <h2 className={`font-semibold flex items-center gap-2 mb-2 ${risk.color}`}>
          <Shield className="h-5 w-5" /> Conclusion
        </h2>
        <p className="text-sm text-[var(--foreground)] leading-relaxed">{result.conclusion}</p>
      </div>

      {result.report_filename && (
        <div className="flex justify-center pt-2">
          <button onClick={onDownload}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl text-base font-semibold hover:opacity-90 transition-all shadow-xl shadow-green-500/25">
            <Download className="h-5 w-5" /> Télécharger le Rapport Word Complet
          </button>
        </div>
      )}
    </>
  );
}

function ViolationCard({ v }: { v: any }) {
  const sc = SEV_CONFIG[v.severite] || SEV_CONFIG.MEDIUM;
  return (
    <div className="bg-[var(--muted)]/40 rounded-xl p-4 border border-[var(--border)]/50 space-y-2">
      <div className="flex items-center gap-2">
        <span className={sc.color}>{sc.icon}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${sc.color} bg-current/10`}>{sc.label}</span>
        <p className="font-semibold text-sm text-[var(--foreground)]">{v.titre}</p>
      </div>
      {v.texte_original && (
        <p className="text-xs text-[var(--muted-foreground)]">
          <span className="font-medium">Texte : </span>{v.texte_original}
        </p>
      )}
      {v.citation && (
        <p className="text-xs text-indigo-300 italic border-l-2 border-indigo-500/40 pl-2">
          &ldquo;{v.citation}&rdquo;
        </p>
      )}
      {v.source && (
        <p className="text-xs text-[var(--muted-foreground)]/70">
          📍 Source : {v.source} {v.categorie && `— ${v.categorie}`}
        </p>
      )}
    </div>
  );
}

function SourcesList({ sources }: { sources: any[] }) {
  return (
    <div className="glass rounded-2xl p-5 border border-[var(--border)]">
      <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-blue-400" />
        Sources juridiques marocaines consultées ({sources.length})
      </h2>
      <div className="space-y-3">
        {sources.map((s: any, i: number) => (
          <div key={i} className="bg-[var(--muted)]/30 rounded-xl p-3 border border-[var(--border)]/40">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <p className="font-medium text-sm text-[var(--foreground)]">{s.fichier}</p>
              {s.categorie && (
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded ml-auto">{s.categorie}</span>
              )}
            </div>
            {s.extrait && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1 ml-6 italic">&ldquo;{s.extrait}&rdquo;</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendationsList({ recommendations }: { recommendations: any[] }) {
  return (
    <div className="glass rounded-2xl p-5 border border-[var(--border)]">
      <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2 mb-4">
        <CheckCircle className="h-5 w-5 text-green-400" /> Recommandations
      </h2>
      <div className="space-y-3">
        {recommendations.map((r: any, i: number) => (
          <div key={i} className="flex gap-3 bg-[var(--muted)]/30 rounded-xl p-3">
            <div className={`flex-shrink-0 mt-0.5 text-xs font-bold px-2 py-0.5 rounded h-fit ${r.priorite === 'IMMEDIATE' ? 'bg-red-500/10 text-red-400' :
              r.priorite === 'COURT_TERME' ? 'bg-yellow-500/10 text-yellow-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>
              {r.priorite === 'IMMEDIATE' ? '⚡' : r.priorite === 'COURT_TERME' ? '📅' : '📆'}
            </div>
            <div>
              <p className="text-sm text-[var(--foreground)]">{r.action}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Responsable : {r.responsable}{r.reference && ` • Réf : ${r.reference}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
rt Word Complet
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
