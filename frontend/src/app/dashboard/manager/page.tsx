'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  FileText, Clock, CheckCircle, Activity, Users, UserCheck,
  ArrowRight, TrendingUp, AlertCircle, RefreshCw
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  PENDING: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  AWAITING_DOCS: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  COMPLETED: 'bg-green-500/10 text-green-400 border border-green-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  AWAITING_DOCS: 'Docs manquants',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

const PROGRESS_STEPS = [
  { key: 'DRAFT', label: 'Soumis', step: 1 },
  { key: 'PENDING', label: 'En attente', step: 2 },
  { key: 'IN_PROGRESS', label: 'En cours', step: 3 },
  { key: 'COMPLETED', label: 'Terminé', step: 4 },
];

function ProgressBar({ status }: { status: string }) {
  const current = PROGRESS_STEPS.find(s => s.key === status)?.step ?? 1;
  return (
    <div className="flex items-center gap-1 mt-2">
      {PROGRESS_STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1 flex-1">
          <div className={`h-1.5 flex-1 rounded-full transition-all ${s.step <= current ? 'bg-blue-500' : 'bg-[var(--border)]'}`} />
          {i < PROGRESS_STEPS.length - 1 && <div className={`h-1.5 w-1.5 rounded-full ${s.step < current ? 'bg-blue-500' : 'bg-[var(--border)]'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function ManagerDashboard() {
  useAuth(['MANAGER', 'ADMIN']);
  const [audits, setAudits] = useState<any[]>([]);
  const [auditors, setAuditors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attribution' | 'suivi'>('attribution');
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aRes, audRes] = await Promise.all([
        apiFetch('/api/audits?size=100'),
        apiFetch('/api/users?role=AUDITOR&size=100'),
      ]);
      setAudits(aRes?.content ?? (Array.isArray(aRes) ? aRes : []));
      setAuditors(audRes?.content ?? (Array.isArray(audRes) ? audRes : []));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const assignAuditor = async (auditId: string, auditorId: string) => {
    if (!auditorId) return;
    setAssigning(auditId);
    try {
      await apiFetch(`/api/audits/${auditId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ auditorId }),
      });
      toast.success('Auditeur assigné avec succès');
      loadData();
    } catch (e: any) { toast.error(e.message); }
    finally { setAssigning(null); }
  };

  const changeStatus = async (auditId: string, newStatus: string) => {
    try {
      await apiFetch(`/api/audits/${auditId}/status/${newStatus}`, { method: 'PATCH' });
      toast.success('Statut mis à jour');
      loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  const unassigned = audits.filter(a => !a.auditorName);
  const inProgress = audits.filter(a => a.status === 'IN_PROGRESS');
  const completed = audits.filter(a => a.status === 'COMPLETED');

  const stats = [
    { label: 'Total Audits', value: audits.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Non Assignés', value: unassigned.length, icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'En Cours', value: inProgress.length, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Terminés', value: completed.length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  // Group audits by auditor for the suivi tab
  const byAuditor: Record<string, { auditor: string; audits: any[] }> = {};
  audits.forEach(a => {
    const key = a.auditorName || '__unassigned__';
    if (!byAuditor[key]) byAuditor[key] = { auditor: a.auditorName || 'Non assigné', audits: [] };
    byAuditor[key].audits.push(a);
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Tableau de bord Manager</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Attribution des auditeurs et suivi d&apos;avancement</p>
        </div>
        <button onClick={loadData}
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

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('attribution')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'attribution' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
          <UserCheck className="h-4 w-4" />
          Attribution
        </button>
        <button
          onClick={() => setActiveTab('suivi')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'suivi' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
          <TrendingUp className="h-4 w-4" />
          Suivi d&apos;avancement
        </button>
      </div>

      {/* Tab: Attribution */}
      {activeTab === 'attribution' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">Attribution Auditeur ↔ Client</h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Assignez un auditeur à chaque dossier client</p>
            </div>
            <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">
              {unassigned.length} dossier(s) sans auditeur
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  {['Dossier', 'Client', 'Statut', 'Auditeur actuel', 'Affecter un auditeur', 'Actions'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">Chargement...</td></tr>
                ) : audits.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">Aucun audit trouvé</td></tr>
                ) : audits.map(a => (
                  <tr key={a.id} className={`border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/30 transition-colors ${!a.auditorName ? 'bg-orange-500/5' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--foreground)]">{a.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {a.deadline ? new Date(a.deadline).toLocaleDateString('fr-FR') : 'Sans échéance'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                          {a.clientName?.[0] || '?'}
                        </div>
                        <span className="text-[var(--foreground)] text-sm">{a.clientName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${STATUS_COLORS[a.status] || ''}`}>
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {a.auditorName ? (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">
                            {a.auditorName[0]}
                          </div>
                          <span className="text-[var(--foreground)] text-sm">{a.auditorName}</span>
                        </div>
                      ) : (
                        <span className="text-orange-400 text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Non assigné
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue=""
                          onChange={e => assignAuditor(a.id, e.target.value)}
                          disabled={assigning === a.id}
                          className="bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500 transition-all min-w-[140px]">
                          <option value="">{a.auditorName ? 'Changer…' : 'Choisir…'}</option>
                          {auditors.map(aud => (
                            <option key={aud.id} value={aud.id}>{aud.fullName}</option>
                          ))}
                        </select>
                        {assigning === a.id && <span className="h-4 w-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/audit/${a.id}`} className="text-blue-400 hover:text-blue-300 text-xs font-medium hover:underline inline-flex items-center gap-1">
                        Ouvrir <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Suivi d'avancement */}
      {activeTab === 'suivi' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Avancement par auditeur
            </h2>
            {loading ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">Chargement...</div>
            ) : Object.keys(byAuditor).length === 0 ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">Aucun audit</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(byAuditor).map(([key, { auditor, audits: auditorAudits }]) => (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${key === '__unassigned__' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {key === '__unassigned__' ? '?' : auditor[0]}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)] text-sm">{auditor}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{auditorAudits.length} dossier(s)</p>
                      </div>
                    </div>
                    <div className="space-y-2 pl-11">
                      {auditorAudits.map(a => (
                        <div key={a.id} className="glass rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className="text-sm font-medium text-[var(--foreground)]">{a.title}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">Client: {a.clientName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${STATUS_COLORS[a.status] || ''}`}>
                                {STATUS_LABELS[a.status] || a.status}
                              </span>
                              <Link href={`/audit/${a.id}`} className="text-blue-400 text-xs hover:underline">Voir →</Link>
                            </div>
                          </div>
                          <ProgressBar status={a.status} />
                          <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1.5">
                            {PROGRESS_STEPS.map(s => <span key={s.key}>{s.label}</span>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
