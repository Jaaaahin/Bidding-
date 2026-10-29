'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ShieldCheck } from 'lucide-react';
import { updateProfileAction } from '@/app/actions/auth';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDhakaDateTime } from '@/lib/timezone';
import type { Profile } from '@/types/database';

interface ProfileSettingsFormProps {
  profile: Profile;
}

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(profile.full_name);
  const [favoriteClub, setFavoriteClub] = useState(profile.favorite_club || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updateProfileAction({
        fullName,
        favoriteClub,
        phone,
      });

      if (!res.success) {
        showToast({
          title: 'Update Failed',
          description: res.error || 'Could not update profile.',
          variant: 'error',
        });
        return;
      }

      showToast({
        title: 'Profile Updated',
        description: 'Your account settings have been saved.',
        variant: 'success',
      });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 shadow-card-dark space-y-6"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="profile-fullname"
            className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
          >
            Full Name *
          </label>
          <input
            id="profile-fullname"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="profile-email"
            className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5"
          >
            Account Email (Read-Only)
          </label>
          <input
            id="profile-email"
            type="email"
            disabled
            value={profile.email}
            className="w-full rounded-xl border border-slate-800 bg-navy-950/60 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
          />
        </div>

        <div>
          <label
            htmlFor="profile-role"
            className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5"
          >
            Security Role (Database Protected)
          </label>
          <input
            id="profile-role"
            type="text"
            disabled
            value={profile.role.toUpperCase()}
            className="w-full rounded-xl border border-slate-800 bg-navy-950/60 px-4 py-2.5 text-sm font-bold text-electric-400 cursor-not-allowed"
          />
        </div>

        <div>
          <label
            htmlFor="profile-club"
            className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
          >
            Club / Organization
          </label>
          <input
            id="profile-club"
            type="text"
            value={favoriteClub}
            onChange={(e) => setFavoriteClub(e.target.value)}
            placeholder="e.g., Dhaka Mariners FC"
            className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="profile-phone"
            className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
          >
            Contact Phone
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+880 17..."
            className="w-full rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-electric-400" />
            <span>Member since: {formatDhakaDateTime(profile.created_at)}</span>
          </p>
          <p>Account ID: <code className="text-slate-300">{profile.id}</code></p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-electric-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-navy-950 shadow-electric-sm hover:bg-electric-400 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
        </button>
      </div>
    </form>
  );
}
