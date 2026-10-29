'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  Gavel,
  ExternalLink,
} from 'lucide-react';
import {
  deletePlayerAction,
  finalizeAuctionAdminAction,
  markTransactionSoldAdminAction,
  togglePublishPlayerAction,
} from '@/app/actions/admin';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import type { PlayerWithAuction } from '@/types/database';

interface AdminPlayerRowActionsProps {
  player: PlayerWithAuction;
  showSettlementActions?: boolean;
}

export function AdminPlayerRowActions({
  player,
  showSettlementActions = false,
}: AdminPlayerRowActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [isBusy, setIsBusy] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [confirmSoldOpen, setConfirmSoldOpen] = useState(false);
  const [settlementNotes, setSettlementNotes] = useState(
    player.result?.notes || 'Verified transfer payment & contract clearance.'
  );

  const handleTogglePublish = async () => {
    setIsBusy(true);
    try {
      const nextPub = !player.is_published;
      const res = await togglePublishPlayerAction(player.id, nextPub);
      if (!res.success) {
        showToast({
          title: 'Action Failed',
          description: res.error || 'Could not update publish status.',
          variant: 'error',
        });
        return;
      }
      showToast({
        title: nextPub ? 'Listing Published' : 'Listing Unpublished',
        description: `${player.full_name} is now ${nextPub ? 'visible on the public marketplace' : 'hidden as a draft'}.`,
        variant: 'success',
      });
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    setIsBusy(true);
    try {
      const res = await deletePlayerAction(player.id);
      if (!res.success) {
        showToast({
          title: 'Delete Failed',
          description: res.error || 'Could not delete player listing.',
          variant: 'error',
        });
        return;
      }
      setConfirmDeleteOpen(false);
      showToast({
        title: 'Player Listing Deleted',
        description: `${player.full_name} has been permanently removed.`,
        variant: 'info',
      });
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const handleFinalize = async () => {
    setIsBusy(true);
    try {
      const res = await finalizeAuctionAdminAction(player.id, true);
      if (!res.success) {
        showToast({
          title: 'Finalization Failed',
          description: res.error || 'Could not finalize auction.',
          variant: 'error',
        });
        return;
      }
      setConfirmFinalizeOpen(false);
      showToast({
        title: 'Auction Finalized',
        description: `Winner and outcome recorded for ${player.full_name}.`,
        variant: 'success',
      });
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const handleMarkSold = async () => {
    setIsBusy(true);
    try {
      const res = await markTransactionSoldAdminAction(player.id, settlementNotes);
      if (!res.success) {
        showToast({
          title: 'Operation Failed',
          description: res.error || 'Could not mark transaction as completed.',
          variant: 'error',
        });
        return;
      }
      setConfirmSoldOpen(false);
      showToast({
        title: 'Transaction Marked Completed & Sold',
        description: `${player.full_name} settlement has been officially recorded.`,
        variant: 'success',
      });
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const canFinalize =
    player.effective_status === 'live' || player.effective_status === 'ended';
  const canMarkSold =
    player.current_highest_bid !== null &&
    player.current_highest_bid > 0 &&
    !player.result?.transaction_completed;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`/admin/auctions/${player.id}`}
          title="Inspect auction & bids"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-electric-500/50 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5 text-electric-400" />
          <span>Details</span>
        </Link>

        <Link
          href={`/admin/players/${player.id}/edit`}
          title="Edit player & schedule"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-sky-400/50 hover:text-white"
        >
          <Edit3 className="h-3.5 w-3.5 text-sky-400" />
          <span>Edit</span>
        </Link>

        <button
          type="button"
          disabled={isBusy}
          onClick={handleTogglePublish}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            player.is_published
              ? 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-950/50'
              : 'border-electric-500/40 bg-electric-500/15 text-electric-400 hover:bg-electric-500/25'
          }`}
        >
          {player.is_published ? (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              <span>Unpublish</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span>Publish</span>
            </>
          )}
        </button>

        {showSettlementActions && canFinalize && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setConfirmFinalizeOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-950/40 px-2.5 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-900/50"
          >
            <Gavel className="h-3.5 w-3.5" />
            <span>Finalize</span>
          </button>
        )}

        {showSettlementActions && canMarkSold && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setConfirmSoldOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Mark Sold &amp; Settled</span>
          </button>
        )}

        <button
          type="button"
          disabled={isBusy}
          onClick={() => setConfirmDeleteOpen(true)}
          title="Delete listing"
          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-950/30 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Delete ${player.full_name}?`}
        description="This action permanently deletes the player listing, auction schedule, and associated records from the database."
        confirmLabel="Delete Permanently"
        variant="danger"
        isLoading={isBusy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {/* Finalize Auction Modal */}
      <ConfirmDialog
        open={confirmFinalizeOpen}
        title={`Finalize Auction for ${player.full_name}?`}
        description="This will close bidding immediately, determine the highest valid bidder on the server, and record the final outcome (Sold or Unsold)."
        confirmLabel="Finalize Auction Now"
        variant="primary"
        isLoading={isBusy}
        onConfirm={handleFinalize}
        onCancel={() => setConfirmFinalizeOpen(false)}
      />

      {/* Mark Transaction Completed & Sold Modal */}
      <ConfirmDialog
        open={confirmSoldOpen}
        title={`Complete Transfer Settlement — ${player.full_name}`}
        description={`Confirm that the winning bid by ${
          player.result?.winner_name || player.highest_bidder_name || 'the highest bidder'
        } has been settled and mark this transaction as officially completed.`}
        confirmLabel="Confirm Settlement & Mark Sold"
        variant="primary"
        isLoading={isBusy}
        onConfirm={handleMarkSold}
        onCancel={() => setConfirmSoldOpen(false)}
      >
        <div>
          <label
            htmlFor={`settlement-notes-${player.id}`}
            className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
          >
            Official Settlement Notes
          </label>
          <textarea
            id={`settlement-notes-${player.id}`}
            rows={2}
            value={settlementNotes}
            onChange={(e) => setSettlementNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-navy-950 px-3 py-2 text-xs text-white focus:border-electric-500 focus:outline-none"
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
