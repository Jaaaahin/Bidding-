import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { getCurrentUserProfile } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'FootBid — Full-Stack Football Player Bidding & Auction Platform',
  description:
    'Professional football player transfer auction marketplace with concurrency-safe PostgreSQL bidding, server-synchronized countdowns, and role-protected club administration.',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserProfile();

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-navy-950 text-slate-100 antialiased selection:bg-electric-500 selection:text-navy-950">
        <ToastProvider>
          <Navbar user={user} />
          <main className="flex-1 bg-pitch-grid">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
