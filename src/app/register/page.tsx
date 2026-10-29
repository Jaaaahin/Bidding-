'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, User, Building2, Phone, AlertCircle, ShieldCheck } from 'lucide-react';
import { registerUserAction } from '@/app/actions/auth';
import { useToast } from '@/components/ui/ToastProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [favoriteClub, setFavoriteClub] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await registerUserAction({
        fullName,
        email,
        password,
        favoriteClub,
        phone,
      });

      if (!res.success) {
        setError(res.error || 'Could not create account.');
        showToast({
          title: 'Registration Error',
          description: res.error || 'Please review your registration details.',
          variant: 'error',
        });
        return;
      }

      showToast({
        title: 'Account Created!',
        description: 'Your FootBid bidder profile is active and ready to place bids.',
        variant: 'success',
      });

      router.push(res.redirectTo || '/dashboard');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <div className="rounded-3xl border border-slate-800 bg-navy-900/95 p-7 sm:p-9 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-electric-500 text-navy-950 shadow-electric-sm">
            <UserPlus className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Register Bidder Account
          </h1>
          <p className="text-xs text-slate-400">
            Create a verified user account to participate in live football player auctions.
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
              htmlFor="register-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Full Name / Sporting Director Name *
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="register-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Tanvir Ahmed"
                className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-electric-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Email Address *
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@club.com"
                className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-electric-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Password (Min. 8 characters) *
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="register-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-electric-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="register-club"
                className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Club / Organization
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="register-club"
                  type="text"
                  value={favoriteClub}
                  onChange={(e) => setFavoriteClub(e.target.value)}
                  placeholder="e.g., Chittagong Kings FC"
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-10 pr-3 py-3 text-sm text-white placeholder-slate-500 focus:border-electric-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-phone"
                className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="register-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 17..."
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-10 pr-3 py-3 text-sm text-white placeholder-slate-500 focus:border-electric-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-navy-950/80 p-3 text-[11px] text-slate-400">
            <ShieldCheck className="h-4 w-4 text-electric-400 shrink-0 mt-0.5" />
            <span>
              Public registration creates a standard <strong>Registered Bidder (`user`)</strong>{' '}
              account. Admin privileges can never be granted via public signup.
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-electric-500 py-3.5 text-sm font-black uppercase tracking-wider text-navy-950 shadow-electric-glow hover:bg-electric-400 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Create Bidder Account'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link href="/login" className="font-bold text-electric-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
