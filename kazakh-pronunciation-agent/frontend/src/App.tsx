import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Square, Volume2, RefreshCw, Activity, ChevronRight, ChevronLeft,
  History, Trash2, BookOpen, CheckCircle2, XCircle, AlertTriangle,
  Play, RotateCcw, ArrowRight, Sparkles, GraduationCap
} from 'lucide-react';
import AudioVisualizer from './components/AudioVisualizer';
import { motion, AnimatePresence } from 'framer-motion';

// ────────────────────────────────────────────────
//  Web Speech API types
// ────────────────────────────────────────────────
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// ────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────
interface CEFRLevel {
  code: string;
  name: string;
  description: string;
}

interface WordAnalysis {
  correct: { word: string; status: string }[];
  incorrect: { word: string; spoken_as: string; similarity: number; status: string }[];
  missing: { word: string; status: string }[];
  extra: { word: string; status: string }[];
}

interface PhoneticIssue {
  word: string;
  spoken_as: string | null;
  category: string;
  ipa_correct: string;
  common_error: string;
  issue: string;
  tip: string;
}

interface AnalysisResult {
  scores: { overall: number; accuracy: number; fluency: number; completeness: number };
  word_analysis: WordAnalysis;
  phonetic_issues: PhoneticIssue[];
  target_text: string;
  user_text: string;
  summary: string;
}

interface HistoryItem {
  id: string;
  phrase: string;
  level: string;
  score: number;
  accuracy: number;
  date: string;
  issueCount: number;
}

// ────────────────────────────────────────────────
//  API Base URL
// ────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';

// ────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────
function getScoreColor(score: number) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 65) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreBg(score: number) {
  if (score >= 85) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
  if (score >= 65) return 'from-amber-500/20 to-amber-500/5 border-amber-500/30';
  return 'from-red-500/20 to-red-500/5 border-red-500/30';
}

function getScoreLabel(score: number) {
  if (score >= 90) return 'Excellent!';
  if (score >= 75) return 'Great Job!';
  if (score >= 60) return 'Good Effort!';
  if (score >= 40) return 'Keep Practicing';
  return 'Try Again';
}

// ────────────────────────────────────────────────
//  Component: Level Selector
// ────────────────────────────────────────────────
function LevelSelector({
  levels,
  selected,
  onSelect
}: {
  levels: CEFRLevel[];
  selected: string;
  onSelect: (code: string) => void
}) {
  const levelColors: Record<string, string> = {
    'A1': 'from-green-400 to-emerald-500',
    'A2': 'from-emerald-400 to-teal-500',
    'B1': 'from-blue-400 to-cyan-500',
    'B2': 'from-indigo-400 to-blue-500',
    'C1': 'from-purple-400 to-violet-500',
    'C2': 'from-pink-400 to-rose-500',
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="flex items-center gap-2 mb-4 px-2">
        <GraduationCap className="w-4 h-4 text-brand-400" />
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          Select Your Level
        </h2>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {levels.map((level) => (
          <motion.button
            key={level.code}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(level.code)}
            className={`
              relative p-3 rounded-xl border transition-all duration-300 group overflow-hidden
              ${selected === level.code
                ? 'border-white/30 bg-white/10 shadow-lg shadow-brand-500/10'
                : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15'}
            `}
          >
            {selected === level.code && (
              <motion.div
                layoutId="level-indicator"
                className={`absolute inset-0 bg-gradient-to-b ${levelColors[level.code] || 'from-brand-400 to-brand-600'} opacity-20`}
              />
            )}
            <div className="relative z-10">
              <div className={`text-lg font-bold ${selected === level.code ? 'text-white' : 'text-slate-300'}`}>
                {level.code}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-0.5 font-semibold">
                {level.name}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
//  Component: TTS PlayButton (uses backend gTTS)
// ────────────────────────────────────────────────

// Audio cache to avoid re-fetching the same text
const audioCache = new Map<string, string>();

function SpeakButton({
  text,
  label = "Listen",
  className = "",
  size = "normal",
  slow = false
}: {
  text: string;
  label?: string;
  className?: string;
  size?: "small" | "normal";
  slow?: boolean;
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const speak = useCallback(async () => {
    // If already speaking, stop
    if (audioRef.current && isSpeaking) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      return;
    }

    setIsLoading(true);

    try {
      const cacheKey = `${text}_${slow}`;
      let audioUrl = audioCache.get(cacheKey);

      if (!audioUrl) {
        // Fetch audio from backend TTS
        const params = new URLSearchParams({ text, slow: String(slow) });
        const response = await fetch(`${API_BASE}/api/tts?${params}`);

        if (!response.ok) throw new Error('TTS failed');

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        audioCache.set(cacheKey, audioUrl);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setIsLoading(false);
      };
      audio.onended = () => {
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoading(false);
      };

      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsLoading(false);
      setIsSpeaking(false);

      // Fallback: try browser speechSynthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = slow ? 0.6 : 0.85;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
      }
    }
  }, [text, isSpeaking, slow]);

  const sizeClasses = size === "small"
    ? "px-3 py-1.5 text-[10px] gap-1"
    : "px-4 py-2 text-xs gap-2";

  return (
    <button
      onClick={speak}
      disabled={isLoading}
      className={`
        flex items-center ${sizeClasses} rounded-full border transition-all duration-300 cursor-pointer disabled:opacity-50
        ${isSpeaking
          ? 'bg-brand-500/30 border-brand-400/50 text-brand-200 shadow-[0_0_15px_rgba(45,212,191,0.3)]'
          : 'bg-brand-500/10 border-brand-500/20 text-brand-300 hover:text-white hover:bg-brand-500/20'}
        ${className}
      `}
    >
      {isLoading ? (
        <RefreshCw className={`${size === "small" ? "w-3 h-3" : "w-4 h-4"} animate-spin`} />
      ) : isSpeaking ? (
        <Volume2 className={`${size === "small" ? "w-3 h-3" : "w-4 h-4"} animate-pulse`} />
      ) : (
        <Play className={`${size === "small" ? "w-3 h-3" : "w-4 h-4"}`} />
      )}
      <span className="font-semibold tracking-wider uppercase">
        {isLoading ? 'Loading...' : isSpeaking ? 'Playing...' : label}
      </span>
    </button>
  );
}

// ────────────────────────────────────────────────
//  Component: Word-by-word Highlight
// ────────────────────────────────────────────────
function WordHighlight({ analysis }: { analysis: WordAnalysis }) {
  // Display words grouped by status (correct, incorrect, missing, extra)
  return (
    <div className="space-y-4">
      {analysis.correct.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
              Correct Words ({analysis.correct.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.correct.map((w, i) => (
              <span key={`c-${i}`} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 text-sm font-medium">
                {w.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.incorrect.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
              Mispronounced ({analysis.incorrect.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.incorrect.map((w, i) => (
              <div key={`i-${i}`} className="group relative">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-200 text-sm font-medium cursor-help">
                  {w.word}
                  <span className="text-amber-400/50 ml-1 text-[10px]">→ "{w.spoken_as}"</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.missing.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs uppercase tracking-widest text-red-400 font-bold">
              Missing ({analysis.missing.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.missing.map((w, i) => (
              <span key={`m-${i}`} className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-200 text-sm font-medium line-through opacity-80">
                {w.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.extra.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-slate-400" />
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              Extra Words ({analysis.extra.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.extra.map((w, i) => (
              <span key={`e-${i}`} className="px-2.5 py-1 rounded-lg bg-slate-500/15 border border-slate-500/25 text-slate-300 text-sm font-medium italic">
                +{w.word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
//  Component: Phonetic Issue Card with TTS
// ────────────────────────────────────────────────
function PhoneticIssueCard({ issue, index }: { issue: PhoneticIssue; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + (index * 0.1) }}
      className="glass-panel p-5 relative overflow-hidden"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400 to-brand-600" />

      <div className="flex flex-col md:flex-row gap-4">
        {/* Word */}
        <div className="min-w-[120px] flex flex-col gap-2">
          <div className="text-xl font-bold text-white">"{issue.word}"</div>
          <div className="text-[10px] uppercase tracking-widest text-brand-400 font-bold">
            {issue.issue}
          </div>
          {/* Listen to correct pronunciation */}
          <SpeakButton text={issue.word} label="Listen" size="small" />
        </div>

        {/* Comparison */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {issue.spoken_as && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div className="text-[10px] uppercase text-red-400 font-bold mb-1">Your Sound</div>
              <div className="text-lg tracking-widest text-red-200">{issue.spoken_as}</div>
              <div className="text-[10px] text-red-300/70 mt-1">{issue.common_error}</div>
            </div>
          )}
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3">
            <div className="text-[10px] uppercase text-brand-400 font-bold mb-1">Correct Sound</div>
            <div className="text-lg tracking-widest text-brand-200">{issue.ipa_correct}</div>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-200/80">{issue.tip}</p>
        </div>
      </div>
    </motion.div>
  );
}


// ────────────────────────────────────────────────
//  Main App
// ────────────────────────────────────────────────
export default function App() {
  // ─── State ───────────────────────────────────
  const [levels, setLevels] = useState<CEFRLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [phrases, setPhrases] = useState<string[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  // isAnalyzing tracked via step === 'analyzing'
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Step tracking for the flow
  const [step, setStep] = useState<'ready' | 'recording' | 'analyzing' | 'results'>('ready');

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");

  // ─── Effects ─────────────────────────────────

  // Load levels on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/levels`)
      .then(r => r.json())
      .then(data => setLevels(data.levels))
      .catch(() => {
        // Fallback levels if backend is down
        setLevels([
          { code: 'A1', name: 'Beginner', description: 'Simple everyday phrases' },
          { code: 'A2', name: 'Elementary', description: 'Common daily expressions' },
          { code: 'B1', name: 'Intermediate', description: 'Clear speech on familiar topics' },
          { code: 'B2', name: 'Upper Intermediate', description: 'Complex topics' },
          { code: 'C1', name: 'Advanced', description: 'Sophisticated language' },
          { code: 'C2', name: 'Proficiency', description: 'Near-native mastery' },
        ]);
      });

    // Load history
    const saved = localStorage.getItem("pronunciation_history");
    if (saved) setHistory(JSON.parse(saved));

    // Init speech recognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Use final transcript if available, otherwise interim
        const combined = finalTranscript.trim() || interimTranscript.trim();
        if (combined) {
          transcriptRef.current = combined;
        }
      };

      // Auto-restart if recognition stops unexpectedly during recording
      recognition.onend = () => {
        // Only restart if we're still recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            recognition.start();
          } catch {
            // Already started or other error — ignore
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        // For "no-speech" errors, auto-restart if still recording
        if (event.error === 'no-speech' && mediaRecorderRef.current?.state === 'recording') {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      };

      recognitionRef.current = recognition;
    }

    // Preload voices
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
    }
  }, []);

  // Load phrases when level changes
  useEffect(() => {
    fetch(`${API_BASE}/api/phrases?level=${selectedLevel}`)
      .then(r => r.json())
      .then(data => {
        setPhrases(data.phrases);
        setCurrentPhraseIndex(0);
        setResult(null);
        setStep('ready');
      })
      .catch(() => {
        // Fallback
        setPhrases([
          "Hello, my name is Anna.",
          "The weather is nice today.",
          "Can you help me please?",
        ]);
      });
  }, [selectedLevel]);

  // Save history
  useEffect(() => {
    localStorage.setItem("pronunciation_history", JSON.stringify(history));
  }, [history]);

  // ─── Recording ───────────────────────────────

  const startRecording = async () => {
    setResult(null);
    transcriptRef.current = "";
    setStep('recording');

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);

      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.onstop = () => {
        const userText = transcriptRef.current.trim();
        submitAnalysis(userText);
      };

      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { }
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert("Microphone access denied or unavailable.");
      setStep('ready');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { }
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStep('analyzing');

      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
    }
  };

  // ─── Analysis ────────────────────────────────

  const submitAnalysis = async (userText: string) => {
    setStep('analyzing');

    const targetText = phrases[currentPhraseIndex] || "";

    // If no speech was detected, show useful feedback immediately
    if (!userText.trim()) {
      const targetWords = targetText.toLowerCase().replace(/[^\w\s']/g, '').split(/\s+/);
      setResult({
        scores: { overall: 0, accuracy: 0, fluency: 0, completeness: 0 },
        word_analysis: {
          correct: [],
          incorrect: [],
          missing: targetWords.map(w => ({ word: w, status: 'missing' })),
          extra: [],
        },
        phonetic_issues: [],
        target_text: targetText,
        user_text: '',
        summary: 'No speech was detected. Please make sure your microphone is working and speak clearly. Try holding the record button longer for longer phrases.',
      });
      setStep('results');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('target_text', targetText);
      formData.append('user_text', userText);

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
      setStep('results');

      // Save to history
      const historyItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        phrase: targetText,
        level: selectedLevel,
        score: data.scores.overall,
        accuracy: data.scores.accuracy,
        date: new Date().toLocaleTimeString(),
        issueCount: data.phonetic_issues.length,
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 50));
    } catch {
      // Offline fallback — basic comparison
      const targetNorm = targetText.toLowerCase().replace(/[^\w\s']/g, '');
      const userNorm = userText.toLowerCase().replace(/[^\w\s']/g, '');

      const targetWords = targetNorm.split(/\s+/);
      const userWords = userNorm.split(/\s+/);

      const correct = targetWords.filter(w => userWords.includes(w));
      const missing = targetWords.filter(w => !userWords.includes(w));
      const extra = userWords.filter(w => !targetWords.includes(w));

      const score = Math.round((correct.length / Math.max(targetWords.length, 1)) * 100);

      setResult({
        scores: { overall: score, accuracy: score, fluency: Math.max(0, score - 10), completeness: score },
        word_analysis: {
          correct: correct.map(w => ({ word: w, status: 'correct' })),
          incorrect: [],
          missing: missing.map(w => ({ word: w, status: 'missing' })),
          extra: extra.map(w => ({ word: w, status: 'extra' })),
        },
        phonetic_issues: [],
        target_text: targetText,
        user_text: userText,
        summary: userText ? `${correct.length}/${targetWords.length} words matched.` : 'No speech detected.',
      });
      setStep('results');
    }

  };

  // ─── Navigation ──────────────────────────────

  const nextPhrase = () => {
    setCurrentPhraseIndex(prev => (prev + 1) % phrases.length);
    setResult(null);
    setStep('ready');
  };

  const prevPhrase = () => {
    setCurrentPhraseIndex(prev => (prev - 1 + phrases.length) % phrases.length);
    setResult(null);
    setStep('ready');
  };

  const tryAgain = () => {
    setResult(null);
    setStep('ready');
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("pronunciation_history");
  };

  const currentPhrase = phrases[currentPhraseIndex] || "";

  // ────────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-brand-500/30">
      {/* Background Lighting */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-600/10 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-5xl flex flex-col md:flex-row gap-8 min-h-screen">

        {/* ──────── Main Content ──────── */}
        <div className="flex-1 flex flex-col items-center">

          {/* Header */}
          <header className="w-full mb-6 flex justify-between items-center glass-panel px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-blue-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Activity className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-200 to-white">
                  AI English Coach
                </h1>
                <p className="text-xs text-brand-300/70 uppercase tracking-widest font-semibold flex items-center gap-2">
                  Pronunciation Trainer <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[10px] font-bold uppercase tracking-widest">
                Level {selectedLevel}
              </span>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <History className="w-5 h-5 text-brand-300" />
              </button>
            </div>
          </header>

          {/* Level Selector */}
          <LevelSelector levels={levels} selected={selectedLevel} onSelect={setSelectedLevel} />

          {/* Target Phrase Card */}
          <section className="w-full text-center space-y-4 mb-8">
            <div className="flex items-center justify-between w-full max-w-2xl mx-auto px-2">
              <button
                onClick={prevPhrase}
                disabled={step === 'recording' || step === 'analyzing'}
                className="text-xs uppercase flex items-center gap-1 text-slate-400 hover:text-brand-300 transition-colors font-bold disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                Phrase {currentPhraseIndex + 1}/{phrases.length}
              </h2>
              <button
                onClick={nextPhrase}
                disabled={step === 'recording' || step === 'analyzing'}
                className="text-xs uppercase flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors font-bold disabled:opacity-30"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="glass-panel p-8 md:p-12 relative overflow-hidden group w-full max-w-2xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
              <p className="relative z-10 text-2xl md:text-3xl lg:text-4xl font-light leading-relaxed tracking-wide text-white drop-shadow-md">
                "{currentPhrase}"
              </p>

              {step === 'ready' && (
                <div className="relative z-10 mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <SpeakButton text={currentPhrase} label="Listen First" />
                </div>
              )}
            </div>
          </section>

          {/* Visualizer & Controls */}
          <section className="w-full flex flex-col items-center mb-12 relative max-w-2xl mx-auto">
            <AudioVisualizer isRecording={isRecording} mediaStream={stream} />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={step === 'analyzing'}
              className={`
                absolute bottom-[-32px] md:bottom-[-40px] z-20 flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full shadow-2xl transition-all duration-300 disabled:opacity-30
                ${isRecording
                  ? 'bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                  : 'bg-brand-500 text-slate-950 hover:bg-brand-400 hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] border border-brand-300'}
              `}
            >
              {isRecording ? (
                <Square className="w-8 h-8 md:w-10 md:h-10 fill-current" />
              ) : (
                <Mic className="w-8 h-8 md:w-10 md:h-10" />
              )}
              {isRecording && (
                <span className="absolute inset-0 rounded-full border border-red-500/50 animate-ping" />
              )}
            </motion.button>
          </section>

          {/* ──────── Dynamic Results Area ──────── */}
          <div className="w-full max-w-2xl mx-auto mt-8 md:mt-12">
            <AnimatePresence mode="wait">

              {/* Step: Analyzing */}
              {step === 'analyzing' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  key="analyzing"
                  className="w-full glass-panel p-8 text-center flex flex-col items-center justify-center space-y-4"
                >
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-brand-400 animate-spin absolute" />
                    <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-brand-500/30 animate-[spin_2s_linear_infinite_reverse]" />
                  </div>
                  <p className="text-lg font-medium text-brand-200">Analyzing Your Pronunciation...</p>
                  <p className="text-sm text-slate-500">Comparing word-by-word accuracy</p>
                </motion.div>
              )}

              {/* Step: Results */}
              {step === 'results' && result && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  key="results"
                  className="w-full space-y-6"
                >
                  {/* Summary */}
                  <div className="glass-panel p-4 text-center">
                    <p className="text-sm text-slate-400">{result.summary}</p>
                    {result.user_text && (
                      <p className="text-xs text-slate-500 mt-2">
                        You said: <span className="text-slate-300 italic">"{result.user_text}"</span>
                      </p>
                    )}
                  </div>

                  {/* Score Header */}
                  <div className={`glass-panel p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border bg-gradient-to-br ${getScoreBg(result.scores.overall)}`}>
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-bold text-white mb-1">{getScoreLabel(result.scores.overall)}</h3>
                      <p className="text-slate-400 text-sm">
                        {result.phonetic_issues.length === 0
                          ? 'No major pronunciation issues detected.'
                          : `Found ${result.phonetic_issues.length} pronunciation issue(s) to work on.`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="flex flex-col items-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                          className={`text-4xl font-bold ${getScoreColor(result.scores.overall)}`}>
                          {result.scores.overall}
                        </motion.div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Overall</div>
                      </div>
                      <div className="w-px h-12 bg-white/10" />
                      <div className="flex flex-col items-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                          className={`text-2xl font-bold ${getScoreColor(result.scores.accuracy)}`}>
                          {result.scores.accuracy}%
                        </motion.div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Accuracy</div>
                      </div>
                      <div className="w-px h-12 bg-white/10" />
                      <div className="flex flex-col items-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}
                          className={`text-2xl font-bold ${getScoreColor(result.scores.completeness)}`}>
                          {result.scores.completeness}%
                        </motion.div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Complete</div>
                      </div>
                    </div>
                  </div>

                  {/* Word-by-Word Breakdown */}
                  <div className="glass-panel p-5 md:p-6">
                    <h4 className="text-sm font-semibold text-brand-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Word-by-Word Breakdown
                    </h4>
                    <WordHighlight analysis={result.word_analysis} />
                  </div>

                  {/* Phonetic Issues with TTS */}
                  {result.phonetic_issues.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-brand-300 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Volume2 className="w-4 h-4" /> Pronunciation Guide — Listen & Practice
                      </h4>
                      <p className="text-xs text-slate-500 px-2">
                        Click "Listen" to hear the correct pronunciation. You can repeat as many times as you need.
                      </p>
                      {result.phonetic_issues.map((issue, i) => (
                        <PhoneticIssueCard key={i} issue={issue} index={i} />
                      ))}
                    </div>
                  )}

                  {/* Full Phrase TTS */}
                  <div className="glass-panel p-5 md:p-6 text-center space-y-4">
                    <h4 className="text-sm font-semibold text-brand-300 uppercase tracking-widest flex items-center justify-center gap-2">
                      <Volume2 className="w-4 h-4" /> Listen to the Full Phrase
                    </h4>
                    <p className="text-slate-400 text-sm">
                      Listen to the correct pronunciation of the full phrase, then try again.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <SpeakButton text={currentPhrase} label="Play Full Phrase" />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-4 pt-2 pb-8">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={tryAgain}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 hover:bg-brand-500/20 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="font-semibold text-sm">Try Again</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={nextPhrase}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-slate-950 hover:bg-brand-400 transition-all font-semibold text-sm"
                    >
                      Next Phrase <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ──────── Sidebar History ──────── */}
        <div className={`
          fixed md:relative top-0 right-0 h-full md:h-auto w-[300px] md:w-80 glass-panel border-l border-brand-500/20 p-6 z-50 transition-transform duration-300
          ${showHistory ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          bg-slate-950/90 md:bg-transparent backdrop-blur-2xl md:backdrop-blur-none
        `}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm uppercase tracking-widest text-brand-300 font-bold flex items-center gap-2">
              <History className="w-4 h-4" /> My Progress
            </h3>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button onClick={clearHistory} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Clear History">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setShowHistory(false)} className="md:hidden p-1.5 text-slate-400">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[80vh] custom-scrollbar pr-2">
            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No recordings yet. Speak to save your progress!
              </div>
            ) : (
              <AnimatePresence>
                {history.map((item, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    key={item.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-brand-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300 font-bold">{item.level}</span>
                        <span className="text-xs text-slate-400">{item.date}</span>
                      </div>
                      <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>
                        {item.score}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2 italic">"{item.phrase}"</p>
                    {item.issueCount > 0 && (
                      <div className="mt-2 text-[10px] text-amber-400/70">
                        {item.issueCount} issue{item.issueCount !== 1 ? 's' : ''} detected
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {history.length > 0 && (
            <div className="mt-6 pt-6 border-t border-brand-500/10">
              <div className="text-xs text-slate-400 mb-2">Average Score</div>
              <div className={`text-3xl font-bold ${getScoreColor(Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length))}`}>
                {Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length)}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
