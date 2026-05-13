'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { apiFetch } from '@/lib/api';

type Role = 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'CLIENT';

export function useAuth(requiredRoles?: Role[]) {
  const { token, user, isHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!token || !user) {
      router.replace('/login');
      return;
    }
    if (requiredRoles && !requiredRoles.includes(user.role as Role)) {
      router.replace(`/dashboard/${user.role.toLowerCase()}`);
    }
    
    // Asynchronously update the full name if it wasn't present in the token
    if (user && (user.fullName === 'Utilisateur' || !user.fullName)) {
      apiFetch('/api/users/me').then(res => {
        if (res && res.fullName) {
          useAuthStore.setState({ user: { ...user, fullName: res.fullName } });
        }
      }).catch(() => {});
    }
  }, [token, user, isHydrated, router, requiredRoles]);

  return { user, token, isAuthenticated: !!token };
}
