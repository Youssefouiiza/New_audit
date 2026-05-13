'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardNotificationsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/notifications'); }, [router]);
  return <div className="p-8 text-[var(--muted-foreground)]">Redirection vers les notifications…</div>;
}
