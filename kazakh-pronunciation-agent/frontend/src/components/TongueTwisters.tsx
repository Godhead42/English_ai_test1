import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, RefreshCw, Mic, Square, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE_URL from '../apiConfig';
import { t, type Lang } from '../i18n';

interface AnalysisResult {
  scores: { overall: number; accuracy: number; fluency: number; completeness: number; intonation: number; stress: number };
  word_analysis: any;
  phonetic_issues: any[];
  stress_issues: any[];
  target_text: string;
  user_text: string;
  summary: string;
}

interface Props {
  level: string;
  lang: Lang;
  token: string | null;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function TongueTwisters({ level, lang, token }: Props) {
  const [twisters, setTwisters] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [step, setStep] = useState<'ready' | 'recording' | 'analyzing' | 'results'>('ready');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef("");
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/tongue-twisters?level=${level}`)
      .then(r => r.json())
      .then(d => { setTwisters(d.tongue_twisters || []); setCurrentIdx(0); setResult(null); setStep('ready'); })
      .catch(() => setTwisters([]));
  }, [level]);

  // Init speech recognition once
  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'; rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        let f = '', i2 = '';
        for (let i = 0; i < e.results.length; i++) {
          const r2 = e.results[i];
          if (r2.isFinal) f += r2[0].transcript + ' '; else i2 += r2[0].transcript;
        }
        const c = f.trim() || i2.trim();
        if (c) transcriptRef.current = c;
      };
      rec.onend = () => { if (mediaRecorderRef.current?.state === 'recording') { try { rec.start(); } catch {} } };
      rec.onerror = (ev: any) => { if (ev.error === 'no-speech' && mediaRecorderRef.current?.state === 'recording') { try { rec.start(); } catch {} } };
      recognitionRef.current = rec;
    }
  }, []);

  const speak = () => {
    if (!twisters[currentIdx]) return;
    setPlaying(true);
    const audio = new Audio(`${API_BASE_URL}/api/tts?text=${encodeURIComponent(twisters[currentIdx])}&slow=true`);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play();
  };

  // ─── Recording ──────────────────────────────
  const startRecording = useCallback(async () => {
    setResult(null); transcriptRef.current = ''; setStep('recording');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      let mt = '';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mt = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mt = 'audio/mp4';
      const mr = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mt || 'audio/webm' });
        submitAnalysis(transcriptRef.current.trim(), blob);
      };
      if (recognitionRef.current) { try { recognitionRef.current.start(); } catch {} }
      mr.start(100); setIsRecording(true);
    } catch {
      alert(t('mic.denied', lang));
      setStep('ready');
    }
  }, [lang]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
      mediaRecorderRef.current.stop(); setIsRecording(false); setStep('analyzing');
      if (streamRef.current) { streamRef.current.getTracks().forEach(t2 => t2.stop()); streamRef.current = null; }
    }
  }, [isRecording]);

  const submitAnalysis = async (userText: string, audioBlob?: Blob) => {
    setStep('analyzing');
    // Guarantee targetText is always a non-empty string
    const currentTwister = twisters[currentIdx];
    const targetText = typeof currentTwister === 'string'
      ? currentTwister
      : (currentTwister as any)?.text || (currentTwister as any)?.phrase || 'Empty target';
    try {
      const fd = new FormData();
      fd.append('target_text', targetText);
      fd.append('user_text', userText);
      if (audioBlob) fd.append('audio_file', audioBlob, 'recording.webm');
      const resp = await fetch(`${API_BASE_URL}/api/analyze`, { method: 'POST', body: fd });
      if (!resp.ok) throw new Error(`${resp.status}`);
      const data: AnalysisResult = await resp.json();
      setResult(data); setStep('results');

      // Save progress if logged in
      if (token) {
        fetch(`${API_BASE_URL}/api/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ phrase: targetText, level, topic: 'tongue_twister', overall_score: data?.scores?.overall || 0, accuracy: data?.scores?.accuracy || 0, fluency: data?.scores?.fluency || 0, completeness: data?.scores?.completeness || 0, intonation: data?.scores?.intonation || 0, stress: data?.scores?.stress || 0, issue_count: data?.phonetic_issues?.length || 0 }),
        }).catch(() => {});
      }
    } catch (err: any) {
      setResult({ scores: { overall: 0, accuracy: 0, fluency: 0, completeness: 0, intonation: 0, stress: 0 }, word_analysis: { correct: [], incorrect: [], missing: [], extra: [] }, phonetic_issues: [], stress_issues: [], target_text: targetText, user_text: userText, summary: lang === 'ru' ? `Ошибка сервера. Но мы вас услышали: "${userText}". Попробуйте еще раз.` : `Server error. But we heard you: "${userText}". Please try again.` });
      setStep('results');
    }
  };

  const nextTwister = () => { setCurrentIdx(i => (i + 1) % twisters.length); setResult(null); setStep('ready'); };
  const tryAgain = () => { setResult(null); setStep('ready'); };

  if (twisters.length === 0) return null;

  const scoreColor = (s: number) => s >= 85 ? 'text-emerald-400' : s >= 65 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 sm:mb-8">
      <div className="glass-panel p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Header */}
        <h3 className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-400 font-bold flex items-center gap-2">
          {t('twister.title', lang)} — {level}
        </h3>

        {/* Twister phrase */}
        <motion.p key={currentIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-base sm:text-lg md:text-xl font-light text-white leading-relaxed italic">
          "{twisters[currentIdx]}"
        </motion.p>

        {/* Listen + Next buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button onClick={speak} disabled={playing}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-amber-500/30 transition-all disabled:opacity-40">
            <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {playing ? t('twister.playing', lang) : t('twister.listen', lang)}
          </button>
          <button onClick={nextTwister}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {t('twister.next', lang)}
          </button>
        </div>

        {/* Microphone */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 pt-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onMouseDown={(e) => { e.preventDefault(); if (!isRecording && step !== 'analyzing') startRecording(); }}
            onMouseUp={(e) => { e.preventDefault(); if (isRecording) stopRecording(); }}
            onMouseLeave={() => { if (isRecording) stopRecording(); }}
            onTouchStart={(e) => { e.preventDefault(); if (!isRecording && step !== 'analyzing') startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); if (isRecording) stopRecording(); }}
            onContextMenu={(e) => e.preventDefault()}
            disabled={step === 'analyzing'}
            className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-xl transition-all duration-300 disabled:opacity-30
              ${isRecording
                ? 'bg-red-500/20 border-2 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                : 'bg-brand-500 text-slate-950 hover:bg-brand-400 border border-brand-300 hover:shadow-[0_0_20px_rgba(45,212,191,0.4)]'}`}>
            {isRecording ? <Square className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
            {isRecording && <span className="absolute inset-0 rounded-full border border-red-500/50 animate-ping" />}
          </motion.button>
          <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider">
            {isRecording ? (lang === 'ru' ? 'Отпустите для остановки...' : 'Release to stop...') : t('mic.notice', lang)}
          </p>
        </div>

        {/* Analyzing spinner */}
        <AnimatePresence>
          {step === 'analyzing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 py-3 sm:py-4">
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-brand-400 animate-spin" />
              <p className="text-xs sm:text-sm text-brand-300">{t('analyzing.title', lang)}</p>
            </motion.div>
          )}

          {/* Results */}
          {step === 'results' && result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 sm:space-y-4 pt-2">
              {/* Summary */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/5 text-xs sm:text-sm text-slate-300 text-center">
                {result.summary}
                {result.user_text && <p className="text-[10px] sm:text-xs text-slate-500 mt-1">{t('result.you_said', lang)} <span className="italic text-slate-400">"{result.user_text}"</span></p>}
              </div>

              {/* 6 score grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">
                {[
                  { label: t('score.total', lang), value: result.scores.overall },
                  { label: t('score.accuracy', lang), value: result.scores.accuracy },
                  { label: t('score.fluency', lang), value: result.scores.fluency },
                  { label: t('score.complete', lang), value: result.scores.completeness },
                  { label: t('score.intonation', lang), value: result.scores.intonation ?? 0 },
                  { label: t('score.stress', lang), value: result.scores.stress ?? 0 },
                ].map(m => (
                  <div key={m.label} className="flex flex-col items-center p-1.5 sm:p-2 rounded-lg bg-white/5">
                    <span className={`text-sm sm:text-lg font-bold ${scoreColor(m.value)}`}>{m.value}%</span>
                    <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-slate-500 mt-0.5 font-bold">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <button onClick={tryAgain} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-brand-500/20 transition-all">
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {t('action.try_again', lang)}
                </button>
                <button onClick={nextTwister} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-brand-500 text-slate-950 text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-brand-400 transition-all">
                  <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {t('twister.next', lang)}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider text-center">
          {currentIdx + 1} / {twisters.length} — {t('twister.hint', lang)}
        </p>
      </div>
    </div>
  );
}
