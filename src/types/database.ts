export type UserRole = 'user' | 'admin';

export type PlayerPosition = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';

export type AuctionStatus =
  | 'draft'
  | 'upcoming'
  | 'live'
  | 'ended'
  | 'sold'
  | 'unsold'
  | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  favorite_club: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  full_name: string;
  photo_url: string;
  photo_storage_path: string | null;
  age: number;
  nationality: string;
  position: PlayerPosition;
  current_club: string;
  description: string;
  starting_bid: number;
  minimum_bid_increment: number;
  current_highest_bid: number | null;
  auction_start_time: string;
  auction_end_time: string;
  auction_status: AuctionStatus;
  is_published: boolean;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Auction {
  id: string;
  player_id: string;
  starting_bid: number;
  minimum_bid_increment: number;
  current_highest_bid: number | null;
  highest_bidder_id: string | null;
  bid_count: number;
  start_time: string;
  end_time: string;
  status: AuctionStatus;
  is_published: boolean;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionResult {
  id: string;
  auction_id: string;
  player_id: string;
  winning_bid_id: string | null;
  winner_id: string | null;
  final_amount: number | null;
  outcome: 'sold' | 'unsold' | 'pending_settlement';
  transaction_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  finalized_at: string;
  notes: string | null;
}

export interface Bid {
  id: string;
  auction_id: string;
  player_id: string;
  bidder_id: string;
  amount: number;
  previous_highest_bid: number | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface BidWithDetails extends Bid {
  bidder_name: string;
  bidder_email?: string;
  player_name?: string;
  player_photo?: string;
  player_position?: PlayerPosition;
  player_club?: string;
  auction_status?: AuctionStatus;
  current_highest_bid?: number | null;
  highest_bidder_id?: string | null;
  is_winning_bid?: boolean;
}

export interface PlayerWithAuction extends Player {
  auction_id: string;
  highest_bidder_id: string | null;
  highest_bidder_name: string | null;
  bid_count: number;
  effective_status: AuctionStatus;
  next_minimum_bid: number;
  result?: {
    id: string;
    outcome: 'sold' | 'unsold' | 'pending_settlement';
    winner_id: string | null;
    winner_name: string | null;
    final_amount: number | null;
    transaction_completed: boolean;
    completed_at: string | null;
    finalized_at: string;
    notes: string | null;
  } | null;
}

export interface PlayerFilterParams {
  search?: string;
  nationality?: string;
  position?: string;
  status?: string;
  sortBy?: 'ending_soon' | 'starting_price_asc' | 'starting_price_desc' | 'highest_bid_desc' | 'newest';
  page?: number;
  pageSize?: number;
  includeUnpublished?: boolean;
  demoFilter?: 'all' | 'real_only' | 'demo_only';
}

export interface PaginatedPlayersResult {
  players: PlayerWithAuction[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  nationalities: string[];
  serverTimeUtc: string;
}

export interface AdminSummaryStats {
  totalPlayers: number;
  publishedPlayers: number;
  draftPlayers: number;
  demoPlayers: number;
  upcomingAuctions: number;
  liveAuctions: number;
  completedAuctions: number;
  soldPlayers: number;
  unsoldPlayers: number;
  totalBids: number;
  totalBidVolume: number;
  completedTransactions: number;
}

export interface UserDashboardSummary {
  totalBidsPlaced: number;
  activeAuctionsParticipating: number;
  currentlyLeadingCount: number;
  auctionsWonCount: number;
  totalCommittedAmount: number;
}
