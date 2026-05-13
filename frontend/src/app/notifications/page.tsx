'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCheck, Info, AlertTriangle, MessageSquare,
  FileText, FileBadge, ClipboardCheck, CheckCircle, Clock, X,
} from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  AUDIT_ASSIGNED:  { icon: FileText,       color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  AUDIT_UPDATED:   { icon: ClipboardCheck, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  AUDIT_COMPLETED: { icon: CheckCheck,     color: 'text-green-400',  bg: 'bg-green-500/10'  },
  REPORT_READY:    { icon: FileBadge,      color: 'text-green-400',  bg: 'bg-green-500/10'  },
  FINDING_ADDED:   { icon: AlertTriangle,  color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  CHAT_MESSAGE:    { icon: MessageSquare,  color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  NEW_MESSAGE:     { icon: MessageSquare,  color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  SYSTEM:          { icon: Info,           color: 'text-[var(--muted-foreground)]', bg: 'bg-[var(--muted)]' },
};

export default function NotificationsPage() {
  useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Per-notification review state keyed by notification id
  const [reviewState, setReviewState] = useState<Record<string, { comment: string; reviewing: boolean }>>({});

  useEffect(() => { loadNotifs(); }, []);

  const loadNotifs = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    } catch {}
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.readAt);
    await Promise.all(unread.map(n => apiFetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {})));
    loadNotifs();
    toast.success('Toutes les notifications marquées comme lues');
  };

  const handleNotifClick = (n: any) => {
    if (!n.readAt) markAsRead(n.id);
    if (!n.referenceId) return;
    if (n.type === 'CHAT_MESSAGE' || n.type === 'NEW_MESSAGE' || n.referenceType === 'CHAT') {
      router.push(`/chat?auditId=${n.referenceId}`);
    } else if (n.referenceType === 'AUDIT' || n.type?.startsWith('AUDIT_')) {
      router.push(`/audit/${n.referenceId}`);
    }
  };

  const setComment = (notifId: string, value: string) => {
    setReviewState(prev => ({ ...prev, [notifId]: { ...prev[notifId], comment: value } }));
  };

  const reviewReport = async (notifId: string, auditId: string, decision: 'APPROVE' | 'REJECT' | 'REVISION') => {
    const comment = reviewState[notifId]?.comment || '';
    setReviewState(prev => ({ ...prev, [notifId]: { ...prev[notifId], reviewing: true } }));
    try {
      await apiFetch(`/api/reports/review/${auditId}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, comment }),
      });
      markAsRead(notifId);
      const msg =
        decision === 'APPROVE' ? '✅ Rapport approuvé — Le client est notifié !' :
        decision === 'REJECT'  ? '❌ Rapport refusé — L\'auditeur est notifié' :
                                 '🔄 Modifications demandées — L\'auditeur est notifié';
      toast.success(msg);
      loadNotifs();
    } catch (e: any) { toast.error(e.message); }
    finally {
      setReviewState(prev => ({ ...prev, [notifId]: { ...prev[notifId], reviewing: false } }));
    }
  };

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Notifications</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : 'Tout est à jour'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 px-4 py-2 rounded-xl hover:bg-blue-500/10">
            <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
          </button>
        )}
      </div>

      {/* List */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-[var(--muted-foreground)]">Chargement…</div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Bell className="h-12 w-12 mx-auto text-[var(--muted-foreground)]/40" />
            <p className="text-[var(--muted-foreground)]">Aucune notification pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]/50">
            {notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM;
              const Icon = cfg.icon;
              // Is this a "report submitted for review" notification?
              const isReportReview = n.type === 'AUDIT_UPDATED' &&
                n.title?.includes('Rapport soumis') && !!n.referenceId;
              const rs = reviewState[n.id] || { comment: '', reviewing: false };

              return (
                <div key={n.id}
                  className={`px-6 py-5 transition-colors ${
                    isReportReview && !n.readAt
                      ? 'border-l-[3px] border-yellow-500 bg-yellow-500/5'
                      : !n.readAt
                      ? 'border-l-2 border-blue-500 hover:bg-[var(--muted)]/30'
                      : 'hover:bg-[var(--muted)]/20'
                  }`}>

                  {/* ── Top row: icon + text ── */}
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <div
                      className={`flex-1 min-w-0 ${!isReportReview ? 'cursor-pointer' : ''}`}
                      onClick={() => !isReportReview && handleNotifClick(n)}>
                      <p className={`font-semibold text-sm ${n.readAt ? 'text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'}`}>
                        {n.title}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)] mt-0.5 leading-relaxed">{n.content}</p>
                      <p className="text-xs text-[var(--muted-foreground)]/50 mt-1.5">
                        {new Date(n.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    {!n.readAt && !isReportReview && (
                      <button onClick={e => { e.stopPropagation(); markAsRead(n.id); }}
                        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                        Lire
                      </button>
                    )}
                  </div>

                  {/* ── Inline review panel (only on report-submission notifs) ── */}
                  {isReportReview && (
                    <div className="mt-4 ml-14 space-y-3 p-4 bg-[var(--muted)]/40 rounded-2xl border border-yellow-500/20">
                      <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Décision sur le rapport — Action requise
                      </p>

                      {/* Comment */}
                      <textarea
                        value={rs.comment}
                        onChange={e => setComment(n.id, e.target.value)}
                        placeholder="Commentaire (obligatoire pour Refus ou Modifications demandées)…"
                        rows={2}
                        className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2.5 text-xs outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all resize-none placeholder:text-[var(--muted-foreground)]/40"
                      />

                      {/* 3 action buttons */}
                      <div className="flex flex-wrap gap-2">

                        {/* ✅ Accepter */}
                        <button
                          disabled={rs.reviewing}
                          onClick={() => reviewReport(n.id, n.referenceId, 'APPROVE')}
                          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
                        >
                          {rs.reviewing
                            ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <CheckCircle className="h-3.5 w-3.5" />}
                          ✅ Accepter
                        </button>

                        {/* 🔄 Demander des modifications */}
                        <button
                          disabled={rs.reviewing || !rs.comment.trim()}
                          onClick={() => reviewReport(n.id, n.referenceId, 'REVISION')}
                          className="flex-1 min-w-[180px] flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded-xl text-xs font-bold hover:bg-yellow-500/25 transition-all disabled:opacity-40"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          🔄 Demander des modifications
                        </button>

                        {/* ❌ Refuser */}
                        <button
                          disabled={rs.reviewing || !rs.comment.trim()}
                          onClick={() => reviewReport(n.id, n.referenceId, 'REJECT')}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" />
                          ❌ Refuser
                        </button>
                      </div>

                      <p className="text-[10px] text-[var(--muted-foreground)]/40">
                        💡 Commentaire requis pour Refus ou Modifications. L&apos;auditeur et le client seront notifiés automatiquement.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
