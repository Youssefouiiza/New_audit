'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  ShieldCheck, 
  Bell, 
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

// Dynamic links based on roles
const getNavLinks = (role: string | undefined) => {
  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'AUDITOR', 'CLIENT'] },
    { name: 'Utilisateurs', href: '/dashboard/users', icon: Users, roles: ['ADMIN'] },
    { name: 'Mes Audits', href: '/dashboard/audits', icon: FileText, roles: ['ADMIN', 'MANAGER', 'AUDITOR', 'CLIENT'] },
    { name: 'Messagerie', href: '/chat', icon: MessageSquare, roles: ['ADMIN', 'MANAGER', 'AUDITOR', 'CLIENT'] },
    { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['ADMIN', 'MANAGER', 'AUDITOR', 'CLIENT'] },
    { name: 'Paramètres', href: '/dashboard/settings', icon: Settings, roles: ['ADMIN', 'MANAGER', 'CLIENT', 'AUDITOR'] },
  ];
  return links.filter(l => !role || l.roles.includes(role));
};

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore(state => state.user);
  const links = getNavLinks(user?.role);

  return (
    <div className="w-64 h-screen border-r border-[var(--border)] bg-[var(--background-card)] backdrop-blur-3xl hidden md:flex flex-col sticky top-0">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--border)]">
        <ShieldCheck className="h-6 w-6 text-blue-500 mr-2" />
        <span className="text-xl font-bold tracking-tight">Audit<span className="text-blue-500">Pro</span></span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-4 px-3">
          Menu Principal
        </div>
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "group flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                isActive 
                  ? "bg-blue-600/10 text-blue-500" 
                  : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className={cn("mr-3 h-5 w-5 transition-transform group-hover:scale-110", isActive ? "text-blue-500" : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]")} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 bg-[var(--muted)]/50 p-3 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold truncate text-[var(--foreground)]">{user?.fullName || 'Utilisateur'}</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate">{user?.role || 'Guest'} ACCOUNT</p>
          </div>
        </div>
      </div>
    </div>
  );
}
