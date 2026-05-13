'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Users, Plus, Search, Edit2, Trash2, 
  ChevronLeft, ChevronRight, Shield, ShieldCheck, Mail, Phone, Activity
} from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  MANAGER: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  AUDITOR: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  CLIENT: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
};

export default function UsersPage() {
  useAuth(['ADMIN']);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Modals & Forms State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [createForm, setCreateForm] = useState({
    email: '', fullName: '', phone: '', role: 'AUDITOR', temporaryPassword: ''
  });
  const [editForm, setEditForm] = useState({
    fullName: '', phone: '', status: ''
  });

  useEffect(() => { loadUsers(); }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/users?page=${page}&size=5&sort=createdAt,desc`);
      setUsers(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (e: any) { 
      toast.error(e.message || "Erreur de chargement");
    } finally { 
      setLoading(false); 
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.temporaryPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      toast.success('Utilisateur créé avec succès !');
      setShowCreateModal(false);
      setCreateForm({ email: '', fullName: '', phone: '', role: 'AUDITOR', temporaryPassword: '' });
      setPage(0);
      loadUsers();
    } catch (e: any) { 
      toast.error(e.message || 'Erreur lors de la création');
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      status: user.status
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      toast.success('Utilisateur mis à jour !');
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (e: any) { 
      toast.error(e.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer / désactiver cet utilisateur ?")) return;
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      toast.success("Utilisateur supprimé");
      loadUsers();
    } catch (e: any) { 
      toast.error(e.message || 'Erreur lors de la suppression');
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      await apiFetch(`/api/users/${id}/toggle-status`, { method: 'PATCH' });
      toast.success(currentStatus === 'ACTIVE' ? 'Utilisateur désactivé' : 'Utilisateur activé');
      loadUsers();
    } catch (e: any) { 
      toast.error(e.message || 'Erreur de basculement de statut');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Gérez les accès, rôles et informations de {totalElements} utilisateurs &nbsp;·&nbsp; {totalPages} page(s)
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all flex-shrink-0"
        >
          <Plus className="h-4 w-4" /> Nouvel Utilisateur
        </button>
      </div>

      {/* Main Table Container */}
      <div className="glass rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                <th className="text-left px-6 py-4 font-semibold text-[var(--muted-foreground)]">Utilisateur</th>
                <th className="text-left px-6 py-4 font-semibold text-[var(--muted-foreground)]">Coordonnées</th>
                <th className="text-left px-6 py-4 font-semibold text-[var(--muted-foreground)]">Rôle & Statut</th>
                <th className="text-right px-6 py-4 font-semibold text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--muted-foreground)]">
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      Chargement des utilisateurs...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--muted-foreground)]">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-[var(--muted)]/20 transition-colors group">
                  {/* Avatar + FullName */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
                        {user.fullName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{user.fullName}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Inscrit le {new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>

                  {/* Email + Phone */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-blue-400 transition-colors text-sm">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[200px]">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Role + Status */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider ${ROLE_COLORS[user.role] || ''}`}>
                        {user.role}
                      </span>
                      <button 
                        onClick={() => toggleStatus(user.id, user.status)}
                        className={`group/btn flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                          user.status === 'ACTIVE' 
                            ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                            : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.status}
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(user)}
                        title="Modifier"
                        className="p-2 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        title="Désactiver"
                        className="p-2 rounded-lg bg-[var(--danger)]/5 text-[var(--danger)]/70 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                    i === page
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={page === totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative glass border border-[var(--border)] w-full max-w-lg rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Nouvel Utilisateur</h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Le mot de passe lui sera envoyé s'il est configuré.</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" required placeholder="nom@audit.local"
                    value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})}
                    className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Nom Complet <span className="text-red-500">*</span></label>
                  <input type="text" required placeholder="Jean Dupont"
                    value={createForm.fullName} onChange={e => setCreateForm({...createForm, fullName: e.target.value})}
                    className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Téléphone</label>
                  <input type="text" placeholder="+33 6..."
                    value={createForm.phone} onChange={e => setCreateForm({...createForm, phone: e.target.value})}
                    className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Rôle <span className="text-red-500">*</span></label>
                  <select required value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value})}
                    className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="CLIENT">CLIENT</option>
                    <option value="AUDITOR">AUDITOR</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Mot de passe temp <span className="text-red-500">*</span></label>
                  <input type="password" required minLength={8} placeholder="8+ caractères"
                    value={createForm.temporaryPassword} onChange={e => setCreateForm({...createForm, temporaryPassword: e.target.value})}
                    className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] bg-[var(--muted)] rounded-xl hover:bg-[var(--secondary)] transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
                  Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative glass border border-[var(--border)] w-full max-w-sm rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-1">Modifier l'Utilisateur</h2>
            <p className="text-xs text-[var(--muted-foreground)] mb-6 truncate">{editingUser.email}</p>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Nom Complet</label>
                <input type="text" required placeholder="Jean Dupont"
                  value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})}
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Téléphone</label>
                <input type="text" placeholder="+33..."
                  value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Statut</label>
                <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}
                  className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] bg-[var(--muted)] rounded-xl hover:bg-[var(--secondary)] transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
