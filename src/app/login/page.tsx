'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gavel, Lock, Mail, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { loginUserAction } from '@/app/actions/auth';
import { useToast } from '@/components/ui/ToastProvider';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const nextUrl = searchParams.get('next') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginUserAction({ email, password, nextUrl });
      if (!res.success) {
        setError(res.error || 'Invalid credentials.');
        showToast({
          title: 'Authentication Failed',
          description: res.error || 'Please check your email and password.',
          variant: 'error',
        });
        return;
      }

      showToast({
        title: 'Welcome back to FootBid!',
        description: `Signed in as ${res.role === 'admin' ? 'Administrator' : 'Verified Bidder'}.`,
        variant: 'success',
      });

      router.push(res.redirectTo || '/dashboard');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-3xl border border-slate-800 bg-navy-900/95 p-7 sm:p-9 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-electric-500 text-navy-950 shadow-electric-sm">
            <Gavel className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Sign In to FootBid
          </h1>
          <p className="text-xs text-slate-400">
            Access your club bidding console, live auctions, and transfer history.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-500/50 bg-red-950/30 p-3.5 text-xs text-red-200"
          >
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@club.com"
                className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-electric-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-electric-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-electric-500 py-3.5 text-sm font-black uppercase tracking-wider text-navy-950 shadow-electric-glow hover:bg-electric-400 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Verifying Session...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Credentials Box for Evaluation */}
        <div className="rounded-2xl border border-slate-800 bg-navy-950/90 p-4 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Quick Fill Seeded Test Accounts
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('scout@dhakafc.club', 'Bidder@12345')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-navy-900 px-3 py-2 text-xs font-semibold text-sky-300 hover:border-sky-400/50"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Bidder Account</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin@footbid.club', 'Admin@12345')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-navy-900 px-3 py-2 text-xs font-semibold text-electric-400 hover:border-electric-500/50"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Account</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Don&apos;t have a FootBid account yet?{' '}
          <Link href="/register" className="font-bold text-electric-400 hover:underline">
            Register Now
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-slate-400">Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
