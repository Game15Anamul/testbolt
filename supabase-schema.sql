-- Cricket Auction Platform Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create auctions table
CREATE TABLE IF NOT EXISTS auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'paused', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  name text NOT NULL,
  password_hash text NOT NULL,
  budget_total integer NOT NULL DEFAULT 100,
  budget_remaining integer NOT NULL DEFAULT 100,
  players_needed integer NOT NULL DEFAULT 4,
  created_at timestamptz DEFAULT now()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_price integer NOT NULL DEFAULT 5,
  skill text DEFAULT 'All-Rounder' CHECK (skill IN ('Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper')),
  status text NOT NULL DEFAULT 'unsold' CHECK (status IN ('unsold', 'on_block', 'sold', 'passed')),
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  final_price integer,
  created_at timestamptz DEFAULT now()
);

-- Create auction_state table
CREATE TABLE IF NOT EXISTS auction_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE UNIQUE,
  current_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  current_bid integer,
  current_bidder_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  timer_started_at timestamptz,
  timer_ends_at timestamptz,
  timer_paused boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Create bids table
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create auction_log table
CREATE TABLE IF NOT EXISTS auction_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('bid', 'sold', 'passed', 'timer_reset', 'auction_started', 'auction_paused', 'auction_resumed')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view auctions" ON auctions;
DROP POLICY IF EXISTS "Authenticated users can manage auctions" ON auctions;
DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can manage teams" ON teams;
DROP POLICY IF EXISTS "Anyone can view players" ON players;
DROP POLICY IF EXISTS "Authenticated users can manage players" ON players;
DROP POLICY IF EXISTS "Anyone can view auction state" ON auction_state;
DROP POLICY IF EXISTS "Authenticated users can manage auction state" ON auction_state;
DROP POLICY IF EXISTS "Anyone can view bids" ON bids;
DROP POLICY IF EXISTS "Authenticated users can create bids" ON bids;
DROP POLICY IF EXISTS "Anyone can view auction log" ON auction_log;
DROP POLICY IF EXISTS "Authenticated users can create log entries" ON auction_log;

-- RLS Policies for auctions (public read)
CREATE POLICY "Anyone can view auctions"
  ON auctions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage auctions"
  ON auctions FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for teams (public read for dashboard)
CREATE POLICY "Anyone can view teams"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage teams"
  ON teams FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for players (public read)
CREATE POLICY "Anyone can view players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage players"
  ON players FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for auction_state (public read)
CREATE POLICY "Anyone can view auction state"
  ON auction_state FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage auction state"
  ON auction_state FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for bids (public read for transparency)
CREATE POLICY "Anyone can view bids"
  ON bids FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create bids"
  ON bids FOR INSERT
  WITH CHECK (true);

-- RLS Policies for auction_log (public read)
CREATE POLICY "Anyone can view auction log"
  ON auction_log FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create log entries"
  ON auction_log FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_auction_id ON teams(auction_id);
CREATE INDEX IF NOT EXISTS idx_players_auction_id ON players(auction_id);
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_player_id ON bids(player_id);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_log_auction_id ON auction_log(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_log_created_at ON auction_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_state_auction_id ON auction_state(auction_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_auctions_updated_at ON auctions;
DROP TRIGGER IF EXISTS update_auction_state_updated_at ON auction_state;

-- Create triggers for updated_at
CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auction_state_updated_at
  BEFORE UPDATE ON auction_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
