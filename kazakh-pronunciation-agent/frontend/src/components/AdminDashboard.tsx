import { useState, useEffect } from 'react';
import { Users, BookOpen, BarChart3, Zap, ArrowLeft, RefreshCw, TrendingUp, Clock, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE_URL from '../apiConfig';
import type { Lang } from '../i18n';
import StudentDetailView from './StudentDetailView';

interface OverviewStats {
  total_students: number;
  total_sessions: number;
  avg_overall: number;
  avg_fluency: number;
  avg_accuracy: number;
  avg_intonation: number;
  avg_stress: number;
}

interface Activity {
  id: number;
  student_name: string;
  student_email: string;
  phrase: string;
  level: string;
  topic: string;
  overall_score: number;
  accuracy: number;
  fluency: number;
  created_at: string | null;
}

interface StudentRow {
  id: number;
  name: string;
  email: string;
  level: string;
  total_sessions: number;
  avg_score: number;
  avg_accuracy: number;
  avg_fluency: number;
  avg_intonation: number;
  avg_stress: number;
  best_score: number;
  joined: string | null;
}

interface Props {
  token: string;
  onBack: () => void;
  lang: Lang;
}

const scoreColor = (s: number) =>
  s >= 85 ? 'text-emerald-400' : s >= 65 ? 'text-amber-400' : 'text-red-400';
const scoreBg = (s: number) =>
  s >= 85 ? 'bg-emerald-500/10 border-emerald-500/20' : s >= 65 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

export default function AdminDashboard({ token, onBack, lang }: Props) {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'students'>('overview');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ovRes, actRes, stuRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/stats/overview`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/stats/recent-activity?limit=20`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/stats/students`, { headers }),
      ]);
      if (ovRes.ok) setOverview(await ovRes.json());
      if (actRes.ok) {
        const d = await actRes.json();
        setActivities(d.activities || []);
      }
      if (stuRes.ok) {
        const d = await stuRes.json();
        setStudents(d.students || []);
      }
    } catch (e) {
      console.error('Admin fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const t = (ru: string, en: string) => lang === 'ru' ? ru : en;
  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/export/csv`, { headers });
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students_progress.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV download error:', e);
      alert(lang === 'ru' ? 'Ошибка при скачивании отчёта' : 'Error downloading report');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-300 to-blue-300">
                {t('Панель преподавателя', 'Teacher Dashboard')}
              </h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">
                {t('Мониторинг успеваемости', 'Performance Monitoring')}
              </p>
            </div>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('Обновить', 'Refresh')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => { setSelectedStudentId(null); setTab('overview'); }}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${tab === 'overview' ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
            {t('Обзор', 'Overview')}
          </button>
          <button onClick={() => { setSelectedStudentId(null); setTab('students'); }}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${tab === 'students' ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
            {t('Студенты', 'Students')}
          </button>
        </div>

        {/* Student Detail Drill-down */}
        {selectedStudentId !== null ? (
          <StudentDetailView
            studentId={selectedStudentId}
            token={token}
            onBack={() => setSelectedStudentId(null)}
            lang={lang}
          />
        ) : (
        <AnimatePresence mode="wait">
          {loading && !overview ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
            </motion.div>
          ) : tab === 'overview' ? (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-6">

              {/* KPI Cards */}
              {overview && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { icon: Users, label: t('Студентов', 'Students'), value: overview.total_students, color: 'from-violet-400 to-violet-600', textColor: 'text-violet-400' },
                    { icon: BookOpen, label: t('Всего тренировок', 'Total Sessions'), value: overview.total_sessions, color: 'from-blue-400 to-blue-600', textColor: 'text-blue-400' },
                    { icon: BarChart3, label: t('Средний балл', 'Avg Score'), value: `${overview.avg_overall}%`, color: 'from-emerald-400 to-emerald-600', textColor: 'text-emerald-400' },
                    { icon: Zap, label: t('Средняя беглость', 'Avg Fluency'), value: `${overview.avg_fluency}%`, color: 'from-amber-400 to-amber-600', textColor: 'text-amber-400' },
                  ].map((card, i) => (
                    <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      className="glass-panel p-4 sm:p-5 relative overflow-hidden group">
                      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${card.color} opacity-10 blur-xl -translate-y-4 translate-x-4 group-hover:opacity-20 transition-opacity`} />
                      <div className="relative z-10">
                        <card.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${card.textColor} mb-2 sm:mb-3`} />
                        <div className="text-2xl sm:text-3xl font-bold text-white">{card.value}</div>
                        <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-bold">{card.label}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Detailed Averages */}
              {overview && (
                <div className="glass-panel p-5">
                  <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    {t('Средние показатели по всем студентам', 'Average Scores Across All Students')}
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[
                      { label: t('Общий', 'Overall'), value: overview.avg_overall },
                      { label: t('Точность', 'Accuracy'), value: overview.avg_accuracy },
                      { label: t('Беглость', 'Fluency'), value: overview.avg_fluency },
                      { label: t('Интонация', 'Intonation'), value: overview.avg_intonation },
                      { label: t('Ударение', 'Stress'), value: overview.avg_stress },
                    ].map(m => (
                      <div key={m.label} className="flex flex-col items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className={`text-lg sm:text-xl font-bold ${scoreColor(m.value)}`}>{m.value}%</span>
                        <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-slate-500 mt-1 font-bold text-center">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="glass-panel p-5">
                <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-blue-400" />
                  {t('Последние тренировки', 'Recent Activity')}
                </h3>
                {activities.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">{t('Пока нет данных', 'No data yet')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Студент', 'Student')}</th>
                          <th className="text-left py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Фраза', 'Phrase')}</th>
                          <th className="text-center py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Уровень', 'Level')}</th>
                          <th className="text-center py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Балл', 'Score')}</th>
                          <th className="text-right py-2 px-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('Дата', 'Date')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activities.map((a, i) => (
                          <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-200">{a.student_name}</div>
                              <div className="text-[10px] text-slate-500">{a.student_email}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate">{a.phrase}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">{a.level}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${scoreBg(a.overall_score)} ${scoreColor(a.overall_score)}`}>
                                {a.overall_score}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs text-slate-500">{formatDate(a.created_at)}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* Students Tab */
            <motion.div key="students" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="glass-panel p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    {t('Сводка по группе', 'Group Summary')} ({students.length})
                  </h3>
                  <button onClick={handleDownloadCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
                    <Download className="w-4 h-4" />
                    {t('Скачать отчёт (CSV)', 'Download Report (CSV)')}
                  </button>
                </div>
                {students.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">{t('Студенты не найдены', 'No students found')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-2 text-[9px] uppercase tracking-widest text-slate-500 font-bold">{t('Студент', 'Student')}</th>
                          <th className="text-center py-2 px-1.5 text-[9px] uppercase tracking-widest text-slate-500 font-bold">{t('Ур.', 'Lvl')}</th>
                          <th className="text-center py-2 px-1.5 text-[9px] uppercase tracking-widest text-slate-500 font-bold">{t('Сес.', 'Ses.')}</th>
                          <th className="text-center py-2 px-1.5 text-[9px] uppercase tracking-widest text-slate-500 font-bold">{t('Общ.', 'Ovr.')}</th>
                          <th className="text-center py-2 px-1.5 text-[9px] uppercase tracking-widest text-slate-500 font-bold">{t('Точн.', 'Acc.')}</th>
                          <th className="text-center py-2 px-1.5 text-[9px] uppercase tracking-widest text-slate-500 font-bold">{t('Бегл.', 'Flu.')}</th>
                          <th className="text-center py-2 px-1.5 text-[9px] uppercase tracking-widest text-slate-500 font-bold">{t('Инт.', 'Int.')}</th>
                          <th className="text-center py-2 px-1.5 text-[9px] uppercase tracking-widest text-slate-500 font-bold">{t('Удар.', 'Str.')}</th>
                          <th className="text-center py-2 px-1.5 text-[9px] uppercase tracking-widest text-slate-500 font-bold">{t('Лучш.', 'Best')}</th>
                          <th className="text-right py-2 px-2 text-[9px] uppercase tracking-widest text-slate-500 font-bold">{t('Рег.', 'Joined')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, i) => (
                          <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                            onClick={() => setSelectedStudentId(s.id)}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                            <td className="py-2 px-2">
                              <div className="font-medium text-slate-200 text-[13px]">{s.name}</div>
                              <div className="text-[9px] text-slate-500">{s.email}</div>
                            </td>
                            <td className="py-2 px-1.5 text-center">
                              <span className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400">{s.level}</span>
                            </td>
                            <td className="py-2 px-1.5 text-center text-slate-300 font-bold">{s.total_sessions}</td>
                            <td className="py-2 px-1.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${scoreBg(s.avg_score)} ${scoreColor(s.avg_score)}`}>{s.avg_score}%</span>
                            </td>
                            <td className="py-2 px-1.5 text-center">
                              <span className={`font-bold text-xs ${scoreColor(s.avg_accuracy)}`}>{s.avg_accuracy}%</span>
                            </td>
                            <td className="py-2 px-1.5 text-center">
                              <span className={`font-bold text-xs ${scoreColor(s.avg_fluency)}`}>{s.avg_fluency}%</span>
                            </td>
                            <td className="py-2 px-1.5 text-center">
                              <span className={`font-bold text-xs ${scoreColor(s.avg_intonation)}`}>{s.avg_intonation}%</span>
                            </td>
                            <td className="py-2 px-1.5 text-center">
                              <span className={`font-bold text-xs ${scoreColor(s.avg_stress)}`}>{s.avg_stress}%</span>
                            </td>
                            <td className="py-2 px-1.5 text-center">
                              <span className={`font-bold text-xs ${scoreColor(s.best_score)}`}>{s.best_score}%</span>
                            </td>
                            <td className="py-2 px-2 text-right text-xs text-slate-500">{formatDate(s.joined)}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
    </div>
  );
}
