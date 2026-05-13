'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { FileText, Activity, CheckCircle, ArrowRight, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT:         'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  PENDING:       'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  IN_PROGRESS:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  AWAITING_DOCS: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  COMPLETED:     'bg-green-500/10 text-green-400 border border-green-500/20',
  CANCELLED:     'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', PENDING: 'En attente', IN_PROGRESS: 'En cours',
  AWAITING_DOCS: 'Docs requis', COMPLETED: 'Terminé', CANCELLED: 'Annulé',
};

const PAGE_SIZE = 5;

export default function AuditsPage() {
  useAuth();
  const { user } = useAuthStore();
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!user) return;
    const endpoint = user.role === 'ADMIN' || user.role === 'MANAGER'
      ? '/api/audits?size=200&sort=createdAt,desc'
      : '/api/audits/mine?size=200&sort=createdAt,desc';
    setLoading(true);
    apiFetch(endpoint)
      .then(data => {
        const raw = data?.content ?? (Array.isArray(data) ? data : []);
        // Sort newest first (by createdAt or id)
        const sorted = [...raw].sort((a, b) =>
          new Date(b.createdAt || b.deadline || 0).getTime() -
          new Date(a.createdAt || a.deadline || 0).getTime()
        );
        setAudits(sorted);
        setPage(0);
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const totalPages = Math.ceil(audits.length / PAGE_SIZE);
  const paginated = audits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stats = [
    { label: 'Total', value: audits.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'En Cours', value: audits.filter(a => a.status === 'IN_PROGRESS').length, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'En Attente', value: audits.filter(a => a.status === 'PENDING' || a.status === 'DRAFT').length, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Terminés', value: audits.filter(a => a.status === 'COMPLETED').length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Mes Audits</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            {audits.length} audit(s) — les plus récents en premier
          </p>
        </div>
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

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--foreground)]">Liste des Audits</h2>
          {!loading && audits.length > 0 && (
            <span className="text-xs text-[var(--muted-foreground)]">
              Page {page + 1} / {totalPages} &nbsp;·&nbsp; {audits.length} entrées
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="h-7 w-7 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : audits.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <FileText className="h-12 w-12 mx-auto text-[var(--muted-foreground)]/40" />
            <p className="text-[var(--muted-foreground)]">Aucun audit disponible</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                    {['#', 'Titre', 'Client', 'Auditeur', 'Statut', 'Échéance', ''].map((h, i) => (
                      <th key={i} className="text-left px-6 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((a, idx) => (
                    <tr key={a.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/30 transition-colors group">
                      <td className="px-6 py-4 text-xs text-[var(--muted-foreground)] w-10">
                        {page * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-6 py-4 font-semibold text-[var(--foreground)] max-w-[180px]">
                        <span className="truncate block">{a.title}</span>
                        {a.description && (
                          <span className="text-xs text-[var(--muted-foreground)] font-normal truncate block max-w-[160px]">
                            {a.description}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--muted-foreground)]">{a.clientName ?? '—'}</td>
                      <td className="px-6 py-4 text-[var(--muted-foreground)]">{a.auditorName ?? <span className="italic opacity-50">Non assigné</span>}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${STATUS_COLORS[a.status] || 'bg-gray-500/10 text-gray-400'}`}>
                          {STATUS_LABELS[a.status] || a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--muted-foreground)] text-xs whitespace-nowrap">
                        {a.deadline ? new Date(a.deadline).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/audit/${a.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors border border-blue-500/20 opacity-0 group-hover:opacity-100">
                          Voir <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Précédent
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                        i === page
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
