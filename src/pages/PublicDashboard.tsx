import { useState, useEffect } from 'react';
import { AuctionProvider, useAuction } from '../contexts/AuctionContext';
import { calculateTimeRemaining, formatTime } from '../utils/timer';
import { Trophy, Clock, Users, TrendingUp, CheckCircle, ArrowLeft, Award } from 'lucide-react';

interface PublicDashboardProps {
  onNavigate: (page: 'landing' | 'admin' | 'team' | 'public') => void;
}

function PublicDashboardContent({ onNavigate }: PublicDashboardProps) {
  const { auction, teams, players, auctionState } = useAuction();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lastSoldPlayerId, setLastSoldPlayerId] = useState<string | null>(null);
  const [showSoldNotification, setShowSoldNotification] = useState(false);
  const [soldPlayerInfo, setSoldPlayerInfo] = useState<{ name: string; teamName: string; price: number } | null>(null);

  const currentPlayer = auctionState?.current_player_id
    ? players.find(p => p.id === auctionState.current_player_id)
    : null;
  const currentBidderTeam = auctionState?.current_bidder_team_id
    ? teams.find(t => t.id === auctionState.current_bidder_team_id)
    : null;

  const soldPlayers = players.filter(p => p.status === 'sold');
  const unsoldPlayers = players.filter(p => p.status === 'unsold' || p.status === 'passed');

  useEffect(() => {
    if (soldPlayers.length === 0) return;

    const latestSold = soldPlayers.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    if (latestSold.id !== lastSoldPlayerId) {
      const buyerTeam = teams.find(t => t.id === latestSold.team_id);

      if (buyerTeam) {
        setSoldPlayerInfo({
          name: latestSold.name,
          teamName: buyerTeam.name,
          price: latestSold.final_price || 0,
        });
        setLastSoldPlayerId(latestSold.id);
        setShowSoldNotification(true);

        setTimeout(() => {
          setShowSoldNotification(false);
        }, 6000);
      }
    }
  }, [soldPlayers.length, teams]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (auctionState?.timer_ends_at && !auctionState.timer_paused) {
        setTimeRemaining(calculateTimeRemaining(auctionState.timer_ends_at));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [auctionState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('landing')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-400 hover:text-white" />
            </button>
            <div className="flex items-center gap-4">
              <Trophy className="w-10 h-10 text-amber-500" />
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white">
                  {auction?.name || 'Cricket Auction'}
                </h1>
                <p className="text-slate-400">Live Auction Dashboard</p>
              </div>
            </div>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {showSoldNotification && soldPlayerInfo && (
          <div className="fixed top-24 right-4 z-50 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 border-4 border-green-400 shadow-2xl max-w-sm">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-8 h-8 text-yellow-300" />
              <h3 className="text-2xl font-bold text-white">SOLD!</h3>
            </div>
            <p className="text-xl font-bold text-yellow-200 mb-1">{soldPlayerInfo.name}</p>
            <p className="text-lg text-white">Team: {soldPlayerInfo.teamName}</p>
            <p className="text-lg text-green-100">Price: {soldPlayerInfo.price} points</p>
          </div>
        )}
        {currentPlayer ? (
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 rounded-2xl p-8 md:p-12 border-4 border-amber-400 shadow-2xl">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Clock className="w-10 h-10 text-white animate-pulse" />
              <h2 className="text-4xl font-bold text-white">ON THE BLOCK</h2>
            </div>

            <div className="text-center mb-8">
              <p className="text-6xl md:text-7xl font-bold text-white mb-3 drop-shadow-lg">
                {currentPlayer.name}
              </p>
              <p className="text-3xl text-amber-100 font-semibold">{currentPlayer.skill}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 text-center transform hover:scale-105 transition-transform">
                <p className="text-amber-100 text-lg mb-2 font-semibold">Current Bid</p>
                <p className="text-5xl font-bold text-white">
                  {auctionState?.current_bid || currentPlayer.base_price}
                </p>
                <p className="text-amber-100 text-sm mt-1">points</p>
              </div>
              <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 text-center transform hover:scale-105 transition-transform">
                <p className="text-amber-100 text-lg mb-2 font-semibold">Leading Team</p>
                <p className="text-2xl font-bold text-white">
                  {currentBidderTeam?.name || 'No Bids Yet'}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 text-center transform hover:scale-105 transition-transform">
                <p className="text-amber-100 text-lg mb-2 font-semibold">Time Remaining</p>
                <p
                  className={`text-5xl font-bold transition-colors ${
                    timeRemaining <= 10 ? 'text-red-300 animate-pulse' : 'text-white'
                  }`}
                >
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>

            {auctionState?.timer_paused && (
              <div className="bg-yellow-500/20 backdrop-blur border-2 border-yellow-400 rounded-lg p-4 text-center">
                <p className="text-yellow-100 font-semibold text-lg">⏸️ AUCTION PAUSED</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 text-center">
            <Clock className="w-20 h-20 text-slate-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-slate-400 mb-2">Auction in Progress</h2>
            <p className="text-slate-500 text-lg">Waiting for the next player to be announced</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.map(team => {
            const teamPlayers = players.filter(p => p.team_id === team.id && p.status === 'sold');
            const budgetSpent = team.budget_total - team.budget_remaining;
            const isLeading = currentPlayer && auctionState?.current_bidder_team_id === team.id;

            return (
              <div
                key={team.id}
                className={`bg-slate-800 rounded-xl p-6 border-2 transition-all ${
                  isLeading
                    ? 'border-amber-400 shadow-lg shadow-amber-500/50'
                    : 'border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">{team.name}</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-slate-400 mb-1">
                      <span>Budget</span>
                      <span>
                        {budgetSpent} / {team.budget_total}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          isLeading ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${(budgetSpent / team.budget_total) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700">
                    <div>
                      <p className="text-slate-400 text-xs">Remaining</p>
                      <p className="text-green-400 font-bold text-xl">{team.budget_remaining}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Players</p>
                      <p className="text-blue-400 font-bold text-xl">{teamPlayers.length}</p>
                    </div>
                  </div>

                  {teamPlayers.length > 0 && (
                    <div className="pt-2 border-t border-slate-700">
                      <p className="text-slate-400 text-xs mb-2">Squad</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {teamPlayers.map(player => (
                          <div key={player.id} className="flex justify-between text-sm">
                            <span className="text-slate-300 truncate">{player.name}</span>
                            <span className="text-slate-400 ml-2">{player.final_price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isLeading && (
                  <div className="mt-3 bg-amber-500/20 border border-amber-500 rounded-lg p-2 text-center">
                    <p className="text-amber-400 font-semibold text-sm">🔥 LEADING BID</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">
                Sold Players ({soldPlayers.length})
              </h2>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {soldPlayers.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No players sold yet</p>
              ) : (
                soldPlayers
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(player => {
                    const team = teams.find(t => t.id === player.team_id);
                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium">{player.name}</p>
                          <p className="text-sm text-slate-400">{player.skill}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-400 font-semibold">{team?.name}</p>
                          <p className="text-green-400 font-bold">{player.final_price} pts</p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">
                Coming Up ({unsoldPlayers.length})
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {unsoldPlayers.length === 0 ? (
                <p className="text-slate-400 text-center py-8 col-span-2">All players processed</p>
              ) : (
                unsoldPlayers.map(player => (
                  <div key={player.id} className="p-3 bg-slate-700 rounded-lg">
                    <p className="text-white font-medium text-sm truncate">{player.name}</p>
                    <p className="text-xs text-slate-400">{player.skill}</p>
                    <p className="text-xs text-slate-500 mt-1">Base: {player.base_price}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-slate-900/80 backdrop-blur border-t border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-slate-400 text-sm">
            Real-time Cricket Auction Platform • Updates automatically
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function PublicDashboard(props: PublicDashboardProps) {
  return (
    <AuctionProvider>
      <PublicDashboardContent {...props} />
    </AuctionProvider>
  );
}
