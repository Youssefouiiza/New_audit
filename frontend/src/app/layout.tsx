import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'AuditPro | Plateforme d\'Audit SaaS',
  description: 'Plateforme moderne SaaS pour gestion d\'audits financiers et analyse IA.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${outfit.variable} font-sans antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)]`}>
        {children}
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#18181b', color: '#fafafa', border: '1px solid #27272a' } }} />
      </body>
    </html>
  );
}
