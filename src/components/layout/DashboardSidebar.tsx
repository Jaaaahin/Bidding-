'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Gavel,
  History,
  Trophy,
  UserCog,
  ShieldCheck,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface DashboardSidebarProps {
  user: Profile;
}

const USER_NAV = [
  { href: '/dashboard', label: 'Dashboard Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/my-bids', label: 'My Active Bids', icon: Gavel },
  { href: '/dashboard/history', label: 'Bidding History', icon: History },
  { href: '/dashboard/results', label: 'Auction Results', icon: Trophy },
  { href: '/dashboard/profile', label: 'Profile Settings', icon: UserCog },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-electric-500/20 border border-electric-500/40 text-electric-400 font-black text-lg">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{user.full_name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 text-[11px]">
          <span className="text-slate-400">Account Role:</span>
          <span className="rounded-full bg-electric-500/15 border border-electric-500/30 px-2.5 py-0.5 font-bold uppercase text-electric-400">
            {user.role}
          </span>
        </div>
      </div>

      <nav aria-label="User dashboard navigation" className="rounded-2xl border border-slate-800 bg-navy-900/90 p-3 space-y-1">
        {USER_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-electric-500 text-navy-950 font-bold shadow-electric-sm'
                  : 'text-slate-300 hover:bg-navy-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {user.role === 'admin' && (
          <div className="pt-2 mt-2 border-t border-slate-800">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-electric-400 hover:bg-electric-500/15"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Switch to Admin Panel</span>
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
