'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for Zustand to load from sessionStorage before checking if user is logged in
    if (!isHydrated) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    switch (user.role) {
      case 'ADMIN':
        router.replace('/dashboard/admin');
        break;
      case 'MANAGER':
        router.replace('/dashboard/manager');
        break;
      case 'AUDITOR':
        router.replace('/dashboard/auditor');
        break;
      case 'CLIENT':
        router.replace('/dashboard/client');
        break;
      default:
        router.replace('/');
    }
  }, [user, isHydrated, router]);

  return <div className="p-8">Redirection en cours...</div>;
}
