import React from 'react';
import { notFound } from 'next/navigation';
import { Edit3 } from 'lucide-react';
import { requireAdminUser } from '@/lib/auth/session';
import { getPlayerById } from '@/lib/db/repository';
import { PlayerForm } from '@/components/admin/PlayerForm';

export const dynamic = 'force-dynamic';

interface EditPlayerPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditPlayerPage({ params }: EditPlayerPageProps) {
  await requireAdminUser();
  const { id } = await params;
  const { player } = await getPlayerById(id, true);

  if (!player) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
          <Edit3 className="h-4 w-4" />
          <span>Edit Player Listing</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
          Edit {player.full_name}
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Update player profile details, photograph, bidding parameters, publication visibility, and
          Asia/Dhaka auction schedule.
        </p>
      </div>

      <PlayerForm initialPlayer={player} />
    </div>
  );
}
