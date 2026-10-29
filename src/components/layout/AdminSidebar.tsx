'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarClock,
  Gavel,
  Trophy,
  Settings,
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface AdminSidebarProps {
  admin: Profile;
}

const ADMIN_NAV = [
  { href: '/admin', label: 'Admin Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/players', label: 'Manage Players', icon: Users },
  { href: '/admin/players/new', label: 'Add New Player', icon: UserPlus, exact: true },
  { href: '/admin/auctions', label: 'Manage Auctions', icon: CalendarClock },
  { href: '/admin/bids', label: 'Bids & Bidders', icon: Gavel },
  { href: '/admin/results', label: 'Auction Results', icon: Trophy },
  { href: '/admin/settings', label: 'Platform Settings', icon: Settings },
];

export function AdminSidebar({ admin }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-4">
      <div className="rounded-2xl border border-electric-500/40 bg-navy-900/95 p-5 shadow-electric-sm space-y-3">
        <div className="flex items-center gap-2.5 text-electric-400">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span className="text-xs font-black uppercase tracking-widest">
            Admin Command Center
          </span>
        </div>
        <div>
          <p className="truncate text-sm font-bold text-white">{admin.full_name}</p>
          <p className="truncate text-xs text-slate-400">{admin.email}</p>
        </div>
      </div>

      <nav
        aria-label="Admin dashboard navigation"
        className="rounded-2xl border border-slate-800 bg-navy-900/90 p-3 space-y-1"
      >
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href ||
              (pathname.startsWith(`${item.href}/`) && item.href !== '/admin/players');
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
      </nav>
    </aside>
  );
}
