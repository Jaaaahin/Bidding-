import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-electric-500/40 bg-electric-500/10 text-electric-400">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-3xl font-black tracking-tight text-white">
        404 — Listing or Page Not Found
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        The player listing or auction page you requested does not exist or has been unpublished by
        an administrator.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          href="/players"
          className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-6 py-3 text-sm font-bold text-navy-950 shadow-electric-sm hover:bg-electric-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Browse All Players</span>
        </Link>
      </div>
    </div>
  );
}
