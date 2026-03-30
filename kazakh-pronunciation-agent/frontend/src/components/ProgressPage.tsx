import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Trophy, Target, BarChart3, ArrowLeft,
  Activity, Zap, Award, Calendar
} from 'lucide-react';

interface ProgressResult {
  id: number;
  phrase: string;
  level: string;
  overall_score: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  issue_count: number;
  created_at: string | null;
}

interface Stats {
  total_sessions: number;
  avg_overall: number;
  avg_accuracy: number;
  avg_fluency: number;
  avg_completeness: number;
  best_score: number;
  improvement: number;
}

interface ProgressPageProps {
  token: string;
  onBack: () => void;
}

export default function ProgressPage({ token, onBack }: ProgressPageProps) {
  const [results, setResults] = useState<ProgressResult[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const apiHost = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : `http://${window.location.hostname}:8000`;

  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`${apiHost}/api/progress`, { headers }).then(r => r.json()),
      fetch(`${apiHost}/api/progress/stats`, { headers }).then(r => r.json()),
    ])
      .then(([progressData, statsData]) => {
        setResults(progressData.results || []);
        setStats(statsData);
      })
      .catch(err => console.error('Failed to load progress:', err))
      .finally(() => setLoading(false));
  }, []);

  function getScoreColor(score: number) {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 65) return 'text-amber-400';
    return 'text-red-400';
  }

  function getScoreBarColor(score: number) {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 65) return 'bg-amber-500';
    return 'bg-red-500';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-brand-400 animate-pulse text-xl font-bold">Loading progress...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Background */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-600/10 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">My Progress</h1>
            <p className="text-slate-400 text-sm">Track your pronunciation improvement</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
              className="glass-panel p-4 text-center">
              <Activity className="w-5 h-5 text-brand-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.total_sessions}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Sessions</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-panel p-4 text-center">
              <Target className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className={`text-2xl font-bold ${getScoreColor(stats.avg_overall)}`}>{stats.avg_overall}%</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Avg Score</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass-panel p-4 text-center">
              <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-amber-300">{stats.best_score}%</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Best Score</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="glass-panel p-4 text-center">
              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className={`text-2xl font-bold ${stats.improvement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.improvement >= 0 ? '+' : ''}{stats.improvement}%
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Improvement</div>
            </motion.div>
          </div>
        )}

        {/* Score Breakdown */}
        {stats && stats.total_sessions > 0 && (
          <div className="glass-panel p-6 mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Average Scores
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Overall', value: stats.avg_overall },
                { label: 'Accuracy', value: stats.avg_accuracy },
                { label: 'Fluency', value: stats.avg_fluency },
                { label: 'Completeness', value: stats.avg_completeness },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{item.label}</span>
                    <span className={`font-bold ${getScoreColor(item.value)}`}>{item.value}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${getScoreBarColor(item.value)}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        <div className="glass-panel p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Recent Sessions
          </h2>

          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No sessions yet. Start practicing to see your progress!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">"{r.phrase}"</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] uppercase tracking-widest text-brand-400 font-bold">{r.level}</span>
                      {r.created_at && (
                        <span className="text-[10px] text-slate-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      )}
                      {r.issue_count > 0 && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {r.issue_count} issues
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${getScoreColor(r.overall_score)} ml-4`}>
                    {r.overall_score}%
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
