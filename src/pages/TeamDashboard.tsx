import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuctionProvider, useAuction } from '../contexts/AuctionContext';
import { getTeamSession, clearTeamSession } from '../utils/auth';
import { calculateTimeRemaining, formatTime } from '../utils/timer';
import { Shield, DollarSign, Users, TrendingUp, Clock, ArrowLeft, Trophy } from 'lucide-react';

interface TeamDashboardProps {
  onNavigate: (page: 'landing' | 'admin' | 'team' | 'public') => void;
}

function TeamDashboardContent({ onNavigate }: TeamDashboardProps) {
  const session = getTeamSession();
  const { auction, teams, players, auctionState, refreshData } = useAuction();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [bidding, setBidding] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [wonPlayerName, setWonPlayerName] = useState('');
  const [wonPlayerPrice, setWonPlayerPrice] = useState(0);
  const [previousPlayerCount, setPreviousPlayerCount] = useState(0);

  const currentTeam = teams.find(t => t.id === session?.teamId);
  const currentPlayer = auctionState?.current_player_id
    ? players.find(p => p.id === auctionState.current_player_id)
    : null;
  const currentBidderTeam = auctionState?.current_bidder_team_id
    ? teams.find(t => t.id === auctionState.current_bidder_team_id)
    : null;
  const myPlayers = players.filter(p => p.team_id === session?.teamId && p.status === 'sold');
  const unsoldPlayers = players.filter(p => p.status === 'unsold');

  useEffect(() => {
    const interval = setInterval(() => {
      if (auctionState?.timer_ends_at && !auctionState.timer_paused) {
        setTimeRemaining(calculateTimeRemaining(auctionState.timer_ends_at));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [auctionState]);

  useEffect(() => {
    if (!currentTeam) return;

    if (myPlayers.length > previousPlayerCount && myPlayers.length > 0) {
      const latestPlayer = myPlayers[myPlayers.length - 1];
      setWonPlayerName(latestPlayer.name);
      setWonPlayerPrice(latestPlayer.final_price || 0);
      setShowSuccessPopup(true);

      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);
    }

    setPreviousPlayerCount(myPlayers.length);
  }, [myPlayers.length, currentTeam]);

  const handlePlaceBid = async () => {
    if (!auction || !auctionState || !currentPlayer || !currentTeam || bidding) return;

    const nextBid = (auctionState.current_bid || currentPlayer.base_price) + 1;

    if (nextBid > currentTeam.budget_remaining) {
      alert('Insufficient budget!');
      return;
    }

    const minBudgetNeeded = currentTeam.players_needed * 5;
    if (currentTeam.budget_remaining - nextBid < minBudgetNeeded) {
      const confirmBid = window.confirm(
        `This bid will leave you with ${currentTeam.budget_remaining - nextBid} points. ` +
        `You need at least ${minBudgetNeeded} points for ${currentTeam.players_needed} more player(s). Continue?`
      );
      if (!confirmBid) return;
    }

    setBidding(true);

    try {
      const shouldResetTimer = timeRemaining <= 5 && timeRemaining > 0;

      await supabase.from('bids').insert({
        auction_id: auction.id,
        player_id: currentPlayer.id,
        team_id: currentTeam.id,
        amount: nextBid,
      });

      let newEndsAt = auctionState.timer_ends_at;

      if (shouldResetTimer) {
        const now = new Date();
        newEndsAt = new Date(now.getTime() + 15000).toISOString();

        await supabase.from('auction_log').insert({
          auction_id: auction.id,
          event_type: 'timer_reset',
          message: `Timer reset to 15 seconds after ${currentTeam.name} bid in final 5 seconds`,
          metadata: { team_id: currentTeam.id, team_name: currentTeam.name },
        });
      }

      await supabase
        .from('auction_state')
        .update({
          current_bid: nextBid,
          current_bidder_team_id: currentTeam.id,
          timer_ends_at: newEndsAt,
        })
        .eq('id', auctionState.id);

      await supabase.from('auction_log').insert({
        auction_id: auction.id,
        event_type: 'bid',
        message: `${currentTeam.name} bid ${nextBid} points for ${currentPlayer.name}`,
        metadata: {
          team_id: currentTeam.id,
          team_name: currentTeam.name,
          player_id: currentPlayer.id,
          player_name: currentPlayer.name,
          amount: nextBid,
        },
      });

      await refreshData();
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Failed to place bid. Please try again.');
    } finally {
      setBidding(false);
    }
  };

  const handleLogout = () => {
    clearTeamSession();
    onNavigate('landing');
  };

  if (!currentTeam) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Team session not found</p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const isMyBid = auctionState?.current_bidder_team_id === currentTeam.id;
  const nextBid = currentPlayer ? (auctionState?.current_bid || currentPlayer.base_price) + 1 : 0;
  const canBid = currentPlayer && !isMyBid && nextBid <= currentTeam.budget_remaining;
  const maxPossibleBid = currentTeam.budget_remaining - (currentTeam.players_needed * 5);

  let bidButtonText = 'Place Bid';
  let bidButtonDisabled = true;

  if (!currentPlayer) {
    bidButtonText = 'Waiting for Next Player';
  } else if (isMyBid) {
    bidButtonText = 'You Are Leading!';
  } else if (nextBid > currentTeam.budget_remaining) {
    bidButtonText = 'Insufficient Budget';
  } else if (bidding) {
    bidButtonText = 'Placing Bid...';
  } else {
    bidButtonText = `BID ${nextBid}`;
    bidButtonDisabled = false;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('landing')}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-slate-400 hover:text-white" />
              </button>
              <Shield className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">{currentTeam.name}</h1>
                {auction && <p className="text-sm text-slate-400">{auction.name}</p>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {showSuccessPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-8 border-4 border-green-400 shadow-2xl max-w-md mx-4">
              <div className="text-center">
                <Trophy className="w-16 h-16 text-yellow-300 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-3">Player Won!</h2>
                <p className="text-2xl font-bold text-yellow-200 mb-2">{wonPlayerName}</p>
                <p className="text-lg text-green-100">Purchased for {wonPlayerPrice} points</p>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-slate-300">Budget Remaining</h3>
            </div>
            <p className="text-4xl font-bold text-green-400">{currentTeam.budget_remaining}</p>
            <p className="text-sm text-slate-400 mt-1">
              of {currentTeam.budget_total} points
            </p>
            <div className="mt-4">
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(currentTeam.budget_remaining / currentTeam.budget_total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-slate-300">My Squad</h3>
            </div>
            <p className="text-4xl font-bold text-blue-400">{myPlayers.length}</p>
            <p className="text-sm text-slate-400 mt-1">
              {currentTeam.players_needed} more needed
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-slate-300">Max Bid Available</h3>
            </div>
            <p className="text-4xl font-bold text-purple-400">{maxPossibleBid}</p>
            <p className="text-sm text-slate-400 mt-1">
              Reserve {currentTeam.players_needed * 5} for remaining players
            </p>
          </div>
        </div>

        {currentPlayer ? (
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-8 border-4 border-orange-400">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock className="w-8 h-8 text-white" />
              <h2 className="text-3xl font-bold text-white">PLAYER ON BLOCK</h2>
            </div>

            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-white mb-2">{currentPlayer.name}</p>
              <p className="text-2xl text-orange-100">{currentPlayer.skill}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center">
                <p className="text-orange-100 text-sm mb-1">Current Bid</p>
                <p className="text-3xl font-bold text-white">
                  {auctionState?.current_bid || currentPlayer.base_price}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center">
                <p className="text-orange-100 text-sm mb-1">Leading Team</p>
                <p className="text-xl font-bold text-white">
                  {currentBidderTeam?.name || 'No Bids'}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center">
                <p className="text-orange-100 text-sm mb-1">Time Remaining</p>
                <p className={`text-3xl font-bold ${timeRemaining <= 10 ? 'text-red-300' : 'text-white'}`}>
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>

            <button
              onClick={handlePlaceBid}
              disabled={bidButtonDisabled || bidding}
              className={`w-full py-4 text-2xl font-bold rounded-xl transition-all ${
                isMyBid
                  ? 'bg-green-600 text-white cursor-default'
                  : canBid
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-900 hover:scale-105'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {bidButtonText}
            </button>

            {!isMyBid && canBid && (
              <p className="text-center text-sm text-orange-100 mt-3">
                Next bid: {nextBid} points • Budget after bid: {currentTeam.budget_remaining - nextBid}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
            <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-400 mb-2">Waiting for Next Player</h2>
            <p className="text-slate-500">The auctioneer will start the next auction shortly</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              My Squad ({myPlayers.length})
            </h2>
            {myPlayers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No players yet. Start bidding!</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {myPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{player.name}</p>
                      <p className="text-sm text-slate-400">{player.skill}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">{player.final_price}</p>
                      <p className="text-xs text-slate-400">points</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">
              Other Teams
            </h2>
            <div className="space-y-3">
              {teams
                .filter(t => t.id !== currentTeam.id)
                .map(team => {
                  const teamPlayers = players.filter(p => p.team_id === team.id && p.status === 'sold');
                  return (
                    <div key={team.id} className="p-4 bg-slate-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-semibold">{team.name}</p>
                        <p className="text-blue-400 font-bold">{team.budget_remaining} pts</p>
                      </div>
                      <div className="flex justify-between text-sm text-slate-400">
                        <span>{teamPlayers.length} players</span>
                        <span>{team.players_needed} needed</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">
            Upcoming Players ({unsoldPlayers.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
            {unsoldPlayers.map(player => (
              <div key={player.id} className="p-3 bg-slate-700 rounded-lg">
                <p className="text-white font-medium text-sm">{player.name}</p>
                <p className="text-xs text-slate-400">{player.skill}</p>
                <p className="text-xs text-slate-500 mt-1">Base: {player.base_price}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamDashboard(props: TeamDashboardProps) {
  return (
    <AuctionProvider>
      <TeamDashboardContent {...props} />
    </AuctionProvider>
  );
}
