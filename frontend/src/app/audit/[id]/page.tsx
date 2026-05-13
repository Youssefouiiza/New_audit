'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import {
  ArrowLeft, MessageSquare, FileText, Brain, ChevronDown,
  Upload, Download, AlertTriangle, CheckCircle, Clock, Activity, FileBadge, ExternalLink, Trash2
} from 'lucide-react';

const STATUS_COLORS: Record<string, { text: string; badge: string }> = {
  PENDING: { text: 'En Attente', badge: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  IN_PROGRESS: { text: 'En Cours', badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  AWAITING_DOCS: { text: 'Docs Requis', badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  COMPLETED: { text: 'Terminé', badge: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  CANCELLED: { text: 'Annulé', badge: 'bg-red-500/10 text-red-400 border border-red-500/20' },
};

export default function AuditDetailPage() {
  useAuth();
  const { id } = useParams() as { id: string };
  const { user } = useAuthStore();
  const [audit, setAudit] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [auditors, setAuditors] = useState<any[]>([]);
  const [selectedAuditor, setSelectedAuditor] = useState('');
  const [assigning, setAssigning] = useState(false);
  // Final report upload
  const [finalReportFile, setFinalReportFile] = useState<File | null>(null);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [finalReport, setFinalReport] = useState<any | null>(null);
  // Report review status (from /api/reports/audit/{id})
  const [reportRecord, setReportRecord] = useState<any | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => { 
    if (user) {
      loadAudit(); 
    }
  }, [id, user]);

  const loadAudit = async () => {
    try {
      const [a, d] = await Promise.all([
        apiFetch(`/api/audits/${id}`),
        apiFetch(`/api/documents/audit/${id}`),
      ]);
      setAudit(a);
      setDocs(Array.isArray(d) ? d : []);
      // Detect final report from documents (tagged by name convention)
      const allDocs = Array.isArray(d) ? d : [];
      const report = allDocs.find((doc: any) => doc.fileName?.toLowerCase().startsWith('rapport_final_'));
      setFinalReport(report || null);
      // Load report review record
      try {
        const rr = await apiFetch(`/api/reports/audit/${id}`);
        setReportRecord(rr);
      } catch { setReportRecord(null); }
      try {
        const ai = await apiFetch(`/api/ai/result/${id}`);
        setAiResult(ai);
      } catch { setAiResult(null); }
      if (user?.role === 'MANAGER' || user?.role === 'ADMIN') {
        try {
          const uRes = await apiFetch('/api/users?role=AUDITOR&size=100');
          setAuditors(uRes?.content || uRes || []);
        } catch { setAuditors([]); }
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const assignAuditor = async () => {
    if (!selectedAuditor) return;
    setAssigning(true);
    try {
      await apiFetch(`/api/audits/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          auditorId: selectedAuditor,
          managerId: user?.id,
        }),
      });
      toast.success('Auditeur assigné avec succès');
      setSelectedAuditor('');
      loadAudit();
    } catch (e: any) { toast.error(e.message); }
    finally { setAssigning(false); }
  };

  const triggerAiAnalysis = async () => {
    setAnalyzing(true);
    let attempts = 0;
    try {
      await apiFetch(`/api/ai/analyze/${id}`, { method: 'POST' });
      toast.success("L'analyse IA a été lancée en tâche de fond ! Cela prend quelques secondes...");

      // Poll periodically to get the result automatically
      const interval = setInterval(async () => {
        attempts++;
        try {
          const ai = await apiFetch(`/api/ai/result/${id}`);
          if (ai && ai.summary) {
            setAiResult(ai);
            setAnalyzing(false);
            clearInterval(interval);
            toast.success("Analyse IA terminée et affichée !");
          }
        } catch(e) { } // Ignore errors while polling, it just means it's not ready yet

        if (attempts > 10) {
          clearInterval(interval);
          setAnalyzing(false);
          toast.error("L'IA prend plus de temps que prévu. Réessayez d'actualiser la page plus tard.");
        }
      }, 3000);

    } catch(e: any) {
      toast.error("Erreur lancement IA: " + e.message);
      setAnalyzing(false);
    }
  };

  const uploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = JSON.parse(sessionStorage.getItem('audit-auth-storage') || '{}')?.state?.token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      // Correct endpoint: POST /api/documents/upload?auditId=XXX
      const res = await fetch(`${apiUrl}/api/documents/upload?auditId=${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `Erreur ${res.status}` }));
        throw new Error(err.message || `Erreur ${res.status}`);
      }
      toast.success('Document téléchargé avec succès');
      setFile(null);
      loadAudit();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const uploadFinalReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalReportFile) return;
    setUploadingReport(true);
    const formData = new FormData();
    // Prefix the filename so we can detect it as a final report
    const renamedFile = new File(
      [finalReportFile],
      `rapport_final_${finalReportFile.name}`,
      { type: finalReportFile.type }
    );
    formData.append('file', renamedFile);
    try {
      const token = JSON.parse(sessionStorage.getItem('audit-auth-storage') || '{}')?.state?.token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiUrl}/api/documents/upload?auditId=${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `Erreur ${res.status}` }));
        throw new Error(err.message || `Erreur ${res.status}`);
      }
      toast.success('✅ Rapport final soumis avec succès !');
      setFinalReportFile(null);
      // Also call /api/reports/submit with the document info
      try {
        await apiFetch(`/api/reports/submit/${id}`, {
          method: 'POST',
          body: JSON.stringify({
            documentFileKey: `rapport_final_${finalReportFile!.name}`,
            documentFileName: finalReportFile!.name,
          }),
        });
      } catch { /* non-blocking */ }
      loadAudit();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploadingReport(false); }
  };

  const reviewReport = async (decision: 'APPROVE' | 'REJECT' | 'REVISION') => {
    setReviewing(true);
    try {
      await apiFetch(`/api/reports/review/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, comment: reviewComment }),
      });
      const label = decision === 'APPROVE' ? '✅ Rapport approuvé — Client notifié !' : decision === 'REJECT' ? '❌ Rapport refusé' : '🔄 Révision demandée à l\'auditeur';
      toast.success(label);
      setReviewComment('');
      loadAudit();
    } catch (e: any) { toast.error(e.message); }
    finally { setReviewing(false); }
  };

  const changeStatus = async (status: string) => {
    if (!status) return;
    setChangingStatus(true);
    try {
      // Backend: PATCH /api/audits/{id}/status/{newStatus} — status is in the URL path
      await apiFetch(`/api/audits/${id}/status/${status}`, { method: 'PATCH' });
      toast.success('Statut mis à jour');
      loadAudit();
    } catch (e: any) { toast.error(e.message); }
    finally { setChangingStatus(false); }
  };

  const generateReport = async () => {
    try {
      await apiFetch(`/api/reports/generate/${id}`, { method: 'POST' });
      toast.success('Génération du rapport initiée');
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteDoc = async (docId: string, docName: string) => {
    if (!window.confirm(`Supprimer le document "${docName}" ? Cette action est irréversible.`)) return;
    try {
      await apiFetch(`/api/documents/${docId}`, { method: 'DELETE' });
      toast.success('Document supprimé');
      loadAudit();
    } catch (e: any) { toast.error('Erreur suppression : ' + e.message); }
  };

  if (!audit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const statusCfg = STATUS_COLORS[audit.status] || { text: audit.status, badge: 'bg-gray-500/10 text-gray-400' };

  return (
    <div className="space-y-6">
      <AuditHeader audit={audit} id={id} statusCfg={statusCfg} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AuditInfoSidebar
          user={user}
          audit={audit}
          statusCfg={statusCfg}
          changingStatus={changingStatus}
          assigning={assigning}
          auditors={auditors}
          selectedAuditor={selectedAuditor}
          onSetAuditor={setSelectedAuditor}
          onChangeStatus={changeStatus}
          onGenerateReport={generateReport}
          onAssignAuditor={assignAuditor}
        />

        <RAGAnalysisCard aiResult={aiResult} id={id} />

        <DocumentManagerCard
          docs={docs}
          file={file}
          uploading={uploading}
          onSetFile={setFile}
          onUpload={uploadDoc}
          onDelete={deleteDoc}
        />
      </div>

      <FinalReportSection
        user={user}
        finalReport={finalReport}
        finalReportFile={finalReportFile}
        uploadingReport={uploadingReport}
        onSetFinalFile={setFinalReportFile}
        onUploadFinal={uploadFinalReport}
      />

      <ManagerReviewPanel
        user={user}
        reportRecord={reportRecord}
        reviewComment={reviewComment}
        reviewing={reviewing}
        onSetComment={setReviewComment}
        onReview={reviewReport}
      />

      <ReviewStatusBadge user={user} reportRecord={reportRecord} />

      <ClientApprovedReport user={user} reportRecord={reportRecord} />
    </div>
  );
}

// ── Sous-composants pour réduire la complexité ────────────────

function AuditHeader({ audit, id, statusCfg }: any) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <Link href=".." className="h-10 w-10 glass rounded-xl flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex-shrink-0 mt-0.5">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{audit.title}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${statusCfg.badge}`}>{statusCfg.text}</span>
            <span className="text-[var(--muted-foreground)] text-sm">Client: {audit.clientName}</span>
            {audit.auditorName && <span className="text-[var(--muted-foreground)] text-sm">Auditeur: {audit.auditorName}</span>}
          </div>
        </div>
      </div>
      <Link href={`/chat?auditId=${id}`}
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-all flex-shrink-0">
        <MessageSquare className="h-4 w-4" /> Chat de l&apos;audit
      </Link>
    </div>
  );
}

function AuditInfoSidebar({ user, audit, statusCfg, changingStatus, assigning, auditors, selectedAuditor, onSetAuditor, onChangeStatus, onGenerateReport, onAssignAuditor }: any) {
  const canModify = (user?.role === 'AUDITOR' || user?.role === 'MANAGER' || user?.role === 'ADMIN');
  const canAssign = (user?.role === 'MANAGER' || user?.role === 'ADMIN');

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
        <Activity className="h-5 w-5 text-blue-400" /> Informations
      </h2>
      <div className="space-y-3 text-sm">
        {[
          { label: 'Statut', value: statusCfg.text },
          { label: 'Client', value: audit.clientName },
          { label: 'Auditeur', value: audit.auditorName ?? 'Non assigné' },
          { label: 'Échéance', value: audit.deadline ? new Date(audit.deadline).toLocaleDateString('fr-FR') : '—' },
        ].map(({ label, value }: any) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-[var(--border)]/50 last:border-0">
            <span className="text-[var(--muted-foreground)]">{label}</span>
            <span className="text-[var(--foreground)] font-medium">{value}</span>
          </div>
        ))}
        {audit.description && (
          <div className="pt-2">
            <p className="text-[var(--muted-foreground)] text-xs mb-1">Description</p>
            <p className="text-[var(--foreground)] text-sm leading-relaxed">{audit.description}</p>
          </div>
        )}
      </div>

      {canModify && (
        <div className="pt-3 space-y-2 border-t border-[var(--border)]">
          <label className="block text-xs font-medium text-[var(--muted-foreground)]">Changer le statut</label>
          <div className="relative">
            <select onChange={e => onChangeStatus(e.target.value)} defaultValue=""
              disabled={changingStatus}
              className="w-full appearance-none bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-all pr-8 disabled:opacity-50">
              <option value="">Sélectionner…</option>
              {['IN_PROGRESS', 'AWAITING_DOCS', 'COMPLETED', 'CANCELLED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
          </div>
          <button onClick={onGenerateReport}
            className="w-full text-sm py-2.5 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 text-white hover:from-gray-600 hover:to-gray-700 transition-all border border-[var(--border)]">
            Générer Rapport Final
          </button>
        </div>
      )}

      {canAssign && (
        <div className="pt-3 space-y-2 border-t border-[var(--border)]">
          <label className="block text-xs font-medium text-[var(--muted-foreground)]">
            {audit.auditorName ? 'Réassigner un auditeur' : 'Assigner un auditeur'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select onChange={e => onSetAuditor(e.target.value)} value={selectedAuditor} disabled={assigning}
                className="w-full appearance-none bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-all pr-8 disabled:opacity-50">
                <option value="">Sélectionner un auditeur…</option>
                {auditors.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.fullName} ({a.email})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
            </div>
            <button onClick={onAssignAuditor} disabled={!selectedAuditor || assigning}
              className="px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 transition-all disabled:opacity-40">
              {assigning ? '...' : 'Assigner'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RAGAnalysisCard({ aiResult, id }: any) {
  return (
    <div className="glass rounded-2xl p-6 space-y-4 border border-indigo-500/20">
      <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
        <Brain className="h-5 w-5 text-indigo-400" /> Analyse Juridique RAG
      </h2>
      {aiResult ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${aiResult.riskScore > 70 ? 'text-red-400' : aiResult.riskScore > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
              {aiResult.riskScore}
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Score de Risque</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${aiResult.riskScore > 70 ? 'bg-red-500/10 text-red-400' : aiResult.riskScore > 40 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
                {aiResult.riskLevel}
              </span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--muted)]">
            <div className={`h-2 rounded-full transition-all ${aiResult.riskScore > 70 ? 'bg-red-500' : aiResult.riskScore > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${aiResult.riskScore}%` }} />
          </div>
          <div className="bg-[var(--muted)]/50 rounded-xl p-3">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Résumé</p>
            <p className="text-sm text-[var(--foreground)] leading-relaxed">{aiResult.summary}</p>
          </div>
          <Link href={`/audit/${id}/analyse`}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-md shadow-indigo-500/20">
            <Brain className="h-4 w-4" /> Ouvrir l&apos;analyse complète
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="py-6 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <Brain className="h-8 w-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-[var(--foreground)] font-medium text-sm">Analyse juridique RAG locale</p>
            <p className="text-xs text-[var(--muted-foreground)]/80 mt-1">
              Comparaison avec la base de droit marocain (10 domaines) + rapport Word
            </p>
          </div>
          <Link href={`/audit/${id}/analyse`}
            className="mx-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-indigo-500/25">
            <Brain className="h-4 w-4" /> Lancer l&apos;analyse RAG
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

function DocumentManagerCard({ docs, file, uploading, onSetFile, onUpload, onDelete }: any) {
  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-400" /> Documents ({docs.length})
        </h2>
      </div>
      <div className="p-4">
        <form onSubmit={onUpload} className="flex gap-2 mb-4">
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm text-[var(--muted-foreground)] hover:border-blue-500 transition-all">
              <Upload className="h-4 w-4" />
              <span className="truncate">{file ? file.name : 'Choisir un fichier…'}</span>
            </div>
            <input type="file" onChange={e => onSetFile(e.target.files?.[0] || null)} className="sr-only" />
          </label>
          <button type="submit" disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-500 transition-all disabled:opacity-40 flex-shrink-0">
            {uploading ? '…' : 'Upload'}
          </button>
        </form>
        <div className="space-y-2 overflow-y-auto max-h-64">
          {docs.length === 0 ? (
            <p className="text-center py-6 text-sm text-[var(--muted-foreground)]">Aucun document</p>
          ) : docs.map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)]/50 group">
              <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--foreground)] truncate">{d.fileName}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{(d.fileSize / 1024).toFixed(1)} KB</p>
              </div>
              <a href={d.downloadUrl} target="_blank" rel="noreferrer"
                className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex-shrink-0">
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => onDelete(d.id, d.fileName)}
                title="Supprimer ce document"
                className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinalReportSection({ user, finalReport, finalReportFile, uploadingReport, onSetFinalFile, onUploadFinal }: any) {
  const isPrivileged = (user?.role === 'AUDITOR' || user?.role === 'MANAGER' || user?.role === 'ADMIN');
  if (!isPrivileged) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden border border-green-500/20">
      <div className="px-6 py-4 border-b border-green-500/20 bg-green-500/5 flex items-center justify-between">
        <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
          <FileBadge className="h-5 w-5 text-green-400" />
          Rapport Final de l&apos;Auditeur
        </h2>
        {finalReport && (
          <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-lg font-medium">
            ✅ Rapport soumis
          </span>
        )}
      </div>

      <div className="p-6 space-y-4">
        {finalReport ? (
          <>
            <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <FileBadge className="h-6 w-6 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--foreground)] truncate">{finalReport.fileName.replace('rapport_final_', '')}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {(finalReport.fileSize / 1024).toFixed(1)} KB &nbsp;•&nbsp; Déposé par l&apos;auditeur
                </p>
              </div>
              <a href={finalReport.downloadUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-500 transition-all flex-shrink-0">
                <Download className="h-3.5 w-3.5" /> Télécharger
              </a>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] text-center">Vous pouvez déposer un nouveau rapport pour remplacer le précédent.</p>
          </>
        ) : (
          <div className="text-center py-4">
            <FileBadge className="h-10 w-10 mx-auto text-green-400/30 mb-3" />
            <p className="text-sm text-[var(--muted-foreground)]">Aucun rapport final soumis pour le moment.</p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">Déposez le rapport PDF ou Word final de votre mission d&apos;audit.</p>
          </div>
        )}

        <form onSubmit={onUploadFinal} className="flex gap-2 pt-2 border-t border-[var(--border)]/50">
          <label className="flex-1 cursor-pointer">
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border-2 border-dashed transition-all ${
              finalReportFile
                ? 'border-green-500 bg-green-500/10 text-green-400'
                : 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:border-green-500/50'
            }`}>
              <Upload className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{finalReportFile ? finalReportFile.name : 'Sélectionner le rapport final (PDF, Word)…'}</span>
            </div>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={e => onSetFinalFile(e.target.files?.[0] || null)}
              className="sr-only"
            />
          </label>
          <button type="submit" disabled={!finalReportFile || uploadingReport}
            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40 flex-shrink-0 shadow-lg shadow-green-500/20 flex items-center gap-2">
            {uploadingReport
              ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi…</>
              : <><Upload className="h-4 w-4" /> Soumettre</>}
          </button>
        </form>
      </div>
    </div>
  );
}

function ManagerReviewPanel({ user, reportRecord, reviewComment, reviewing, onSetComment, onReview }: any) {
  const isManager = (user?.role === 'MANAGER' || user?.role === 'ADMIN');
  const isPending = reportRecord && reportRecord.status === 'PENDING_REVIEW';

  if (!isManager || !isPending) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden border border-yellow-500/20">
      <div className="px-6 py-4 border-b border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between">
        <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          Validation du Rapport — Action Requise
        </h2>
        <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-lg font-medium animate-pulse">
          ⏳ En attente de validation
        </span>
      </div>
      <div className="p-6 space-y-4">
        {reportRecord.documentDownloadUrl && (
          <div className="flex items-center gap-4 bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl p-4">
            <FileBadge className="h-8 w-8 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--foreground)]">{reportRecord.documentFileName || 'Rapport de l\'auditeur'}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Soumis par {reportRecord.generatedByName}</p>
            </div>
            <a href={reportRecord.documentDownloadUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-500 transition-all flex-shrink-0">
              <Download className="h-3.5 w-3.5" /> Lire le rapport
            </a>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">
            Commentaire (obligatoire pour refus ou révision)
          </label>
          <textarea
            value={reviewComment}
            onChange={e => onSetComment(e.target.value)}
            placeholder="Ex: Le ratio d'endettement n'est pas commenté, veuillez compléter la section 5..."
            rows={3}
            className="w-full bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all resize-none"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={() => onReview('APPROVE')} disabled={reviewing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-green-500/20">
            {reviewing ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Approuver & Envoyer au Client
          </button>
          <button onClick={() => onReview('REVISION')} disabled={reviewing || !reviewComment}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-600 text-white rounded-xl text-sm font-medium hover:bg-yellow-500 transition-all disabled:opacity-40">
            <Clock className="h-4 w-4" /> Demander des Modifications
          </button>
          <button onClick={() => onReview('REJECT')} disabled={reviewing || !reviewComment}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium hover:bg-red-600/30 transition-all disabled:opacity-40">
            <AlertTriangle className="h-4 w-4" /> Refuser
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewStatusBadge({ user, reportRecord }: any) {
  const isPrivileged = (user?.role === 'MANAGER' || user?.role === 'ADMIN');
  const isReviewed = reportRecord && ['APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(reportRecord.status);

  if (!isPrivileged || !isReviewed) return null;

  const status = reportRecord.status;
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';

  return (
    <div className={`glass rounded-2xl p-4 flex items-center gap-4 border ${
      isApproved ? 'border-green-500/20' :
      isRejected ? 'border-red-500/20' : 'border-yellow-500/20'
    }`}>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isApproved ? 'bg-green-500/20' :
        isRejected ? 'bg-red-500/20' : 'bg-yellow-500/20'
      }`}>
        {isApproved ? <CheckCircle className="h-5 w-5 text-green-400" /> :
         isRejected ? <AlertTriangle className="h-5 w-5 text-red-400" /> :
         <Clock className="h-5 w-5 text-yellow-400" />}
      </div>
      <div>
        <p className="font-medium text-[var(--foreground)]">
          {isApproved ? '✅ Rapport approuvé — Visible par le client' :
           isRejected ? '❌ Rapport refusé' : '🔄 Révision demandée à l\'auditeur'}
        </p>
        {reportRecord.reviewComment && (
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Commentaire: {reportRecord.reviewComment}</p>
        )}
      </div>
    </div>
  );
}

function ClientApprovedReport({ user, reportRecord }: any) {
  const isClient = user?.role === 'CLIENT';
  const isApproved = reportRecord && reportRecord.status === 'APPROVED' && reportRecord.documentDownloadUrl;

  if (!isClient || !isApproved) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden border border-green-500/30">
      <div className="px-6 py-4 border-b border-green-500/20 bg-green-500/5">
        <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
          <FileBadge className="h-5 w-5 text-green-400" />
          Votre Rapport d&apos;Audit Final
        </h2>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="h-14 w-14 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <FileBadge className="h-7 w-7 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--foreground)]">{reportRecord.documentFileName || 'Rapport Final'}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              ✅ Validé par le cabinet &nbsp;•&nbsp; Auditeur: {reportRecord.generatedByName}
            </p>
          </div>
          <a href={reportRecord.documentDownloadUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-green-500/20 flex-shrink-0">
            <Download className="h-4 w-4" /> Télécharger
          </a>
        </div>
      </div>
    </div>
  );
}
