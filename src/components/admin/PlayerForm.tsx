'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload,
  Save,
  ArrowLeft,
  CalendarClock,
  DollarSign,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { savePlayerAction, uploadPlayerPhotoAction } from '@/app/actions/admin';
import { utcToDhakaInputString } from '@/lib/timezone';
import { useToast } from '@/components/ui/ToastProvider';
import type { PlayerPosition, PlayerWithAuction } from '@/types/database';

interface PlayerFormProps {
  initialPlayer?: PlayerWithAuction | null;
}

const PRESET_PORTRAITS = [
  { label: 'Argentina #9 Kit', url: '/players/mateo-valiente.svg' },
  { label: 'Morocco #8 Kit', url: '/players/zayan-al-mansoor.svg' },
  { label: 'Sweden #4 Kit', url: '/players/lukas-lindqvist.svg' },
  { label: 'Japan #10 Kit', url: '/players/kenji-takahashi.svg' },
  { label: 'Portugal #1 GK Kit', url: '/players/diogo-monteiro.svg' },
  { label: 'Ghana #7 Kit', url: '/players/kofi-mensah.svg' },
  { label: 'Bangladesh #2 Kit', url: '/players/farhan-chowdhury.svg' },
  { label: 'Brazil #11 Kit', url: '/players/rafael-costa.svg' },
];

export function PlayerForm({ initialPlayer }: PlayerFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditing = Boolean(initialPlayer?.id);

  // Default start: +1 hour from now; Default end: +25 hours from now
  const defaultStart = utcToDhakaInputString(new Date(Date.now() + 3600 * 1000));
  const defaultEnd = utcToDhakaInputString(new Date(Date.now() + 25 * 3600 * 1000));

  const [fullName, setFullName] = useState(initialPlayer?.full_name || '');
  const [photoUrl, setPhotoUrl] = useState(
    initialPlayer?.photo_url || '/players/default-player.svg'
  );
  const [photoStoragePath, setPhotoStoragePath] = useState<string | null>(
    initialPlayer?.photo_storage_path || null
  );
  const [age, setAge] = useState(String(initialPlayer?.age || 23));
  const [nationality, setNationality] = useState(initialPlayer?.nationality || '');
  const [position, setPosition] = useState<PlayerPosition>(
    initialPlayer?.position || 'Forward'
  );
  const [currentClub, setCurrentClub] = useState(initialPlayer?.current_club || '');
  const [description, setDescription] = useState(initialPlayer?.description || '');
  const [startingBid, setStartingBid] = useState(
    String(initialPlayer?.starting_bid || 250000)
  );
  const [minimumBidIncrement, setMinimumBidIncrement] = useState(
    String(initialPlayer?.minimum_bid_increment || 10000)
  );
  const [auctionStartDhaka, setAuctionStartDhaka] = useState(
    initialPlayer ? utcToDhakaInputString(initialPlayer.auction_start_time) : defaultStart
  );
  const [auctionEndDhaka, setAuctionEndDhaka] = useState(
    initialPlayer ? utcToDhakaInputString(initialPlayer.auction_end_time) : defaultEnd
  );
  const [isPublished, setIsPublished] = useState(
    initialPlayer ? initialPlayer.is_published : true
  );

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadPlayerPhotoAction(formData);
      if (!res.success || !res.photoUrl) {
        setError(res.error || 'Image upload failed.');
        showToast({
          title: 'Upload Failed',
          description: res.error || 'Could not upload player photograph.',
          variant: 'error',
        });
        return;
      }
      setPhotoUrl(res.photoUrl);
      setPhotoStoragePath(res.storagePath || null);
      showToast({
        title: 'Photograph Uploaded',
        description: 'Player photograph uploaded and verified.',
        variant: 'success',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await savePlayerAction({
        id: initialPlayer?.id,
        fullName,
        photoUrl,
        photoStoragePath,
        age: Number(age),
        nationality,
        position,
        currentClub,
        description,
        startingBid: Number(startingBid),
        minimumBidIncrement: Number(minimumBidIncrement),
        auctionStartDhaka,
        auctionEndDhaka,
        isPublished,
        isDemo: initialPlayer ? initialPlayer.is_demo : false,
      });

      if (!res.success) {
        setError(res.error || 'Failed to save player listing.');
        showToast({
          title: 'Validation Error',
          description: res.error || 'Please review the form fields.',
          variant: 'error',
        });
        return;
      }

      showToast({
        title: isEditing ? 'Player Listing Updated' : 'Player Listing Created',
        description: `${fullName} has been saved to the database.`,
        variant: 'success',
      });

      router.push('/admin/players');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-500/50 bg-red-950/30 p-4 text-sm text-red-200"
        >
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Player Photograph & Publication Status */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Player Photograph
            </h2>

            <div className="relative h-72 w-full overflow-hidden rounded-xl border border-slate-800 bg-navy-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl || '/players/default-player.svg'}
                alt={fullName || 'Player preview'}
                className="h-full w-full object-cover object-top"
              />
            </div>

            <div>
              <label
                htmlFor="player-photo-upload"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-electric-500/40 bg-electric-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-electric-400 hover:bg-electric-500/20 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>{uploadingPhoto ? 'Uploading Photo...' : 'Upload Photo (Max 5MB)'}</span>
                <input
                  id="player-photo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  disabled={uploadingPhoto}
                  className="sr-only"
                />
              </label>
              <p className="mt-1.5 text-[11px] text-slate-400 text-center">
                Supports JPEG, PNG, WebP, or SVG via Supabase Storage
              </p>
            </div>

            <div>
              <label
                htmlFor="photo-url-input"
                className="block text-xs font-semibold text-slate-400 mb-1"
              >
                Or Image URL / Studio Kit Preset
              </label>
              <input
                id="photo-url-input"
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-navy-950 px-3 py-2 text-xs text-white focus:border-electric-500 focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESET_PORTRAITS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setPhotoUrl(preset.url)}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
                      photoUrl === preset.url
                        ? 'border-electric-500 bg-electric-500/20 text-electric-400'
                        : 'border-slate-800 bg-navy-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Publication Status Box */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Visibility &amp; Publishing
            </h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-navy-950 text-electric-500 focus:ring-electric-500"
              />
              <div>
                <span className="block text-sm font-bold text-white">
                  Publish Player to Public Marketplace
                </span>
                <span className="block text-xs text-slate-400 mt-0.5">
                  When unchecked, the listing is saved as a private Draft visible only to
                  administrators and blocked from receiving bids.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Right Column: Biographical Info, Valuation & Auction Schedule */}
        <div className="lg:col-span-8 space-y-6">
          {/* Biographical Profile */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="h-5 w-5 text-electric-400" />
              <h2 className="text-base font-extrabold text-white">Player Profile Details</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="player-full-name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Full Name *
                </label>
                <input
                  id="player-full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Emiliano Martinez-Vega"
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="player-position"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Playing Position *
                </label>
                <select
                  id="player-position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
                >
                  <option value="Forward">Forward</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Defender">Defender</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="player-age"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Age (15–55) *
                </label>
                <input
                  id="player-age"
                  type="number"
                  min={15}
                  max={55}
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="player-nationality"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Nationality *
                </label>
                <input
                  id="player-nationality"
                  type="text"
                  required
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g., Argentina, Bangladesh, Spain"
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="player-club"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Current Club *
                </label>
                <input
                  id="player-club"
                  type="text"
                  required
                  value={currentClub}
                  onChange={(e) => setCurrentClub(e.target.value)}
                  placeholder="e.g., Dhaka Mariners FC"
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="player-description"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Scouting Report &amp; Player Description *
                </label>
                <textarea
                  id="player-description"
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide tactical profile, career highlights, key strengths, and physical attributes..."
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Valuation & Bid Rules */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <DollarSign className="h-5 w-5 text-electric-400" />
              <h2 className="text-base font-extrabold text-white">
                Valuation &amp; Bidding Rules (USD)
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="starting-bid"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Starting Bid Price ($) *
                </label>
                <input
                  id="starting-bid"
                  type="number"
                  step="0.01"
                  min={1}
                  required
                  value={startingBid}
                  onChange={(e) => setStartingBid(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm font-bold text-white focus:border-electric-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Minimum amount required for the opening bid.
                </p>
              </div>

              <div>
                <label
                  htmlFor="min-increment"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Minimum Bid Increment ($) *
                </label>
                <input
                  id="min-increment"
                  type="number"
                  step="0.01"
                  min={1}
                  required
                  value={minimumBidIncrement}
                  onChange={(e) => setMinimumBidIncrement(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm font-bold text-white focus:border-electric-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Every subsequent bid must exceed the highest bid by at least this amount.
                </p>
              </div>
            </div>
          </div>

          {/* Auction Window Schedule */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-electric-400" />
                <h2 className="text-base font-extrabold text-white">Auction Schedule</h2>
              </div>
              <span className="rounded-lg bg-electric-500/15 border border-electric-500/30 px-2.5 py-1 text-[11px] font-bold text-electric-400">
                Asia/Dhaka (Bangladesh Standard Time, UTC+6)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="auction-start-time"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Auction Start Date &amp; Time (BST) *
                </label>
                <input
                  id="auction-start-time"
                  type="datetime-local"
                  required
                  value={auctionStartDhaka}
                  onChange={(e) => setAuctionStartDhaka(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="auction-end-time"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Auction End Date &amp; Time (BST) *
                </label>
                <input
                  id="auction-end-time"
                  type="datetime-local"
                  required
                  value={auctionEndDhaka}
                  onChange={(e) => setAuctionEndDhaka(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-electric-400 shrink-0" />
              <span>
                Schedules are entered in Bangladesh Standard Time (`Asia/Dhaka`) and stored in the
                PostgreSQL database in canonical UTC (`TIMESTAMPTZ`).
              </span>
            </p>
          </div>

          {/* Submit Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <Link
              href="/admin/players"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-navy-800 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-navy-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Cancel</span>
            </Link>

            <button
              type="submit"
              disabled={submitting || uploadingPhoto}
              className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-8 py-3 text-sm font-black uppercase tracking-wider text-navy-950 shadow-electric-glow hover:bg-electric-400 transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>
                {submitting
                  ? 'Saving Listing...'
                  : isEditing
                  ? 'Save Changes'
                  : 'Create Player & Auction'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
