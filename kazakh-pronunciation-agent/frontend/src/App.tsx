import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Square, Volume2, RefreshCw, Activity, ChevronRight, ChevronLeft,
  History, Trash2, BookOpen, CheckCircle2, XCircle, AlertTriangle,
  Play, RotateCcw, ArrowRight, Sparkles, GraduationCap, Globe
} from 'lucide-react';
import AudioVisualizer from './components/AudioVisualizer';
import ChatBot from './components/ChatBot';
import LevelCheck from './components/LevelCheck';
import AuthPage from './components/AuthPage';
import ProgressPage from './components/ProgressPage';
import TopicSelector from './components/TopicSelector';
import TongueTwisters from './components/TongueTwisters';
import API_BASE_URL from './apiConfig';
import { motion, AnimatePresence } from 'framer-motion';
import type { CEFRLevel, Topic, AnalysisResult, HistoryItem, WordAnalysis, PhoneticIssue, StressIssue } from './types';
import { getScoreColor, getScoreBg } from './data/constants';
import { t, getScoreLabelLocalized, type Lang } from './i18n';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const API_BASE = API_BASE_URL;

// ────────────────────────────────────────────────
//  Component: Level Selector
// ────────────────────────────────────────────────
function LevelSelector({ levels, selected, onSelect, lang }: { levels: CEFRLevel[]; selected: string; onSelect: (code: string) => void; lang: Lang }) {
  const levelColors: Record<string, string> = {
    'A1': 'from-green-400 to-emerald-500', 'A2': 'from-emerald-400 to-teal-500',
    'B1': 'from-blue-400 to-cyan-500', 'B2': 'from-indigo-400 to-blue-500',
    'C1': 'from-purple-400 to-violet-500', 'C2': 'from-pink-400 to-rose-500',
  };
  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="flex items-center gap-2 mb-4 px-2">
        <GraduationCap className="w-4 h-4 text-brand-400" />
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">{t('level.select', lang)}</h2>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {levels.map((level) => (
          <motion.button key={level.code} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(level.code)}
            className={`relative p-3 rounded-xl border transition-all duration-300 group overflow-hidden
              ${selected === level.code ? 'border-white/30 bg-white/10 shadow-lg shadow-brand-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15'}`}>
            {selected === level.code && <motion.div layoutId="level-indicator" className={`absolute inset-0 bg-gradient-to-b ${levelColors[level.code] || 'from-brand-400 to-brand-600'} opacity-20`} />}
            <div className="relative z-10">
              <div className={`text-lg font-bold ${selected === level.code ? 'text-white' : 'text-slate-300'}`}>{level.code}</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-0.5 font-semibold">{level.name}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
//  Component: TTS PlayButton
// ────────────────────────────────────────────────
const audioCache = new Map<string, string>();

function SpeakButton({ text, label = "Listen", className = "", size = "normal", slow = false }: {
  text: string; label?: string; className?: string; size?: "small" | "normal"; slow?: boolean;
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } }; }, []);
  const speak = useCallback(async () => {
    if (audioRef.current && isSpeaking) { audioRef.current.pause(); audioRef.current.currentTime = 0; setIsSpeaking(false); return; }
    setIsLoading(true);
    try {
      const ck = `${text}_${slow}`; let url = audioCache.get(ck);
      if (!url) { const p = new URLSearchParams({ text, slow: String(slow) }); const r = await fetch(`${API_BASE}/api/tts?${p}`); if (!r.ok) throw new Error('TTS failed'); const b = await r.blob(); url = URL.createObjectURL(b); audioCache.set(ck, url); }
      const a = new Audio(url); audioRef.current = a;
      a.onplay = () => { setIsSpeaking(true); setIsLoading(false); }; a.onended = () => setIsSpeaking(false); a.onerror = () => { setIsSpeaking(false); setIsLoading(false); };
      await a.play();
    } catch { setIsLoading(false); setIsSpeaking(false);
      if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = slow ? 0.6 : 0.85; u.onstart = () => setIsSpeaking(true); u.onend = () => setIsSpeaking(false); u.onerror = () => setIsSpeaking(false); speechSynthesis.speak(u); }
    }
  }, [text, isSpeaking, slow]);
  const sc = size === "small" ? "px-3 py-1.5 text-[10px] gap-1" : "px-4 py-2 text-xs gap-2";
  return (
    <button onClick={speak} disabled={isLoading} className={`flex items-center ${sc} rounded-full border transition-all duration-300 cursor-pointer disabled:opacity-50 ${isSpeaking ? 'bg-brand-500/30 border-brand-400/50 text-brand-200 shadow-[0_0_15px_rgba(45,212,191,0.3)]' : 'bg-brand-500/10 border-brand-500/20 text-brand-300 hover:text-white hover:bg-brand-500/20'} ${className}`}>
      {isLoading ? <RefreshCw className={`${size === "small" ? "w-3 h-3" : "w-4 h-4"} animate-spin`} /> : isSpeaking ? <Volume2 className={`${size === "small" ? "w-3 h-3" : "w-4 h-4"} animate-pulse`} /> : <Play className={`${size === "small" ? "w-3 h-3" : "w-4 h-4"}`} />}
      <span className="font-semibold tracking-wider uppercase">{isLoading ? '...' : isSpeaking ? '▶' : label}</span>
    </button>
  );
}

// ────────────────────────────────────────────────
//  Component: Word-by-word Highlight
// ────────────────────────────────────────────────
function WordHighlight({ analysis, lang }: { analysis: WordAnalysis; lang: Lang }) {
  return (
    <div className="space-y-4">
      {analysis.correct.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">{t('words.correct', lang)} ({analysis.correct.length})</span></div>
          <div className="flex flex-wrap gap-1.5">{analysis.correct.map((w, i) => (<span key={`c-${i}`} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 text-sm font-medium">{w.word}</span>))}</div>
        </div>
      )}
      {analysis.incorrect.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-xs uppercase tracking-widest text-amber-400 font-bold">{t('words.mispronounced', lang)} ({analysis.incorrect.length})</span></div>
          <div className="flex flex-wrap gap-1.5">{analysis.incorrect.map((w, i) => (<div key={`i-${i}`}><span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-200 text-sm font-medium cursor-help">{w.word}<span className="text-amber-400/50 ml-1 text-[10px]">→ "{w.spoken_as}"</span></span></div>))}</div>
        </div>
      )}
      {analysis.missing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-red-400" /><span className="text-xs uppercase tracking-widest text-red-400 font-bold">{t('words.missing', lang)} ({analysis.missing.length})</span></div>
          <div className="flex flex-wrap gap-1.5">{analysis.missing.map((w, i) => (<span key={`m-${i}`} className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-200 text-sm font-medium line-through opacity-80">{w.word}</span>))}</div>
        </div>
      )}
      {analysis.extra.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-slate-400" /><span className="text-xs uppercase tracking-widest text-slate-400 font-bold">{t('words.extra', lang)} ({analysis.extra.length})</span></div>
          <div className="flex flex-wrap gap-1.5">{analysis.extra.map((w, i) => (<span key={`e-${i}`} className="px-2.5 py-1 rounded-lg bg-slate-500/15 border border-slate-500/25 text-slate-300 text-sm font-medium italic">+{w.word}</span>))}</div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
//  Component: Phonetic Issue Card
// ────────────────────────────────────────────────
function PhoneticIssueCard({ issue, index, lang }: { issue: PhoneticIssue; index: number; lang: Lang }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + (index * 0.1) }} className="glass-panel p-5 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400 to-brand-600" />
      <div className="flex flex-col md:flex-row gap-4">
        <div className="min-w-[120px] flex flex-col gap-2">
          <div className="text-xl font-bold text-white">"{issue.word}"</div>
          <div className="text-[10px] uppercase tracking-widest text-brand-400 font-bold">{issue.issue}</div>
          <SpeakButton text={issue.word} label={t('phonetic.listen', lang)} size="small" />
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {issue.spoken_as && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div className="text-[10px] uppercase text-red-400 font-bold mb-1">{t('phonetic.your_sound', lang)}</div>
              <div className="text-lg tracking-widest text-red-200">{issue.spoken_as}</div>
              <div className="text-[10px] text-red-300/70 mt-1">{issue.common_error}</div>
            </div>
          )}
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3">
            <div className="text-[10px] uppercase text-brand-400 font-bold mb-1">{t('phonetic.correct_sound', lang)}</div>
            <div className="text-lg tracking-widest text-brand-200">{issue.ipa_correct}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
        <div className="flex items-start gap-2"><Sparkles className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" /><p className="text-sm text-blue-200/80">{issue.tip}</p></div>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────
//  Component: Stress Issue Card
// ────────────────────────────────────────────────
function StressIssueCard({ issue, index, lang }: { issue: StressIssue; index: number; lang: Lang }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + (index * 0.1) }} className="glass-panel p-4 relative overflow-hidden flex items-center gap-4">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-violet-600" />
      <div className="min-w-[100px]">
        <div className="text-lg font-bold text-white">"{issue.word}"</div>
        <SpeakButton text={issue.word} label={t('phonetic.listen', lang)} size="small" className="mt-1" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest text-violet-400 font-bold mb-1">{t('stress.pattern', lang)}</div>
        <div className="text-sm text-violet-200">{issue.correct_stress}</div>
        <div className="text-[10px] text-slate-500 mt-1">{t('stress.common_mistake', lang)} {issue.common_mistake}</div>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────
//  Main App
// ────────────────────────────────────────────────
export default function App() {
  // Language — default Russian
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('app_lang') as Lang) || 'ru');
  const toggleLang = () => { const next = lang === 'ru' ? 'en' : 'ru'; setLang(next); localStorage.setItem('app_lang', next); };

  const [levels, setLevels] = useState<CEFRLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [hasCompletedTest, setHasCompletedTest] = useState(() => localStorage.getItem('has_completed_test') === 'true');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [phrases, setPhrases] = useState<string[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'practice' | 'twisters'>('practice');

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState<{ id: number; email: string; name: string; level: string } | null>(() => {
    const s = localStorage.getItem('auth_user'); return s ? JSON.parse(s) : null;
  });
  const [showProgress, setShowProgress] = useState(false);
  const [showAuthPage, setShowAuthPage] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [step, setStep] = useState<'ready' | 'recording' | 'analyzing' | 'results'>('ready');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<string>("");

  const handleAuth = (tok: string, u: { id: number; email: string; name: string; level: string }) => {
    setToken(tok); setUser(u); localStorage.setItem('auth_token', tok); localStorage.setItem('auth_user', JSON.stringify(u)); setShowAuthPage(false);
    if (u.level && u.level !== 'A1') setSelectedLevel(u.level);
  };
  const handleLogout = () => { setToken(null); setUser(null); localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); localStorage.removeItem('has_completed_test'); setHasCompletedTest(false); };
  const handleTestComplete = (level: string) => { setSelectedLevel(level); setHasCompletedTest(true); localStorage.setItem('has_completed_test', 'true'); };

  // ─── Effects ─────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/levels`).then(r => r.json()).then(d => setLevels(d?.levels || [])).catch(() => {
      setLevels([{ code: 'A1', name: 'Beginner', description: '' }, { code: 'A2', name: 'Elementary', description: '' },
        { code: 'B1', name: 'Intermediate', description: '' }, { code: 'B2', name: 'Upper Intermediate', description: '' },
        { code: 'C1', name: 'Advanced', description: '' }, { code: 'C2', name: 'Proficiency', description: '' }]);
    });
    fetch(`${API_BASE}/api/topics`).then(r => r.json()).then(d => { const l = d?.topics || []; setTopics(l); if (l.length > 0) setSelectedTopic(l[0].id); }).catch(() => {});
    const s = localStorage.getItem("pronunciation_history"); if (s) setHistory(JSON.parse(s));
    if (SpeechRecognition) {
      const rec = new SpeechRecognition(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'; rec.maxAlternatives = 1;
      rec.onresult = (e: any) => { let f = '', i2 = ''; for (let i = 0; i < e.results.length; i++) { const r2 = e.results[i]; if (r2.isFinal) f += r2[0].transcript + ' '; else i2 += r2[0].transcript; } const c = f.trim() || i2.trim(); if (c) transcriptRef.current = c; };
      rec.onend = () => { if (mediaRecorderRef.current?.state === 'recording') { try { rec.start(); } catch {} } };
      rec.onerror = (ev: any) => { if (ev.error === 'no-speech' && mediaRecorderRef.current?.state === 'recording') { try { rec.start(); } catch {} } };
      recognitionRef.current = rec;
    }
    if ('speechSynthesis' in window) speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ level: selectedLevel });
    if (selectedTopic) params.set('topic', selectedTopic);
    fetch(`${API_BASE}/api/phrases?${params}`).then(r => r.json()).then(d => { setPhrases(d?.phrases || []); setCurrentPhraseIndex(0); setResult(null); setStep('ready'); })
      .catch(() => setPhrases(["Hello, my name is Anna.", "The weather is nice today.", "Can you help me please?"]));
  }, [selectedLevel, selectedTopic]);

  useEffect(() => { localStorage.setItem("pronunciation_history", JSON.stringify(history)); }, [history]);

  // ─── Recording ───────────────────────────────
  const startRecording = async () => {
    setResult(null); transcriptRef.current = ""; setStep('recording');
    try {
      const as2 = await navigator.mediaDevices.getUserMedia({ audio: true }); setStream(as2);
      let mt = ''; if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mt = 'audio/webm;codecs=opus'; else if (MediaRecorder.isTypeSupported('audio/mp4')) mt = 'audio/mp4';
      const mr = new MediaRecorder(as2, mt ? { mimeType: mt } : undefined); mediaRecorderRef.current = mr; audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => { const b = new Blob(audioChunksRef.current, { type: mt || 'audio/webm' }); submitAnalysis(transcriptRef.current.trim(), b); };
      if (recognitionRef.current) { try { recognitionRef.current.start(); } catch {} }
      mr.start(100); setIsRecording(true);
    } catch { alert(t('mic.denied', lang)); setStep('ready'); }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
      mediaRecorderRef.current.stop(); setIsRecording(false); setStep('analyzing');
      if (stream) { stream.getTracks().forEach(t2 => t2.stop()); setStream(null); }
    }
  };

  // ─── Analysis ────────────────────────────────
  const submitAnalysis = async (userText: string, audioBlob?: Blob) => {
    setStep('analyzing');
    const targetText = phrases[currentPhraseIndex] || "";
    if (!userText.trim() && !audioBlob) {
      const tw = targetText.toLowerCase().replace(/[^\w\s']/g, '').split(/\s+/);
      setResult({ scores: { overall: 0, accuracy: 0, fluency: 0, completeness: 0, intonation: 0, stress: 0 }, word_analysis: { correct: [], incorrect: [], missing: tw.map(w => ({ word: w, status: 'missing' })), extra: [] }, phonetic_issues: [], stress_issues: [], target_text: targetText, user_text: '', summary: t('result.no_speech', lang) });
      setStep('results'); return;
    }
    try {
      const fd = new FormData(); fd.append('target_text', targetText); fd.append('user_text', userText);
      if (audioBlob) fd.append('audio_file', audioBlob, 'recording.webm');
      const resp = await fetch(`${API_BASE}/api/analyze`, { method: 'POST', body: fd });
      if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
      const data: AnalysisResult = await resp.json(); setResult(data); setStep('results');
      const hi: HistoryItem = { id: Math.random().toString(36).substring(7), phrase: targetText, level: selectedLevel, topic: selectedTopic, score: data.scores.overall, accuracy: data.scores.accuracy, date: new Date().toLocaleTimeString(), issueCount: data.phonetic_issues.length };
      setHistory(prev => [hi, ...prev].slice(0, 50));
      if (token) { fetch(`${API_BASE}/api/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ phrase: targetText, level: selectedLevel, topic: selectedTopic, overall_score: data.scores.overall, accuracy: data.scores.accuracy, fluency: data.scores.fluency, completeness: data.scores.completeness, intonation: data.scores.intonation || 0, stress: data.scores.stress || 0, issue_count: data.phonetic_issues.length }) }).catch(e => console.error('Save error:', e)); }
    } catch {
      const tn = targetText.toLowerCase().replace(/[^\w\s']/g, ''); const un = userText.toLowerCase().replace(/[^\w\s']/g, '');
      const tw2 = tn.split(/\s+/); const uw2 = un.split(/\s+/);
      const correct = tw2.filter(w => uw2.includes(w)); const missing = tw2.filter(w => !uw2.includes(w)); const extra = uw2.filter(w => !tw2.includes(w));
      const sc2 = Math.round((correct.length / Math.max(tw2.length, 1)) * 100);
      setResult({ scores: { overall: sc2, accuracy: sc2, fluency: Math.max(0, sc2 - 10), completeness: sc2, intonation: 0, stress: 0 }, word_analysis: { correct: correct.map(w => ({ word: w, status: 'correct' })), incorrect: [], missing: missing.map(w => ({ word: w, status: 'missing' })), extra: extra.map(w => ({ word: w, status: 'extra' })) }, phonetic_issues: [], stress_issues: [], target_text: targetText, user_text: userText, summary: userText ? `${correct.length}/${tw2.length} words matched.` : t('result.no_speech', lang) });
      setStep('results');
    }
  };

  const nextPhrase = () => { setCurrentPhraseIndex(p => (p + 1) % phrases.length); setResult(null); setStep('ready'); };
  const prevPhrase = () => { setCurrentPhraseIndex(p => (p - 1 + phrases.length) % phrases.length); setResult(null); setStep('ready'); };
  const tryAgain = () => { setResult(null); setStep('ready'); };
  const clearHistory = () => { setHistory([]); localStorage.removeItem("pronunciation_history"); };
  const currentPhrase = phrases?.[currentPhraseIndex] || "";

  // ── Current topic name for display ──
  const currentTopicName = topics.find(tp => tp.id === selectedTopic)?.name || '';

  // ────────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────────
  if (showAuthPage) return <AuthPage onAuth={handleAuth} onBack={() => setShowAuthPage(false)} lang={lang} />;
  if (!hasCompletedTest) return <LevelCheck onComplete={handleTestComplete} lang={lang} />;
  if (showProgress && token) return <ProgressPage token={token} onBack={() => setShowProgress(false)} lang={lang} />;

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-brand-500/30">
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-600/10 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-5xl flex flex-col md:flex-row gap-8 min-h-screen">
        <div className="flex-1 flex flex-col items-center">

          {/* Header */}
          <header className="w-full mb-6 flex justify-between items-center glass-panel px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-blue-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Activity className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-200 to-white">AI English Coach</h1>
                <p className="text-xs text-brand-300/70 uppercase tracking-widest font-semibold flex items-center gap-2">
                  {t('app.subtitle', lang)} <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Toggle */}
              <button onClick={toggleLang} title={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {lang === 'ru' ? 'EN' : 'RU'}
              </button>
              {token && <button onClick={() => setShowProgress(true)} className="px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-500/20 transition-all">{t('header.progress', lang)}</button>}
              <span className="hidden md:inline-flex px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[10px] font-bold uppercase tracking-widest">{t('header.level', lang)} {selectedLevel}</span>
              {user ? (
                <>
                  <span className="hidden md:inline-flex px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest">{user.name}</span>
                  <button onClick={handleLogout} className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all">{t('header.logout', lang)}</button>
                </>
              ) : (
                <button onClick={() => setShowAuthPage(true)} className="px-3 py-1.5 rounded-full bg-gradient-to-r from-brand-500/20 to-blue-500/20 border border-brand-500/30 text-brand-300 text-[10px] font-bold uppercase tracking-widest hover:from-brand-500/30 hover:to-blue-500/30 transition-all">{t('header.signin', lang)}</button>
              )}
              <button onClick={() => setShowHistory(!showHistory)} className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"><History className="w-5 h-5 text-brand-300" /></button>
            </div>
          </header>

          <LevelSelector levels={levels} selected={selectedLevel} onSelect={setSelectedLevel} lang={lang} />
          {topics.length > 0 && <TopicSelector topics={topics} selected={selectedTopic} onSelect={setSelectedTopic} lang={lang} />}

          {/* Tabs */}
          <div className="w-full max-w-2xl mx-auto mb-6 flex items-center justify-center gap-2">
            <button onClick={() => setActiveTab('practice')} className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${activeTab === 'practice' ? 'bg-brand-500/20 border-brand-500/50 text-brand-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>{t('tab.practice', lang)}</button>
            <button onClick={() => setActiveTab('twisters')} className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${activeTab === 'twisters' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>{t('tab.twisters', lang)}</button>
          </div>

          {activeTab === 'twisters' && <TongueTwisters level={selectedLevel} lang={lang} />}

          {activeTab === 'practice' && (
            <>
              <section className="w-full text-center space-y-4 mb-8">
                <div className="flex items-center justify-between w-full max-w-2xl mx-auto px-2">
                  <button onClick={prevPhrase} disabled={step === 'recording' || step === 'analyzing'} className="text-xs uppercase flex items-center gap-1 text-slate-400 hover:text-brand-300 transition-colors font-bold disabled:opacity-30"><ChevronLeft className="w-4 h-4" /> {t('phrase.prev', lang)}</button>
                  <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    {t('phrase.counter', lang)} {currentPhraseIndex + 1}/{phrases?.length || 1}
                    {currentTopicName && <span className="text-brand-400/60 ml-1">· {currentTopicName}</span>}
                  </h2>
                  <button onClick={nextPhrase} disabled={step === 'recording' || step === 'analyzing'} className="text-xs uppercase flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors font-bold disabled:opacity-30">{t('phrase.next', lang)} <ChevronRight className="w-4 h-4" /></button>
                </div>

                <div className="glass-panel p-8 md:p-12 relative overflow-hidden group w-full max-w-2xl mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                  <p className="relative z-10 text-2xl md:text-3xl lg:text-4xl font-light leading-relaxed tracking-wide text-white drop-shadow-md">"{currentPhrase}"</p>
                  {step === 'ready' && (
                    <div className="relative z-10 mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <SpeakButton text={currentPhrase} label={t('phrase.listen', lang)} />
                    </div>
                  )}
                </div>
              </section>

              <section className="w-full flex flex-col items-center mb-12 relative max-w-2xl mx-auto">
                <AudioVisualizer isRecording={isRecording} mediaStream={stream} />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onMouseDown={(e) => { e.preventDefault(); if (!isRecording && step !== 'analyzing') startRecording(); }}
                  onMouseUp={(e) => { e.preventDefault(); if (isRecording) stopRecording(); }}
                  onMouseLeave={() => { if (isRecording) stopRecording(); }}
                  onTouchStart={(e) => { e.preventDefault(); if (!isRecording && step !== 'analyzing') startRecording(); }}
                  onTouchEnd={(e) => { e.preventDefault(); if (isRecording) stopRecording(); }}
                  onContextMenu={(e) => e.preventDefault()} disabled={step === 'analyzing'}
                  className={`absolute bottom-[-32px] md:bottom-[-40px] z-20 flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full shadow-2xl transition-all duration-300 disabled:opacity-30 ${isRecording ? 'bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-brand-500 text-slate-950 hover:bg-brand-400 hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] border border-brand-300'}`}>
                  {isRecording ? <Square className="w-8 h-8 md:w-10 md:h-10 fill-current" /> : <Mic className="w-8 h-8 md:w-10 md:h-10" />}
                  {isRecording && <span className="absolute inset-0 rounded-full border border-red-500/50 animate-ping" />}
                </motion.button>
              </section>

              <div className="w-full text-center mt-10 mb-2">
                <p className="text-[11px] text-slate-500/80 px-4 max-w-sm mx-auto uppercase tracking-wider">{t('mic.notice', lang)}</p>
              </div>

              <div className="w-full max-w-2xl mx-auto mt-8 md:mt-12">
                <AnimatePresence mode="wait">
                  {step === 'analyzing' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} key="analyzing" className="w-full glass-panel p-8 text-center flex flex-col items-center justify-center space-y-4">
                      <div className="relative w-16 h-16 flex items-center justify-center"><RefreshCw className="w-8 h-8 text-brand-400 animate-spin absolute" /><div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-brand-500/30 animate-[spin_2s_linear_infinite_reverse]" /></div>
                      <p className="text-lg font-medium text-brand-200">{t('analyzing.title', lang)}</p>
                      <p className="text-sm text-slate-500">{t('analyzing.subtitle', lang)}</p>
                    </motion.div>
                  )}

                  {step === 'results' && result && (
                    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} key="results" className="w-full space-y-6">
                      <div className="glass-panel p-4 text-center">
                        <p className="text-sm text-slate-400">{result.summary}</p>
                        {result.user_text && <p className="text-xs text-slate-500 mt-2">{t('result.you_said', lang)} <span className="text-slate-300 italic">"{result.user_text}"</span></p>}
                      </div>

                      <div className={`glass-panel p-6 md:p-8 border bg-gradient-to-br ${getScoreBg(result.scores.overall)}`}>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="text-center md:text-left">
                            <h3 className="text-2xl font-bold text-white mb-1">{getScoreLabelLocalized(result.scores.overall, lang)}</h3>
                            <p className="text-slate-400 text-sm">
                              {result.phonetic_issues.length === 0 ? t('result.no_issues', lang) : `${lang === 'ru' ? t('result.issues_found', lang) : 'Found'} ${result.phonetic_issues.length} ${lang === 'en' ? t('result.issues_found', lang) : ''}`}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-6">
                          {[
                            { label: t('score.total', lang), value: result.scores.overall, suffix: '' },
                            { label: t('score.accuracy', lang), value: result.scores.accuracy, suffix: '%' },
                            { label: t('score.fluency', lang), value: result.scores.fluency, suffix: '%' },
                            { label: t('score.complete', lang), value: result.scores.completeness, suffix: '%' },
                            { label: t('score.intonation', lang), value: result.scores.intonation ?? 0, suffix: '%' },
                            { label: t('score.stress', lang), value: result.scores.stress ?? 0, suffix: '%' },
                          ].map((m, idx) => (
                            <div key={m.label} className="flex flex-col items-center">
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 + idx * 0.05 }} className={`text-2xl md:text-3xl font-bold ${getScoreColor(m.value)}`}>{m.value}{m.suffix}</motion.div>
                              <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">{m.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="glass-panel p-5 md:p-6">
                        <h4 className="text-sm font-semibold text-brand-300 uppercase tracking-widest mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" /> {t('words.breakdown', lang)}</h4>
                        <WordHighlight analysis={result.word_analysis} lang={lang} />
                      </div>

                      {result.phonetic_issues.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-brand-300 uppercase tracking-widest px-2 flex items-center gap-2"><Volume2 className="w-4 h-4" /> {t('phonetic.title', lang)}</h4>
                          <p className="text-xs text-slate-500 px-2">{t('phonetic.hint', lang)}</p>
                          {result.phonetic_issues.map((iss, i) => <PhoneticIssueCard key={i} issue={iss} index={i} lang={lang} />)}
                        </div>
                      )}

                      {result.stress_issues && result.stress_issues.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-violet-300 uppercase tracking-widest px-2 flex items-center gap-2">{t('stress.title', lang)}</h4>
                          <p className="text-xs text-slate-500 px-2">{t('stress.hint', lang)}</p>
                          {result.stress_issues.map((si, i) => <StressIssueCard key={i} issue={si} index={i} lang={lang} />)}
                        </div>
                      )}

                      <div className="glass-panel p-5 md:p-6 text-center space-y-4">
                        <h4 className="text-sm font-semibold text-brand-300 uppercase tracking-widest flex items-center justify-center gap-2"><Volume2 className="w-4 h-4" /> {t('full_phrase.title', lang)}</h4>
                        <p className="text-slate-400 text-sm">{t('full_phrase.hint', lang)}</p>
                        <div className="flex items-center justify-center gap-3"><SpeakButton text={currentPhrase} label={t('full_phrase.play', lang)} /></div>
                      </div>

                      <div className="flex items-center justify-center gap-4 pt-2 pb-8">
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={tryAgain} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 hover:bg-brand-500/20 transition-all"><RotateCcw className="w-4 h-4" /><span className="font-semibold text-sm">{t('action.try_again', lang)}</span></motion.button>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={nextPhrase} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-slate-950 hover:bg-brand-400 transition-all font-semibold text-sm">{t('action.next_phrase', lang)} <ArrowRight className="w-4 h-4" /></motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* Sidebar History */}
        <div className={`fixed md:relative top-0 right-0 h-full md:h-auto w-[300px] md:w-80 glass-panel border-l border-brand-500/20 p-6 z-50 transition-transform duration-300 ${showHistory ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} bg-slate-950/90 md:bg-transparent backdrop-blur-2xl md:backdrop-blur-none`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm uppercase tracking-widest text-brand-300 font-bold flex items-center gap-2"><History className="w-4 h-4" /> {t('history.title', lang)}</h3>
            <div className="flex items-center gap-2">
              {history.length > 0 && <button onClick={clearHistory} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Clear"><Trash2 className="w-4 h-4" /></button>}
              <button onClick={() => setShowHistory(false)} className="md:hidden p-1.5 text-slate-400"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[80vh] custom-scrollbar pr-2">
            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">{t('history.empty', lang)}</div>
            ) : (
              <AnimatePresence>
                {history.map((item, idx) => (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: idx * 0.03 }} key={item.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-brand-500/30 transition-all cursor-pointer group">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300 font-bold">{item.level}</span><span className="text-xs text-slate-400">{item.date}</span></div>
                      <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}</span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2 italic">"{item.phrase}"</p>
                    {item.issueCount > 0 && <div className="mt-2 text-[10px] text-amber-400/70">{item.issueCount} {t('history.issues', lang)}</div>}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          {history.length > 0 && (
            <div className="mt-6 pt-6 border-t border-brand-500/10">
              <div className="text-xs text-slate-400 mb-2">{t('history.avg_score', lang)}</div>
              <div className={`text-3xl font-bold ${getScoreColor(Math.round(history.reduce((a, c) => a + c.score, 0) / history.length))}`}>{Math.round(history.reduce((a, c) => a + c.score, 0) / history.length)}</div>
            </div>
          )}
        </div>
      </main>
      <ChatBot />
    </div>
  );
}
