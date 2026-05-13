'use client';

import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { Settings, User, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
  useAuth();
  const { user } = useAuthStore();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Paramètres</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">Gérez votre profil et préférences</p>
      </div>

      {/* Profile Card */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
          <User className="h-5 w-5 text-blue-400" /> Mon Profil
        </h2>
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {user?.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--foreground)]">{user?.fullName || '—'}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{user?.email || '—'}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {user?.role || '—'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
          {[
            { label: 'Prénom & Nom', value: user?.fullName },
            { label: 'Email', value: user?.email },
            { label: 'Rôle', value: user?.role },
            { label: 'Identifiant', value: user?.id?.slice(0, 8) + '…' },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">{f.label}</p>
              <p className="text-sm text-[var(--foreground)] bg-[var(--muted)]/50 rounded-xl px-3 py-2 border border-[var(--border)]">
                {f.value || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Security Card */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-400" /> Sécurité
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Pour changer votre mot de passe, déconnectez-vous et utilisez le lien &quot;Mot de passe oublié&quot; ou contactez votre administrateur.
        </p>
        <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
          <Shield className="h-5 w-5 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-400">Votre session est sécurisée — Token JWT actif</p>
        </div>
      </div>

      {/* Notifications Card */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Bell className="h-5 w-5 text-yellow-400" /> Notifications
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Les notifications en temps réel sont activées via WebSocket. Consultez la page Notifications pour voir votre historique.
        </p>
      </div>
    </div>
  );
}
