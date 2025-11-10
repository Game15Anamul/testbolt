import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuctionProvider, useAuction } from '../contexts/AuctionContext';
import { hashPassword, clearAdminSession } from '../utils/auth';
import { Crown, Users, Play, Pause, Check, X, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { calculateTimeRemaining, formatTime } from '../utils/timer';

interface AdminPanelProps {
  onNavigate: (page: 'landing' | 'admin' | 'team' | 'public') => void;
}

function AdminPanelContent({ onNavigate }: AdminPanelProps) {
  const { auction, teams, players, auctionState, refreshData } = useAuction();
  const [activeTab, setActiveTab] = useState<'setup' | 'control' | 'monitor'>('setup');
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [auctionName, setAuctionName] = useState('');
  const [teamCount, setTeamCount] = useState(4);
  const [teamNames, setTeamNames] = useState<string[]>(['Team 1', 'Team 2', 'Team 3', 'Team 4']);
  const [teamPasswords, setTeamPasswords] = useState<string[]>(['', '', '', '']);

  const [playerName, setPlayerName] = useState('');
  const [playerSkill, setPlayerSkill] = useState<'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper'>('All-Rounder');
  const [playerBasePrice, setPlayerBasePrice] = useState(5);
  const [bulkPlayers, setBulkPlayers] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      if (auctionState?.timer_ends_at && !auctionState.timer_paused) {
        setTimeRemaining(calculateTimeRemaining(auctionState.timer_ends_at));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [auctionState]);

  useEffect(() => {
    if (timeRemaining === 0 && auctionState?.current_player_id && !auctionState.timer_paused) {
      handleAutoSold();
    }
  }, [timeRemaining, auctionState]);

  const handleAutoSold = async () => {
    if (!auction || !auctionState || !auctionState.current_player_id) return;

    const player = players.find(p => p.id === auctionState.current_player_id);
    if (!player) return;

    if (!auctionState.current_bidder_team_id) {
      await handlePassPlayer();
      return;
    }

    const winningTeam = teams.find(t => t.id === auctionState.current_bidder_team_id);
    if (!winningTeam) return;

    try {
      await supabase.from('players').update({
        status: 'sold',
        team_id: auctionState.current_bidder_team_id,
        final_price: auctionState.current_bid,
      }).eq('id', auctionState.current_player_id);

      await supabase.from('teams').update({
        budget_remaining: winningTeam.budget_remaining - (auctionState.current_bid || 0),
        players_needed: winningTeam.players_needed - 1,
      }).eq('id', auctionState.current_bidder_team_id);

      await supabase
        .from('auction_state')
        .update({
          current_player_id: null,
          current_bid: null,
          current_bidder_team_id: null,
          timer_started_at: null,
          timer_ends_at: null,
          timer_paused: false,
        })
        .eq('id', auctionState.id);

      await supabase.from('auction_log').insert({
        auction_id: auction.id,
        event_type: 'sold',
        message: `${player.name} sold to ${winningTeam.name} for ${auctionState.current_bid} points`,
        metadata: {
          player_id: player.id,
          player_name: player.name,
          team_id: winningTeam.id,
          team_name: winningTeam.name,
          price: auctionState.current_bid,
        },
      });

      await refreshData();
    } catch (error) {
      console.error('Error auto-selling player:', error);
    }
  };

  const handleCreateAuction = async () => {
    if (!auctionName.trim()) {
      alert('Please enter an auction name');
      return;
    }

    const validTeams = teamNames.slice(0, teamCount).filter(name => name.trim());
    const validPasswords = teamPasswords.slice(0, teamCount).filter(pwd => pwd.trim());

    if (validTeams.length !== teamCount || validPasswords.length !== teamCount) {
      alert('Please fill in all team names and passwords');
      return;
    }

    try {
      const { data: newAuction, error: auctionError } = await supabase
        .from('auctions')
        .insert({ name: auctionName, status: 'setup' })
        .select()
        .single();

      if (auctionError) throw auctionError;

      const teamsToInsert = await Promise.all(
        validTeams.map(async (name, index) => ({
          auction_id: newAuction.id,
          name,
          password_hash: await hashPassword(validPasswords[index]),
          budget_total: 100,
          budget_remaining: 100,
          players_needed: 4,
        }))
      );

      const { error: teamsError } = await supabase.from('teams').insert(teamsToInsert);
      if (teamsError) throw teamsError;

      const { error: stateError } = await supabase.from('auction_state').insert({
        auction_id: newAuction.id,
        current_player_id: null,
        current_bid: null,
        current_bidder_team_id: null,
        timer_started_at: null,
        timer_ends_at: null,
        timer_paused: false,
      });

      if (stateError) throw stateError;

      alert('Auction created successfully!');
      await refreshData();
      setActiveTab('control');
    } catch (error) {
      console.error('Error creating auction:', error);
      alert('Failed to create auction');
    }
  };

  const handleAddPlayer = async () => {
    if (!auction || !playerName.trim()) return;

    try {
      await supabase.from('players').insert({
        auction_id: auction.id,
        name: playerName,
        base_price: playerBasePrice,
        skill: playerSkill,
        status: 'unsold',
        team_id: null,
        final_price: null,
      });

      setPlayerName('');
      await refreshData();
    } catch (error) {
      console.error('Error adding player:', error);
    }
  };

  const handleBulkAddPlayers = async () => {
    if (!auction || !bulkPlayers.trim()) return;

    const lines = bulkPlayers.split('\n').filter(line => line.trim());
    const playersToAdd = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        auction_id: auction.id,
        name: parts[0] || 'Unknown Player',
        base_price: parseInt(parts[1]) || 5,
        skill: (parts[2] as 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper') || 'All-Rounder',
        status: 'unsold' as const,
        team_id: null,
        final_price: null,
      };
    });

    try {
      await supabase.from('players').insert(playersToAdd);
      setBulkPlayers('');
      alert(`Added ${playersToAdd.length} players`);
      await refreshData();
    } catch (error) {
      console.error('Error bulk adding players:', error);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    try {
      await supabase.from('players').delete().eq('id', playerId);
      await refreshData();
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  const handleStartPlayerAuction = async (playerId: string) => {
    if (!auction || !auctionState) return;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    try {
      const now = new Date();
      const endsAt = new Date(now.getTime() + 60000);

      await supabase.from('players').update({ status: 'on_block' }).eq('id', playerId);

      await supabase
        .from('auction_state')
        .update({
          current_player_id: playerId,
          current_bid: player.base_price,
          current_bidder_team_id: null,
          timer_started_at: now.toISOString(),
          timer_ends_at: endsAt.toISOString(),
          timer_paused: false,
        })
        .eq('id', auctionState.id);

      await supabase.from('auction_log').insert({
        auction_id: auction.id,
        event_type: 'auction_started',
        message: `Auction started for ${player.name}`,
        metadata: { player_id: playerId, player_name: player.name },
      });

      if (auction.status === 'setup') {
        await supabase.from('auctions').update({ status: 'active' }).eq('id', auction.id);
      }

      await refreshData();
    } catch (error) {
      console.error('Error starting player auction:', error);
    }
  };

  const handlePauseResume = async () => {
    if (!auction || !auctionState) return;

    try {
      const newPausedState = !auctionState.timer_paused;

      if (newPausedState) {
        await supabase
          .from('auction_state')
          .update({ timer_paused: true })
          .eq('id', auctionState.id);

        await supabase.from('auction_log').insert({
          auction_id: auction.id,
          event_type: 'auction_paused',
          message: 'Auction paused',
          metadata: {},
        });
      } else {
        const timeRemainingMs = timeRemaining * 1000;
        const newEndsAt = new Date(Date.now() + timeRemainingMs);

        await supabase
          .from('auction_state')
          .update({
            timer_paused: false,
            timer_ends_at: newEndsAt.toISOString(),
          })
          .eq('id', auctionState.id);

        await supabase.from('auction_log').insert({
          auction_id: auction.id,
          event_type: 'auction_resumed',
          message: 'Auction resumed',
          metadata: {},
        });
      }

      await refreshData();
    } catch (error) {
      console.error('Error pausing/resuming auction:', error);
    }
  };

  const handleSoldPlayer = async () => {
    if (!auction || !auctionState || !auctionState.current_player_id) return;

    const player = players.find(p => p.id === auctionState.current_player_id);
    if (!player) return;

    if (!auctionState.current_bidder_team_id) {
      alert('No bids placed. Use "Pass" instead.');
      return;
    }

    const winningTeam = teams.find(t => t.id === auctionState.current_bidder_team_id);
    if (!winningTeam) return;

    try {
      await supabase.from('players').update({
        status: 'sold',
        team_id: auctionState.current_bidder_team_id,
        final_price: auctionState.current_bid,
      }).eq('id', auctionState.current_player_id);

      await supabase.from('teams').update({
        budget_remaining: winningTeam.budget_remaining - (auctionState.current_bid || 0),
        players_needed: winningTeam.players_needed - 1,
      }).eq('id', auctionState.current_bidder_team_id);

      await supabase
        .from('auction_state')
        .update({
          current_player_id: null,
          current_bid: null,
          current_bidder_team_id: null,
          timer_started_at: null,
          timer_ends_at: null,
          timer_paused: false,
        })
        .eq('id', auctionState.id);

      await supabase.from('auction_log').insert({
        auction_id: auction.id,
        event_type: 'sold',
        message: `${player.name} sold to ${winningTeam.name} for ${auctionState.current_bid} points`,
        metadata: {
          player_id: player.id,
          player_name: player.name,
          team_id: winningTeam.id,
          team_name: winningTeam.name,
          price: auctionState.current_bid,
        },
      });

      await refreshData();
    } catch (error) {
      console.error('Error selling player:', error);
    }
  };

  const handlePassPlayer = async () => {
    if (!auction || !auctionState || !auctionState.current_player_id) return;

    const player = players.find(p => p.id === auctionState.current_player_id);
    if (!player) return;

    try {
      await supabase.from('players').update({ status: 'passed' }).eq('id', auctionState.current_player_id);

      await supabase
        .from('auction_state')
        .update({
          current_player_id: null,
          current_bid: null,
          current_bidder_team_id: null,
          timer_started_at: null,
          timer_ends_at: null,
          timer_paused: false,
        })
        .eq('id', auctionState.id);

      await supabase.from('auction_log').insert({
        auction_id: auction.id,
        event_type: 'passed',
        message: `${player.name} passed (no bids)`,
        metadata: { player_id: player.id, player_name: player.name },
      });

      await refreshData();
    } catch (error) {
      console.error('Error passing player:', error);
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    onNavigate('landing');
  };

  const unsoldPlayers = players.filter(p => p.status === 'unsold');
  const passedPlayers = players.filter(p => p.status === 'passed');
  const currentPlayer = auctionState?.current_player_id
    ? players.find(p => p.id === auctionState.current_player_id)
    : null;
  const currentBidderTeam = auctionState?.current_bidder_team_id
    ? teams.find(t => t.id === auctionState.current_bidder_team_id)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('landing')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-400 hover:text-white" />
            </button>
            <Crown className="w-8 h-8 text-amber-500" />
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
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
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'setup'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Setup
          </button>
          <button
            onClick={() => setActiveTab('control')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'control'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Control
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'monitor'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Monitor
          </button>
        </div>

        {activeTab === 'setup' && (
          <div className="space-y-6">
            {!auction ? (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">Create New Auction</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Auction Name</label>
                    <input
                      type="text"
                      value={auctionName}
                      onChange={(e) => setAuctionName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="University Cricket Tournament 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Number of Teams</label>
                    <select
                      value={teamCount}
                      onChange={(e) => {
                        const count = parseInt(e.target.value);
                        setTeamCount(count);
                        setTeamNames(Array(count).fill('').map((_, i) => `Team ${i + 1}`));
                        setTeamPasswords(Array(count).fill(''));
                      }}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="4">4 Teams</option>
                      <option value="5">5 Teams</option>
                    </select>
                  </div>
                  {Array(teamCount).fill(0).map((_, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Team {index + 1} Name
                        </label>
                        <input
                          type="text"
                          value={teamNames[index] || ''}
                          onChange={(e) => {
                            const newNames = [...teamNames];
                            newNames[index] = e.target.value;
                            setTeamNames(newNames);
                          }}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Password
                        </label>
                        <input
                          type="text"
                          value={teamPasswords[index] || ''}
                          onChange={(e) => {
                            const newPasswords = [...teamPasswords];
                            newPasswords[index] = e.target.value;
                            setTeamPasswords(newPasswords);
                          }}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleCreateAuction}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Create Auction
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-4">Add Player</h2>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="Player Name"
                    />
                    <select
                      value={playerSkill}
                      onChange={(e) => setPlayerSkill(e.target.value as any)}
                      className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="Wicket-Keeper">Wicket-Keeper</option>
                    </select>
                    <input
                      type="number"
                      value={playerBasePrice}
                      onChange={(e) => setPlayerBasePrice(parseInt(e.target.value) || 5)}
                      className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="Base Price"
                      min="1"
                    />
                  </div>
                  <button
                    onClick={handleAddPlayer}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Player
                  </button>
                </div>

                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-4">Bulk Add Players</h2>
                  <p className="text-sm text-slate-400 mb-2">Format: Name, Base Price, Skill (one per line)</p>
                  <textarea
                    value={bulkPlayers}
                    onChange={(e) => setBulkPlayers(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white h-32 mb-4"
                    placeholder="John Doe, 10, Batsman&#10;Jane Smith, 15, Bowler"
                  />
                  <button
                    onClick={handleBulkAddPlayers}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Bulk Add
                  </button>
                </div>

                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-4">Players List ({players.length})</h2>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {players.map(player => (
                      <div key={player.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <p className="text-white font-medium">{player.name}</p>
                          <p className="text-sm text-slate-400">
                            {player.skill} • Base: {player.base_price} • {player.status}
                          </p>
                        </div>
                        {player.status === 'unsold' && (
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'control' && auction && (
          <div className="space-y-6">
            {currentPlayer && (
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-8 border-4 border-amber-400">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold text-white mb-2">ON THE BLOCK</h2>
                  <p className="text-5xl font-bold text-white mb-2">{currentPlayer.name}</p>
                  <p className="text-xl text-amber-100">{currentPlayer.skill}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center">
                    <p className="text-amber-100 text-sm mb-1">Current Bid</p>
                    <p className="text-3xl font-bold text-white">{auctionState?.current_bid}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center">
                    <p className="text-amber-100 text-sm mb-1">Leading Team</p>
                    <p className="text-xl font-bold text-white">
                      {currentBidderTeam?.name || 'No Bids'}
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg p-4 text-center">
                    <p className="text-amber-100 text-sm mb-1">Time Remaining</p>
                    <p className={`text-3xl font-bold ${timeRemaining <= 10 ? 'text-red-300' : 'text-white'}`}>
                      {formatTime(timeRemaining)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={handlePauseResume}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {auctionState?.timer_paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    {auctionState?.timer_paused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={handleSoldPlayer}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Sold!
                  </button>
                  <button
                    onClick={handlePassPlayer}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Pass
                  </button>
                </div>
              </div>
            )}

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">
                Available Players ({unsoldPlayers.length + passedPlayers.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {unsoldPlayers.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handleStartPlayerAuction(player.id)}
                    disabled={!!currentPlayer}
                    className="p-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-left"
                  >
                    <p className="text-white font-medium">{player.name}</p>
                    <p className="text-sm text-slate-400">
                      {player.skill} • Base: {player.base_price}
                    </p>
                  </button>
                ))}
                {passedPlayers.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handleStartPlayerAuction(player.id)}
                    disabled={!!currentPlayer}
                    className="p-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-left border-l-4 border-l-orange-500"
                  >
                    <p className="text-white font-medium">{player.name}</p>
                    <p className="text-sm text-slate-400">
                      {player.skill} • Base: {player.base_price}
                    </p>
                    <p className="text-xs text-orange-400 mt-2">2nd Round</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monitor' && auction && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.map(team => {
                const teamPlayers = players.filter(p => p.team_id === team.id);
                const budgetSpent = team.budget_total - team.budget_remaining;
                return (
                  <div key={team.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-blue-400" />
                        <h3 className="text-xl font-bold text-white">{team.name}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Remaining</p>
                        <p className="text-2xl font-bold text-green-400">{team.budget_remaining}</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-slate-400 mb-1">
                        <span>Budget Used</span>
                        <span>{budgetSpent} / {team.budget_total}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(budgetSpent / team.budget_total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-2">
                        Squad ({teamPlayers.length} players, {team.players_needed} needed)
                      </p>
                      <div className="space-y-1">
                        {teamPlayers.map(player => (
                          <div key={player.id} className="flex justify-between text-sm">
                            <span className="text-white">{player.name}</span>
                            <span className="text-slate-400">{player.final_price} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel(props: AdminPanelProps) {
  return (
    <AuctionProvider>
      <AdminPanelContent {...props} />
    </AuctionProvider>
  );
}
