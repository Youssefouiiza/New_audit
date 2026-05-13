'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardChatRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/chat'); }, [router]);
  return <div className="p-8 text-[var(--muted-foreground)]">Redirection vers la messagerie…</div>;
}
