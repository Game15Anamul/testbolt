export type AuctionStatus = 'setup' | 'active' | 'paused' | 'completed';
export type PlayerStatus = 'unsold' | 'on_block' | 'sold' | 'passed';
export type PlayerSkill = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';
export type EventType = 'bid' | 'sold' | 'passed' | 'timer_reset' | 'auction_started' | 'auction_paused' | 'auction_resumed';

export interface Auction {
  id: string;
  name: string;
  status: AuctionStatus;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  auction_id: string;
  name: string;
  password_hash: string;
  budget_total: number;
  budget_remaining: number;
  players_needed: number;
  created_at: string;
}

export interface Player {
  id: string;
  auction_id: string;
  name: string;
  base_price: number;
  skill: PlayerSkill;
  status: PlayerStatus;
  team_id: string | null;
  final_price: number | null;
  created_at: string;
}

export interface AuctionState {
  id: string;
  auction_id: string;
  current_player_id: string | null;
  current_bid: number | null;
  current_bidder_team_id: string | null;
  timer_started_at: string | null;
  timer_ends_at: string | null;
  timer_paused: boolean;
  updated_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  player_id: string;
  team_id: string;
  amount: number;
  created_at: string;
}

export interface AuctionLog {
  id: string;
  auction_id: string;
  event_type: EventType;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TeamWithPlayers extends Team {
  players: Player[];
}
