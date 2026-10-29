'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  UserCheck,
  Flame,
  Calendar,
  CheckCircle,
  Users,
} from 'lucide-react';
import { logoutUserAction } from '@/app/actions/auth';
import { useToast } from '@/components/ui/ToastProvider';
import type { Profile } from '@/types/database';

interface NavbarProps {
  user: Profile | null;
}

const PUBLIC_NAV = [
  { href: '/', label: 'Home' },
  { href: '/players', label: 'All Players', icon: Users },
  { href: '/auctions/live', label: 'Live Auctions', icon: Flame },
  { href: '/auctions/upcoming', label: 'Upcoming', icon: Calendar },
  { href: '/auctions/completed', label: 'Completed', icon: CheckCircle },
];

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUserAction();
      showToast({
        title: 'Signed out',
        description: 'You have been securely logged out of FootBid.',
        variant: 'info',
      });
      setMobileOpen(false);
      router.push('/');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-navy-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none"
          aria-label="FootBid Home"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric-500 text-navy-950 shadow-electric-sm transition-transform group-hover:scale-105">
            <Gavel className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">
              FOOT<span className="text-electric-500">BID</span>
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Pro Player Exchange
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-1">
          {PUBLIC_NAV.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-electric-500/15 text-electric-400 border border-electric-500/30'
                    : 'text-slate-300 hover:bg-navy-800/70 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth / Role Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="rounded-lg border border-slate-800 bg-navy-900/90 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
            TZ: <span className="text-electric-400">Asia/Dhaka (BST)</span>
          </div>

          {user ? (
            <div className="flex items-center gap-2.5">
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                    pathname.startsWith('/admin')
                      ? 'border-electric-500 bg-electric-500 text-navy-950 shadow-electric-sm'
                      : 'border-electric-500/50 bg-electric-500/10 text-electric-400 hover:bg-electric-500/20'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin Panel
                </Link>
              )}

              <Link
                href="/dashboard"
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                  pathname.startsWith('/dashboard')
                    ? 'border-sky-400/50 bg-sky-500/15 text-sky-300'
                    : 'border-slate-700 bg-navy-800 text-slate-200 hover:border-slate-600 hover:text-white'
                }`}
              >
                <LayoutDashboard className="h-4 w-4 text-electric-400" />
                <span>{user.full_name.split(' ')[0]}</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sign out"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-red-500/40 hover:bg-red-950/30 hover:text-red-300 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="rounded-xl border border-slate-700 bg-navy-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-electric-500 px-4 py-2 text-sm font-bold text-navy-950 shadow-electric-sm hover:bg-electric-400 transition-all"
              >
                Register Club
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
          className="lg:hidden rounded-xl border border-slate-800 bg-navy-900 p-2 text-slate-200 hover:text-white"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-navy-950 px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-1">
            {PUBLIC_NAV.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    isActive
                      ? 'bg-electric-500/15 text-electric-400 border border-electric-500/30'
                      : 'text-slate-300 hover:bg-navy-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-slate-800 pt-3">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400">
                  <UserCheck className="h-4 w-4 text-electric-400" />
                  <span>
                    Signed in as <strong className="text-white">{user.full_name}</strong> ({user.role})
                  </span>
                </div>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 text-sm font-bold text-navy-950"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <LayoutDashboard className="h-4 w-4 text-electric-400" />
                  User Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2.5 text-sm font-semibold text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-slate-700 bg-navy-900 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-electric-500 py-2.5 text-center text-sm font-bold text-navy-950"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
