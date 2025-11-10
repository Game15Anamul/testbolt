import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      auctions: {
        Row: {
          id: string;
          name: string;
          status: 'setup' | 'active' | 'paused' | 'completed';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['auctions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['auctions']['Insert']>;
      };
      teams: {
        Row: {
          id: string;
          auction_id: string;
          name: string;
          password_hash: string;
          budget_total: number;
          budget_remaining: number;
          players_needed: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      players: {
        Row: {
          id: string;
          auction_id: string;
          name: string;
          base_price: number;
          skill: 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';
          status: 'unsold' | 'on_block' | 'sold' | 'passed';
          team_id: string | null;
          final_price: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
      };
      auction_state: {
        Row: {
          id: string;
          auction_id: string;
          current_player_id: string | null;
          current_bid: number | null;
          current_bidder_team_id: string | null;
          timer_started_at: string | null;
          timer_ends_at: string | null;
          timer_paused: boolean;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['auction_state']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['auction_state']['Insert']>;
      };
      bids: {
        Row: {
          id: string;
          auction_id: string;
          player_id: string;
          team_id: string;
          amount: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bids']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bids']['Insert']>;
      };
      auction_log: {
        Row: {
          id: string;
          auction_id: string;
          event_type: 'bid' | 'sold' | 'passed' | 'timer_reset' | 'auction_started' | 'auction_paused' | 'auction_resumed';
          message: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['auction_log']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['auction_log']['Insert']>;
      };
    };
  };
};
