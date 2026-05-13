'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Users, FileText, CheckCircle, Activity, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 5;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', PENDING: 'En attente', IN_PROGRESS: 'En cours',
  AWAITING_DOCS: 'Docs requis', COMPLETED: 'Terminé', CANCELLED: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  DRAFT: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  AWAITING_DOCS: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  COMPLETED: 'bg-green-500/10 text-green-400 border border-green-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default function AdminDashboard() {
  useAuth(['ADMIN']);
  const [users, setUsers] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(0);

  useEffect(() => { 
    loadData(false);
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [uRes, aRes] = await Promise.all([
        apiFetch('/api/users?size=1'),
        apiFetch('/api/audits?size=200&sort=createdAt,desc'),
      ]);
      setUsers({ total: uRes?.totalElements || 0 } as any);
      const raw = aRes?.content ?? (Array.isArray(aRes) ? aRes : []);
      // Sort newest first
      const sorted = [...raw].sort((a, b) =>
        new Date(b.createdAt || b.deadline || 0).getTime() -
        new Date(a.createdAt || a.deadline || 0).getTime()
      );
      setAudits(sorted);
      setAuditPage(0);
    } catch (e: any) { 
      if (!isBackground) toast.error(e.message); 
    }
    finally { if (!isBackground) setLoading(false); }
  };

  const stats = [
    { label: 'Utilisateurs Globaux', value: (users as any).total || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Audits', value: audits.length, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'En Cours', value: audits.filter(a => a.status === 'IN_PROGRESS').length, icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Terminés', value: audits.filter(a => a.status === 'COMPLETED').length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Administration</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Gestion complète de la plateforme AuditPro</p>
        </div>
        <Link href="/dashboard/users"
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all">
          <Users className="h-4 w-4" /> Gérer les Utilisateurs
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
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

      {/* Audit Progress Chart */}
      <div className="glass rounded-2xl overflow-hidden p-6 border border-[var(--border)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
            Avancement des Dossiers
          </h2>
          <div className="flex items-center gap-2 text-xs px-2.5 py-1 bg-green-500/10 text-green-400 font-medium rounded-full border border-green-500/20">
            <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" />
            Temps Réel
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {[
            { name: 'Brouillon', key: 'DRAFT', color: 'bg-gray-400' },
            { name: 'En Attente', key: 'PENDING', color: 'bg-yellow-400' },
            { name: 'En Cours', key: 'IN_PROGRESS', color: 'bg-blue-500' },
            { name: 'Docs Requis', key: 'AWAITING_DOCS', color: 'bg-orange-400' },
            { name: 'Terminés', key: 'COMPLETED', color: 'bg-green-500' },
            { name: 'Annulés', key: 'CANCELLED', color: 'bg-red-500' },
          ].map(d => {
            const count = audits.filter(a => a.status === d.key).length;
            const percentage = audits.length > 0 ? Math.round((count / audits.length) * 100) : 0;
            return (
              <div key={d.key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-[var(--foreground)]">{d.name}</span>
                  <span className="text-[var(--muted-foreground)] font-mono text-xs">{count} dossier(s) <span className="opacity-50">({percentage}%)</span></span>
                </div>
                <div className="w-full h-2.5 bg-[var(--muted)] rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full ${d.color} rounded-full transition-all duration-1000 ease-out`} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Audits Monitoring Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--foreground)]">Monitoring des audits</h2>
          <span className="text-xs text-[var(--muted-foreground)]">
            Page {auditPage + 1} / {Math.max(1, Math.ceil(audits.length / PAGE_SIZE))} &nbsp;·&nbsp; {audits.length} audit(s)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                {['#', 'Titre', 'Client', 'Auditeur', 'Statut', 'Échéance', ''].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-[var(--muted-foreground)]">
                  <div className="h-6 w-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : audits.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-[var(--muted-foreground)]">Aucun audit trouvé</td></tr>
              ) : audits.slice(auditPage * PAGE_SIZE, (auditPage + 1) * PAGE_SIZE).map((a, idx) => (
                <tr key={a.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/30 transition-colors group">
                  <td className="px-6 py-4 text-xs text-[var(--muted-foreground)] w-8">{auditPage * PAGE_SIZE + idx + 1}</td>
                  <td className="px-6 py-4 font-semibold text-[var(--foreground)] max-w-[160px]">
                    <span className="truncate block">{a.title}</span>
                  </td>
                  <td className="px-6 py-4 text-[var(--muted-foreground)]">{a.clientName}</td>
                  <td className="px-6 py-4 text-[var(--muted-foreground)]">{a.auditorName ?? <span className="italic opacity-40">—</span>}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${STATUS_COLORS[a.status] || ''}`}>
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--muted-foreground)] text-xs whitespace-nowrap">
                    {a.deadline ? new Date(a.deadline).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/audit/${a.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors border border-blue-500/20 opacity-0 group-hover:opacity-100">
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {Math.ceil(audits.length / PAGE_SIZE) > 1 && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
            <button onClick={() => setAuditPage(p => Math.max(0, p - 1))} disabled={auditPage === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronLeft className="h-4 w-4" /> Précédent
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(audits.length / PAGE_SIZE) }, (_, i) => (
                <button key={i} onClick={() => setAuditPage(i)}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                    i === auditPage
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <button onClick={() => setAuditPage(p => Math.min(Math.ceil(audits.length / PAGE_SIZE) - 1, p + 1))} disabled={auditPage >= Math.ceil(audits.length / PAGE_SIZE) - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              Suivant <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
