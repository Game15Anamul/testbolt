import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { verifyPassword, setTeamSession, setAdminSession } from '../utils/auth';
import { Trophy, Shield, Eye, Crown } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: 'landing' | 'admin' | 'team' | 'public') => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [loginMode, setLoginMode] = useState<'team' | 'admin' | null>(null);
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: teams, error: fetchError } = await supabase
        .from('teams')
        .select('*')
        .ilike('name', teamName);

      if (fetchError) throw fetchError;

      if (!teams || teams.length === 0) {
        setError('Team not found');
        setLoading(false);
        return;
      }

      const team = teams[0];
      const isValid = await verifyPassword(password, team.password_hash);

      if (!isValid) {
        setError('Invalid password');
        setLoading(false);
        return;
      }

      setTeamSession(team.id, team.name);
      onNavigate('team');
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (password === 'admin123') {
        setAdminSession();
        onNavigate('admin');
      } else {
        setError('Invalid admin password');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loginMode === 'team') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Shield className="w-10 h-10 text-blue-400" />
              <h2 className="text-3xl font-bold text-white">Team Login</h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleTeamLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your team name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMode(null);
                  setError('');
                  setTeamName('');
                  setPassword('');
                }}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loginMode === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Crown className="w-10 h-10 text-amber-500" />
              <h2 className="text-3xl font-bold text-white">Admin Login</h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter admin password"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">Demo password: admin123</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMode(null);
                  setError('');
                  setPassword('');
                }}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Trophy className="w-16 h-16 text-amber-500" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Cricket Auction Platform
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Real-time auction system for university cricket tournaments. Build your dream team, manage budgets, and compete live.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <button
            onClick={() => setLoginMode('admin')}
            className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-amber-500 rounded-2xl p-8 transition-all transform hover:scale-105"
          >
            <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">Admin Panel</h2>
            <p className="text-slate-400 mb-4">
              Setup auctions, manage players, control the bidding process, and monitor all teams.
            </p>
            <div className="inline-block px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold">
              Login as Admin
            </div>
          </button>

          <button
            onClick={() => setLoginMode('team')}
            className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-blue-500 rounded-2xl p-8 transition-all transform hover:scale-105"
          >
            <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">Team Captain</h2>
            <p className="text-slate-400 mb-4">
              Place bids, manage your budget, build your squad, and compete against other teams.
            </p>
            <div className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">
              Login as Captain
            </div>
          </button>

          <button
            onClick={() => onNavigate('public')}
            className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-green-500 rounded-2xl p-8 transition-all transform hover:scale-105"
          >
            <Eye className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">Public View</h2>
            <p className="text-slate-400 mb-4">
              Watch the auction live, see real-time bids, and follow the action as teams build their squads.
            </p>
            <div className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg font-semibold">
              Watch Live
            </div>
          </button>
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
                  1
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Auction</h4>
                <p className="text-slate-400 text-sm">
                  Teams bid in real-time with 60-second timers and anti-snipe protection
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
                  2
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Build Teams</h4>
                <p className="text-slate-400 text-sm">
                  Captains strategically build their squads within 100-point budgets
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-slate-900/80 backdrop-blur border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-slate-400 text-sm">
            Powered by real-time technology • Secure authentication • Mobile-friendly
          </p>
        </div>
      </footer>
    </div>
  );
}
