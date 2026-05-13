'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FileText, Clock, CheckCircle, Activity, Brain,
  ArrowRight, ChevronRight, Circle, Loader2, RefreshCw
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  PENDING: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  AWAITING_DOCS: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  COMPLETED: 'bg-green-500/10 text-green-400 border border-green-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// Auditor progress stages  
const WORK_STAGES = [
  { id: 'DRAFT', label: 'Début', description: 'Dossier reçu, en attente de démarrage', color: 'text-gray-400', dotColor: 'bg-gray-400', next: 'IN_PROGRESS' },
  { id: 'IN_PROGRESS', label: 'En cours', description: 'Analyse en cours', color: 'text-blue-400', dotColor: 'bg-blue-400', next: 'PENDING' },
  { id: 'PENDING', label: 'En révision', description: 'En révision par le responsable', color: 'text-yellow-400', dotColor: 'bg-yellow-400', next: 'COMPLETED' },
  { id: 'COMPLETED', label: 'Terminé', description: 'Audit finalisé et rapport remis', color: 'text-green-400', dotColor: 'bg-green-500', next: null },
];

function StageProgress({ status, auditId, onUpdate }: { status: string; auditId: string; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);
  const currentIdx = WORK_STAGES.findIndex(s => s.id === status);
  const current = WORK_STAGES[currentIdx];
  const next = current?.next ? WORK_STAGES.find(s => s.id === current.next) : null;

  const advance = async () => {
    if (!next) return;
    setUpdating(true);
    try {
      await apiFetch(`/api/audits/${auditId}/status/${next.id}`, { method: 'PATCH' });
      toast.success(`Avancement → ${next.label}`);
      onUpdate();
    } catch (e: any) { toast.error(e.message); }
    finally { setUpdating(false); }
  };

  return (
    <div className="space-y-3">
      {/* Progress dots */}
      <div className="flex items-center gap-0">
        {WORK_STAGES.map((s, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 transition-all ${done ? s.dotColor : 'bg-[var(--border)]'} ${active ? 'ring-2 ring-offset-2 ring-offset-[var(--card)] ' + s.dotColor : ''}`} />
              {i < WORK_STAGES.length - 1 && (
                <div className={`h-0.5 flex-1 transition-all ${i < currentIdx ? 'bg-blue-500' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Stage labels */}
      <div className="flex justify-between">
        {WORK_STAGES.map((s, i) => (
          <span key={s.id} className={`text-xs ${i === currentIdx ? s.color + ' font-semibold' : 'text-[var(--muted-foreground)]'}`} style={{ width: '25%', textAlign: i === 0 ? 'left' : i === WORK_STAGES.length - 1 ? 'right' : 'center' }}>
            {s.label}
          </span>
        ))}
      </div>

      {/* Advance button */}
      {next && (
        <button
          onClick={advance}
          disabled={updating}
          className="flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50">
          {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
          Passer à : {next.label}
        </button>
      )}
    </div>
  );
}

export default function AuditorDashboard() {
  useAuth(['AUDITOR']);
  const { user } = useAuthStore();
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const loadAudits = () => {
    setLoading(true);
    apiFetch('/api/audits/mine?size=100')
      .then(data => setAudits(data?.content ?? (Array.isArray(data) ? data : [])))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAudits(); }, []);

  const loadAiAnalysis = async (auditId: string) => {
    setLoadingAi(true);
    setAiAnalysis(null);
    try {
      const res = await apiFetch(`/api/ai/result/${auditId}`);
      if (res && res.summary) {
        setAiAnalysis(res.summary);
      } else {
        setAiAnalysis('Aucune analyse IA disponible pour le moment. Vérifiez que des documents ont été uploadés et générez l\'analyse.');
      }
    } catch (e: any) {
      setAiAnalysis('Aucune analyse IA disponible. Cliquez sur Lancer l\'analyse.');
    } finally { setLoadingAi(false); }
  };

  const triggerAi = async (auditId: string) => {
    setLoadingAi(true);
    let attempts = 0;
    try {
      await apiFetch(`/api/ai/analyze/${auditId}`, { method: 'POST' });
      toast.success("Analyse lancée ! L'IA lit les documents (cela prend quelques secondes)...");
      
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await apiFetch(`/api/ai/result/${auditId}`);
          if (res && res.summary) {
            setAiAnalysis(res.summary);
            setLoadingAi(false);
            clearInterval(interval);
            toast.success("Analyse terminée !");
          }
        } catch(e) { } // silent ignore during polling
        
        if (attempts > 12) {
          clearInterval(interval);
          setLoadingAi(false);
          toast.error("Analyse très longue. Les résultats s'afficheront plus tard.");
        }
      }, 3000);

    } catch(e: any) {
      toast.error(e.message);
      setLoadingAi(false);
    }
  };

  const stats = [
    { label: 'Total Assignés', value: audits.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'À démarrer', value: audits.filter(a => a.status === 'DRAFT').length, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'En Cours', value: audits.filter(a => a.status === 'IN_PROGRESS').length, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Terminés', value: audits.filter(a => a.status === 'COMPLETED').length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Bonjour, {user?.fullName?.split(' ')[0] || 'Auditeur'} 👋
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Vos dossiers d&apos;audit assignés</p>
        </div>
        <button onClick={loadAudits}
          className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm glass px-3 py-2 rounded-xl transition-all">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="glass rounded-2xl p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`h-6 w-6 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{loading ? '—' : s.value}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main content: dossiers list + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List */}
        <div className="lg:col-span-5 glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--foreground)]">Mes Dossiers</h2>
          </div>
          {loading ? (
            <div className="py-20 text-center text-[var(--muted-foreground)]">Chargement...</div>
          ) : audits.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <FileText className="h-12 w-12 mx-auto text-[var(--muted-foreground)]/40" />
              <p className="text-[var(--muted-foreground)]">Aucun dossier assigné</p>
              <p className="text-xs text-[var(--muted-foreground)]/60">Le manager vous assignera bientôt des audits</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]/50">
              {audits.map(a => (
                <div
                  key={a.id}
                  onClick={() => { setSelectedAudit(a); setAiAnalysis(null); }}
                  className={`px-6 py-4 cursor-pointer transition-colors hover:bg-[var(--muted)]/30 ${selectedAudit?.id === a.id ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--foreground)] text-sm truncate">{a.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Client: {a.clientName}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium flex-shrink-0 ${STATUS_COLORS[a.status] || ''}`}>
                      {WORK_STAGES.find(s => s.id === a.status)?.label || a.status}
                    </span>
                  </div>
                  <StageProgress status={a.status} auditId={a.id} onUpdate={loadAudits} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedAudit ? (
            <div className="glass rounded-2xl py-20 text-center">
              <Circle className="h-12 w-12 mx-auto text-[var(--muted-foreground)]/40 mb-3" />
              <p className="text-[var(--muted-foreground)]">Sélectionnez un dossier pour voir les détails</p>
            </div>
          ) : (
            <>
              {/* Dossier info */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{selectedAudit.title}</h3>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">Client: <span className="text-[var(--foreground)]">{selectedAudit.clientName}</span></p>
                  </div>
                  <Link href={`/audit/${selectedAudit.id}`}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium glass px-3 py-1.5 rounded-lg transition-all">
                    Ouvrir le dossier <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[var(--muted-foreground)] text-xs mb-1">Statut actuel</p>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[selectedAudit.status] || ''}`}>
                      {WORK_STAGES.find(s => s.id === selectedAudit.status)?.label || selectedAudit.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-[var(--muted-foreground)] text-xs mb-1">Échéance</p>
                    <p className="text-[var(--foreground)] text-xs">
                      {selectedAudit.deadline ? new Date(selectedAudit.deadline).toLocaleDateString('fr-FR') : 'Non définie'}
                    </p>
                  </div>
                </div>

                {selectedAudit.description && (
                  <div>
                    <p className="text-[var(--muted-foreground)] text-xs mb-1">Description</p>
                    <p className="text-sm text-[var(--foreground)]">{selectedAudit.description}</p>
                  </div>
                )}

                {/* Stage advancement */}
                <div className="bg-[var(--muted)]/50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Avancement du dossier</p>
                  <StageProgress status={selectedAudit.status} auditId={selectedAudit.id} onUpdate={() => {
                    loadAudits();
                    // Update selected audit status locally
                    const stage = WORK_STAGES.find(s => s.id === selectedAudit.status);
                    if (stage?.next) setSelectedAudit((prev: any) => ({ ...prev, status: stage.next }));
                  }} />
                  <div className="mt-3 space-y-2">
                    {WORK_STAGES.map((s, i) => {
                      const currentIdx = WORK_STAGES.findIndex(x => x.id === selectedAudit.status);
                      const done = i <= currentIdx;
                      return (
                        <div key={s.id} className={`flex items-center gap-3 text-xs ${done ? '' : 'opacity-50'}`}>
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${done ? s.dotColor : 'bg-[var(--border)]'}`} />
                          <span className={done ? s.color : 'text-[var(--muted-foreground)]'}>{s.label}</span>
                          <span className="text-[var(--muted-foreground)]">—</span>
                          <span className="text-[var(--muted-foreground)]">{s.description}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* AI Analysis Panel */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)]">Analyse IA du dossier</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">Analyse automatique des documents financiers</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                       if (aiAnalysis && aiAnalysis !== 'Aucune analyse IA disponible. Cliquez sur Lancer l\'analyse.') triggerAi(selectedAudit.id);
                       else loadAiAnalysis(selectedAudit.id);
                    }}
                    disabled={loadingAi}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50">
                    {loadingAi ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyse…</>
                    ) : (
                      <><Brain className="h-3.5 w-3.5" /> Voir/Lancer l&apos;analyse IA</>
                    )}
                  </button>
                </div>

                {aiAnalysis ? (
                  <div className="bg-[var(--muted)]/50 rounded-xl p-4 space-y-4">
                    <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">{aiAnalysis}</p>
                    <button onClick={() => triggerAi(selectedAudit.id)} className="text-xs text-purple-400 hover:text-purple-300 font-medium underline">Relancer l'analyse (Si nouveaux documents)</button>
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <Brain className="h-10 w-10 mx-auto text-purple-400/30" />
                    <p className="text-[var(--muted-foreground)] text-sm">
                      {loadingAi ? 'Analyse en cours, veuillez patienter…' : 'Cliquez sur "Lancer l\'analyse IA" pour analyser les documents'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
