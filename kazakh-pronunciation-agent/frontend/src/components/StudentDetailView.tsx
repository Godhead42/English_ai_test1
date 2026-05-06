import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus, BookOpen, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import API_BASE_URL from '../apiConfig';
import type { Lang } from '../i18n';

interface Session {
  id: number;
  phrase: string;
  level: string;
  topic: string;
  overall_score: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  intonation: number;
  stress: number;
  created_at: string | null;
}

interface StudentInfo {
  id: number;
  name: string;
  email: string;
  level: string;
}

interface Stats {
  total_sessions: number;
  start_level: number;
  current_level: number;
  improvement: number;
}

interface Props {
  studentId: number;
  token: string;
  onBack: () => void;
  lang: Lang;
}

const scoreColor = (s: number) =>
  s >= 85 ? 'text-emerald-400' : s >= 65 ? 'text-amber-400' : 'text-red-400';
const scoreBg = (s: number) =>
  s >= 85 ? 'bg-emerald-500/10 border-emerald-500/20' : s >= 65 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

export default function StudentDetailView({ studentId, token, onBack, lang }: Props) {
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const t = (ru: string, en: string) => lang === 'ru' ? ru : en;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/student/${studentId}/history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStudent(data.student);
        setStats(data.stats);
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error('Student history fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [studentId]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: 'short' });
  };
  const formatDateTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Prepare chart data (chronological order, numbered attempts)
  const chartData = sessions.map((s, i) => ({
    attempt: i + 1,
    date: formatDate(s.created_at),
    score: s.overall_score,
    accuracy: s.accuracy,
    fluency: s.fluency,
  }));

  const improvementIcon = stats && stats.improvement > 0
    ? <TrendingUp className="w-5 h-5 text-emerald-400" />
    : stats && stats.improvement < 0
    ? <TrendingDown className="w-5 h-5 text-red-400" />
    : <Minus className="w-5 h-5 text-slate-400" />;

  const improvementColor = stats && stats.improvement > 0
    ? 'text-emerald-400' : stats && stats.improvement < 0
    ? 'text-red-400' : 'text-slate-400';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!student || !stats) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">{t('Студент не найден', 'Student not found')}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold uppercase">
          {t('Назад', 'Back')}
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">{student.name}</h2>
          <p className="text-xs text-slate-500">{student.email} · {t('Уровень', 'Level')} {student.level} · {stats.total_sessions} {t('тренировок', 'sessions')}</p>
        </div>
      </div>

      {/* Start vs Current comparison */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="glass-panel p-4 sm:p-5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 opacity-10 blur-xl -translate-y-4 translate-x-4" />
          <div className="relative z-10">
            <Target className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <div className={`text-2xl sm:text-3xl font-bold ${scoreColor(stats.start_level)}`}>{stats.start_level}%</div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-bold">
              {t('Стартовый уровень', 'Start Level')}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-panel p-4 sm:p-5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-10 blur-xl -translate-y-4 translate-x-4" />
          <div className="relative z-10">
            <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <div className={`text-2xl sm:text-3xl font-bold ${scoreColor(stats.current_level)}`}>{stats.current_level}%</div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-bold">
              {t('Текущий уровень', 'Current Level')}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-panel p-4 sm:p-5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 opacity-10 blur-xl -translate-y-4 translate-x-4" />
          <div className="relative z-10">
            <div className="mx-auto mb-2 flex justify-center">{improvementIcon}</div>
            <div className={`text-2xl sm:text-3xl font-bold ${improvementColor}`}>
              {stats.improvement > 0 ? '+' : ''}{stats.improvement}%
            </div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-bold">
              {t('Прогресс', 'Improvement')}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress Chart */}
      {chartData.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-panel p-5">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            {t('Динамика баллов', 'Score Progress')}
          </h3>
          <div className="w-full h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="attempt" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  label={{ value: t('Попытка', 'Attempt'), position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#e2e8f0' }}
                  labelFormatter={(v) => `${t('Попытка', 'Attempt')} ${v}`}
                />
                <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fill="url(#scoreGrad)" name={t('Общий балл', 'Overall')} dot={{ r: 3, fill: '#8b5cf6' }} />
                <Area type="monotone" dataKey="accuracy" stroke="#34d399" strokeWidth={1.5} fill="url(#accGrad)" name={t('Точность', 'Accuracy')} dot={false} />
                <Line type="monotone" dataKey="fluency" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 4" name={t('Беглость', 'Fluency')} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-500 rounded" /><span className="text-slate-400">{t('Общий', 'Overall')}</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 rounded" /><span className="text-slate-400">{t('Точность', 'Accuracy')}</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 rounded border-dashed" /><span className="text-slate-400">{t('Беглость', 'Fluency')}</span></span>
          </div>
        </motion.div>
      )}

      {/* Session History Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-panel p-5">
        <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-blue-400" />
          {t('Все тренировки', 'All Sessions')} ({sessions.length})
        </h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">{t('Нет данных', 'No data')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">#</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Фраза', 'Phrase')}</th>
                  <th className="text-center py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Уровень', 'Level')}</th>
                  <th className="text-center py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Балл', 'Score')}</th>
                  <th className="text-center py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Точность', 'Acc')}</th>
                  <th className="text-center py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Беглость', 'Flu')}</th>
                  <th className="text-right py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Дата', 'Date')}</th>
                </tr>
              </thead>
              <tbody>
                {[...sessions].reverse().map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 text-xs">{sessions.length - i}</td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate">{s.phrase}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">{s.level}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${scoreBg(s.overall_score)} ${scoreColor(s.overall_score)}`}>
                        {s.overall_score}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`font-bold text-xs ${scoreColor(s.accuracy)}`}>{s.accuracy}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`font-bold text-xs ${scoreColor(s.fluency)}`}>{s.fluency}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-slate-500">{formatDateTime(s.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
