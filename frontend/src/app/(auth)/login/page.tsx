'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Erreur ${res.status}`);
      }

      const data = await res.json();

      // Store refresh token in cookie
      document.cookie = `refreshToken=${data.refreshToken}; path=/; SameSite=Lax`;

      // Set token in store (decodes JWT claims)
      setToken(data.accessToken);
      toast.success('Authentification réussie !');

      if (data.firstLogin) {
        router.push('/change-password');
      } else {
        // Use role from API response directly (avoids store hydration race)
        const role = (data.role as string)?.toLowerCase() ?? 'admin';
        router.push(`/dashboard/${role}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Identifiants invalides ou compte désactivé');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)]">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Audit<span className="text-blue-500">Pro</span>
          </h1>
          <p className="text-[var(--muted-foreground)] mt-2 text-sm">Plateforme SaaS d&apos;audit professionnelle</p>
        </div>

        <form onSubmit={handleLogin} className="glass rounded-3xl p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[var(--foreground)] ml-1">Email professionnel</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--muted-foreground)]">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--muted)] border border-[var(--border)] focus:border-blue-500 text-[var(--foreground)] rounded-xl py-3 pl-10 pr-4 outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                  placeholder="admin@audit.local"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[var(--foreground)] ml-1">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--muted-foreground)]">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--muted)] border border-[var(--border)] focus:border-blue-500 text-[var(--foreground)] rounded-xl py-3 pl-10 pr-4 outline-none transition-all focus:ring-2 focus:ring-blue-500/20"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            id="login-btn"
            disabled={loading}
            className="group relative flex w-full justify-center items-center py-3 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Connexion sécurisée <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-[var(--muted-foreground)]">
          &copy; 2026 AuditPro SaaS — Accès restreint aux utilisateurs autorisés
        </p>
      </div>
    </div>
  );
}
