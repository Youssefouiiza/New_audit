'use client';

import { Bell, Search, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export function Header() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread notification count on mount and every 30s
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const data = await apiFetch('/api/notifications/unread');
        setUnreadCount(Array.isArray(data) ? data.length : 0);
      } catch { /* silent */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    document.cookie = 'refreshToken=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--background-card)] backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        {/* Global Search Bar */}
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <input 
            type="text" 
            placeholder="Rechercher un audit, document ou utilisateur..." 
            className="w-full h-10 bg-[var(--muted)]/50 border border-[var(--border)] rounded-full pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--muted)]/50 border border-[var(--border)] mr-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {user.fullName?.charAt(0) || 'U'}
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">{user.fullName || 'Utilisateur'}</span>
          </div>
        )}

        {/* Bell — with live unread count badge */}
        <Link href="/notifications" className="relative p-2 rounded-full hover:bg-[var(--secondary)] transition-colors duration-200">
          <Bell className="h-5 w-5 text-[var(--muted-foreground)]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 ring-2 ring-[var(--background)] flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition-all duration-200 font-medium"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
