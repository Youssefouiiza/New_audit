'use client';
// /dashboard/users → redirect to /dashboard/admin (admin-only)
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UsersPageRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/admin'); }, [router]);
  return <div className="p-8 text-[var(--muted-foreground)]">Redirection…</div>;
}
