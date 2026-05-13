'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';
import { apiFetch } from '@/lib/api';

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass]   = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showNew, setShowNew]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const router  = useRouter();
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (newPass.length < 8)  { toast.error('Minimum 8 caractères requis'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
      });
      toast.success('Mot de passe mis à jour. Bienvenue !');
      router.push(`/dashboard/${user?.role?.toLowerCase() ?? ''}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--background)] overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg mb-4">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Changement de mot de passe obligatoire</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-2">
            Pour votre sécurité, veuillez définir un nouveau mot de passe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-3xl p-8 space-y-5">
          {[
            { id: 'current', label: 'Mot de passe temporaire', value: current, setter: setCurrent, show: true },
          ].map(f => (
            <div key={f.id} className="space-y-2">
              <label htmlFor={f.id} className="text-sm font-medium ml-1">{f.label}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                <input id={f.id} type="password" required value={f.value}
                  onChange={e => f.setter(e.target.value)}
                  className="w-full bg-[var(--muted)] border border-[var(--border)] focus:border-amber-500 text-[var(--foreground)] rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-amber-500/20"
                  placeholder="••••••••" />
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <label htmlFor="newPass" className="text-sm font-medium ml-1">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
              <input id="newPass" type={showNew ? 'text' : 'password'} required value={newPass}
                onChange={e => setNewPass(e.target.value)} minLength={8}
                className="w-full bg-[var(--muted)] border border-[var(--border)] focus:border-amber-500 text-[var(--foreground)] rounded-xl py-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-amber-500/20"
                placeholder="Minimum 8 caractères" />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="text-sm font-medium ml-1">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
              <input id="confirm" type="password" required value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full bg-[var(--muted)] border border-[var(--border)] focus:border-amber-500 text-[var(--foreground)] rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-amber-500/20"
                placeholder="••••••••" />
            </div>
          </div>

          <button id="change-pass-btn" type="submit" disabled={loading}
            className="flex w-full justify-center items-center py-3 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg transition-all disabled:opacity-70">
            {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Définir le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
