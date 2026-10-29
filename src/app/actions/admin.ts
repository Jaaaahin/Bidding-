'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { dhakaInputStringToUtcIso } from '@/lib/timezone';
import {
  adminDeletePlayer,
  adminMarkTransactionSold,
  adminTogglePublishPlayer,
  adminUpsertPlayer,
  finalizeAuctionTransaction,
  promoteUserToAdminServerSide,
} from '@/lib/db/repository';
import type { PlayerPosition } from '@/types/database';

function revalidateAllMarketplacePaths(playerId?: string) {
  revalidatePath('/');
  revalidatePath('/players');
  if (playerId) {
    revalidatePath(`/players/${playerId}`);
    revalidatePath(`/admin/players/${playerId}/edit`);
    revalidatePath(`/admin/auctions/${playerId}`);
  }
  revalidatePath('/auctions/upcoming');
  revalidatePath('/auctions/live');
  revalidatePath('/auctions/completed');
  revalidatePath('/dashboard');
  revalidatePath('/admin');
  revalidatePath('/admin/players');
  revalidatePath('/admin/auctions');
  revalidatePath('/admin/bids');
  revalidatePath('/admin/results');
}

export async function savePlayerAction(input: {
  id?: string;
  fullName: string;
  photoUrl: string;
  photoStoragePath?: string | null;
  age: number;
  nationality: string;
  position: PlayerPosition;
  currentClub: string;
  description: string;
  startingBid: number;
  minimumBidIncrement: number;
  auctionStartDhaka: string;
  auctionEndDhaka: string;
  isPublished: boolean;
  isDemo?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can create or edit player listings.',
      };
    }

    const startUtcIso = dhakaInputStringToUtcIso(input.auctionStartDhaka);
    const endUtcIso = dhakaInputStringToUtcIso(input.auctionEndDhaka);

    const saved = await adminUpsertPlayer({
      id: input.id,
      full_name: input.fullName,
      photo_url: input.photoUrl,
      photo_storage_path: input.photoStoragePath || null,
      age: Number(input.age),
      nationality: input.nationality,
      position: input.position,
      current_club: input.currentClub,
      description: input.description,
      starting_bid: Number(input.startingBid),
      minimum_bid_increment: Number(input.minimumBidIncrement),
      auction_start_time: startUtcIso,
      auction_end_time: endUtcIso,
      is_published: Boolean(input.isPublished),
      is_demo: Boolean(input.isDemo),
      admin_id: profile.id,
    });

    revalidateAllMarketplacePaths(saved.id);
    return { success: true, id: saved.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save player listing.',
    };
  }
}

export async function togglePublishPlayerAction(
  playerId: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin permissions required.' };
    }

    await adminTogglePublishPlayer({
      playerId,
      isPublished,
      adminId: profile.id,
    });

    revalidateAllMarketplacePaths(playerId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update publication status.',
    };
  }
}

export async function deletePlayerAction(
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin permissions required.' };
    }

    await adminDeletePlayer({
      playerId,
      adminId: profile.id,
    });

    revalidateAllMarketplacePaths(playerId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete player listing.',
    };
  }
}

export async function finalizeAuctionAdminAction(
  auctionOrPlayerId: string,
  forceAdmin = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin permissions required.' };
    }

    await finalizeAuctionTransaction({
      auctionOrPlayerId,
      forceAdmin,
    });

    revalidateAllMarketplacePaths(auctionOrPlayerId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to finalize auction.',
    };
  }
}

export async function markTransactionSoldAdminAction(
  auctionOrPlayerId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin permissions required.' };
    }

    await adminMarkTransactionSold({
      auctionOrPlayerId,
      adminId: profile.id,
      notes,
    });

    revalidateAllMarketplacePaths(auctionOrPlayerId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to mark transaction as sold.',
    };
  }
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadPlayerPhotoAction(formData: FormData): Promise<{
  success: boolean;
  photoUrl?: string;
  storagePath?: string;
  error?: string;
}> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return {
        success: false,
        error: 'Unauthorized: Only administrators can upload player photographs.',
      };
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return { success: false, error: 'Please select an image file to upload.' };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Unsupported image format. Allowed types: JPEG, PNG, WebP, SVG.',
      };
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return {
        success: false,
        error: 'Image size exceeds the 5MB maximum limit.',
      };
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext) ? ext : 'png';
    const fileName = `player-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${safeExt}`;
    const storagePath = `players/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { isConfigured, bucket } = getSupabasePublicConfig();

    if (isConfigured) {
      const supabase =
        createServiceRoleSupabaseClient() || (await createServerSupabaseClient());
      if (supabase) {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          return { success: false, error: `Storage upload failed: ${uploadError.message}` };
        }

        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
        return {
          success: true,
          photoUrl: publicUrlData.publicUrl,
          storagePath,
        };
      }
    }

    // Local development / fallback persistent file storage
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'players');
      fs.mkdirSync(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);
      return {
        success: true,
        photoUrl: `/uploads/players/${fileName}`,
        storagePath,
      };
    } catch {
      // If running on a read-only filesystem without Supabase Storage configured, return inline data URL
      const base64 = buffer.toString('base64');
      return {
        success: true,
        photoUrl: `data:${file.type};base64,${base64}`,
        storagePath,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload image.',
    };
  }
}

export async function promoteAdminBootstrapAction(input: {
  targetEmail: string;
  bootstrapSecret?: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const currentUser = await getCurrentUserProfile();
    const updated = await promoteUserToAdminServerSide({
      targetEmailOrId: input.targetEmail,
      bootstrapSecret: input.bootstrapSecret,
      actingAdminId: currentUser?.role === 'admin' ? currentUser.id : undefined,
    });

    revalidatePath('/admin');
    revalidatePath('/admin/settings');
    revalidatePath('/dashboard');
    return {
      success: true,
      message: `${updated.full_name} (${updated.email}) is now an Administrator.`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to promote user to admin.',
    };
  }
}
