import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, RefreshCw, Mic, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE_URL from '../apiConfig';
import { t, type Lang } from '../i18n';

interface Props {
  level: string;
  lang: Lang;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function TongueTwisters({ level, lang }: Props) {
  const [twisters, setTwisters] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [summary, setSummary] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/tongue-twisters?level=${level}`)
      .then(r => r.json())
      .then(d => {
        setTwisters(d.tongue_twisters || []);
        setCurrentIdx(0);
        setScore(null);
        setSummary('');
      })
      .catch(() => setTwisters([]));
  }, [level]);

  // Init speech recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        let final = '';
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        }
        if (final.trim()) transcriptRef.current = final.trim();
      };
      rec.onend = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          try { rec.start(); } catch {}
        }
      };
      rec.onerror = () => {};
      recognitionRef.current = rec;
    }
  }, []);

  const speak = useCallback(() => {
    if (!twisters[currentIdx]) return;
    setPlaying(true);
    const audio = new Audio(`${API_BASE_URL}/api/tts?text=${encodeURIComponent(twisters[currentIdx])}&slow=true`);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play();
  }, [twisters, currentIdx]);

  const startRecording = async () => {
    setScore(null);
    setSummary('');
    transcriptRef.current = '';
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
        analyzeRecording(blob);
      };
      if (recognitionRef.current) { try { recognitionRef.current.start(); } catch {} }
      mr.start(100);
      setIsRecording(true);
    } catch {
      alert(t('mic.denied', lang));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsAnalyzing(true);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t2 => t2.stop());
        streamRef.current = null;
      }
    }
  };

  const analyzeRecording = async (blob: Blob) => {
    const targetText = twisters[currentIdx] || '';
    const fd = new FormData();
    fd.append('target_text', targetText);
    fd.append('user_text', transcriptRef.current);
    fd.append('audio_file', blob, 'recording.webm');
    try {
      const resp = await fetch(`${API_BASE_URL}/api/analyze`, { method: 'POST', body: fd });
      if (!resp.ok) throw new Error('Analysis failed');
      const data = await resp.json();
      setScore(data.scores?.overall ?? 0);
      setSummary(data.summary || '');
    } catch {
      setScore(null);
      setSummary(lang === 'ru' ? 'Ошибка анализа. Попробуйте ещё раз.' : 'Analysis failed. Try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const goNext = () => {
    setCurrentIdx(i => (i + 1) % twisters.length);
    setScore(null);
    setSummary('');
  };

  if (twisters.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="glass-panel p-6 space-y-5">
        <h3 className="text-xs uppercase tracking-widest text-amber-400 font-bold flex items-center gap-2">
          {t('twister.title', lang)} — {level}
        </h3>

        <motion.p
          key={currentIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg md:text-xl font-light text-white leading-relaxed italic"
        >
          "{twisters[currentIdx]}"
        </motion.p>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Listen */}
          <button
            onClick={speak}
            disabled={playing || isRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest hover:bg-amber-500/30 transition-all disabled:opacity-40"
          >
            <Volume2 className="w-4 h-4" />
            {playing ? t('twister.playing', lang) : t('twister.listen', lang)}
          </button>

          {/* Record */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onMouseDown={(e) => { e.preventDefault(); if (!isRecording && !isAnalyzing) startRecording(); }}
            onMouseUp={(e) => { e.preventDefault(); if (isRecording) stopRecording(); }}
            onMouseLeave={() => { if (isRecording) stopRecording(); }}
            onTouchStart={(e) => { e.preventDefault(); if (!isRecording && !isAnalyzing) startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); if (isRecording) stopRecording(); }}
            onContextMenu={(e) => e.preventDefault()}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40 border ${
              isRecording
                ? 'bg-red-500/30 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                : 'bg-brand-500/20 border-brand-500/40 text-brand-300 hover:bg-brand-500/30'
            }`}
          >
            {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
            {isRecording
              ? (lang === 'ru' ? 'Запись...' : 'Recording...')
              : (lang === 'ru' ? 'Произнести' : 'Speak')}
            {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          </motion.button>

          {/* Next */}
          <button
            onClick={goNext}
            disabled={isRecording || isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('twister.next', lang)}
          </button>
        </div>

        {/* Analysis result */}
        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-brand-300"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              {lang === 'ru' ? 'Анализируем...' : 'Analyzing...'}
            </motion.div>
          )}
          {!isAnalyzing && score !== null && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  {lang === 'ru' ? 'Результат' : 'Score'}:
                </span>
                <span className={`text-2xl font-bold ${
                  score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {score}%
                </span>
              </div>
              {summary && <p className="text-sm text-slate-400">{summary}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
          {currentIdx + 1} / {twisters.length} — {t('twister.hint', lang)}
        </p>
      </div>
    </div>
  );
}
