import React from 'react';
import Link from 'next/link';
import { Gavel, ShieldCheck, Globe, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-navy-950 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-electric-500 text-navy-950">
                <Gavel className="h-5 w-5 stroke-[2.5]" />
              </div>
              <span className="text-lg font-black tracking-tight text-white">
                FOOT<span className="text-electric-500">BID</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Official Football Player Bidding &amp; Transfer Auction Platform. Built with
              concurrency-safe PostgreSQL row locking, Row Level Security, and real-time auction
              synchronization.
            </p>
            <div className="flex items-center gap-2 text-xs text-electric-400 font-semibold pt-1">
              <Clock className="h-3.5 w-3.5" />
              <span>All Schedules in Asia/Dhaka (BST, UTC+6)</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Marketplace</h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/players" className="hover:text-electric-400 transition-colors">
                  All Published Players
                </Link>
              </li>
              <li>
                <Link href="/auctions/live" className="hover:text-electric-400 transition-colors">
                  Live Auctions
                </Link>
              </li>
              <li>
                <Link href="/auctions/upcoming" className="hover:text-electric-400 transition-colors">
                  Upcoming Auctions
                </Link>
              </li>
              <li>
                <Link href="/auctions/completed" className="hover:text-electric-400 transition-colors">
                  Completed &amp; Sold Results
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Bidder Portal</h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-electric-400 transition-colors">
                  User Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/my-bids" className="hover:text-electric-400 transition-colors">
                  My Active Bids
                </Link>
              </li>
              <li>
                <Link href="/dashboard/history" className="hover:text-electric-400 transition-colors">
                  Bidding Audit History
                </Link>
              </li>
              <li>
                <Link href="/dashboard/results" className="hover:text-electric-400 transition-colors">
                  My Auction Results
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Security &amp; Governance
            </h3>
            <ul className="mt-3 space-y-2.5 text-xs">
              <li className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-electric-400 shrink-0 mt-0.5" />
                <span>PostgreSQL row-level locking (`FOR UPDATE`) on every bid</span>
              </li>
              <li className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <span>Server-authoritative UTC validation &amp; RLS policies</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} FootBid Football Auction Platform. All rights reserved.</p>
          <p>Fictional sample players are flagged as demo records and separated from live club data.</p>
        </div>
      </div>
    </footer>
  );
}
