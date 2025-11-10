import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Auction, Team, Player, AuctionState, Bid } from '../types';

interface AuctionContextType {
  auction: Auction | null;
  teams: Team[];
  players: Player[];
  auctionState: AuctionState | null;
  recentBids: Bid[];
  loading: boolean;
  refreshData: () => Promise<void>;
}

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

export const useAuction = () => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within AuctionProvider');
  }
  return context;
};

interface AuctionProviderProps {
  children: ReactNode;
  auctionId?: string;
}

export const AuctionProvider = ({ children, auctionId }: AuctionProviderProps) => {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [recentBids, setRecentBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      if (!auctionId) {
        const { data: auctions } = await supabase
          .from('auctions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (auctions) {
          setAuction(auctions);
          const currentAuctionId = auctions.id;

          const [teamsRes, playersRes, stateRes, bidsRes] = await Promise.all([
            supabase.from('teams').select('*').eq('auction_id', currentAuctionId),
            supabase.from('players').select('*').eq('auction_id', currentAuctionId),
            supabase.from('auction_state').select('*').eq('auction_id', currentAuctionId).maybeSingle(),
            supabase
              .from('bids')
              .select('*')
              .eq('auction_id', currentAuctionId)
              .order('created_at', { ascending: false })
              .limit(10),
          ]);

          setTeams(teamsRes.data || []);
          setPlayers(playersRes.data || []);
          setAuctionState(stateRes.data);
          setRecentBids(bidsRes.data || []);
        }
      } else {
        const [auctionRes, teamsRes, playersRes, stateRes, bidsRes] = await Promise.all([
          supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle(),
          supabase.from('teams').select('*').eq('auction_id', auctionId),
          supabase.from('players').select('*').eq('auction_id', auctionId),
          supabase.from('auction_state').select('*').eq('auction_id', auctionId).maybeSingle(),
          supabase
            .from('bids')
            .select('*')
            .eq('auction_id', auctionId)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        setAuction(auctionRes.data);
        setTeams(teamsRes.data || []);
        setPlayers(playersRes.data || []);
        setAuctionState(stateRes.data);
        setRecentBids(bidsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching auction data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const effectiveAuctionId = auctionId || auction?.id;
    if (!effectiveAuctionId) return;

    const teamsChannel = supabase
      .channel('teams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `auction_id=eq.${effectiveAuctionId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel('players-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `auction_id=eq.${effectiveAuctionId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const stateChannel = supabase
      .channel('state-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auction_state',
          filter: `auction_id=eq.${effectiveAuctionId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel('bids-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${effectiveAuctionId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      teamsChannel.unsubscribe();
      playersChannel.unsubscribe();
      stateChannel.unsubscribe();
      bidsChannel.unsubscribe();
    };
  }, [auctionId, auction?.id]);

  return (
    <AuctionContext.Provider
      value={{
        auction,
        teams,
        players,
        auctionState,
        recentBids,
        loading,
        refreshData: fetchData,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};
