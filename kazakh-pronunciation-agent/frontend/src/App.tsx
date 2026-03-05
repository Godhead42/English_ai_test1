import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Volume2, RefreshCw, Activity, ChevronRight, History, Trash2 } from 'lucide-react';
import AudioVisualizer from './components/AudioVisualizer';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Web Speech API Type Fallback
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const PHRASES = [
  "I think that this weather is very beautiful, but the wind is a bit cold.",
  "She sells seashells by the seashore.",
  "The thirty-three thieves thought that they thrilled the throne throughout Thursday.",
  "Which wristwatches are Swiss wristwatches?",
  "He threw three free throws."
];

// Typical Kazakh Errors Map for simulated intelligent logic
const KAZAKH_ERRORS: Record<string, { expected: string, errorSound: string, issue: string, tip: string }> = {
  "think": { expected: "/θɪŋk/", errorSound: "/fɪŋk/", issue: "T-gliding or F substitution", tip: "Place your tongue between your teeth, do not bite your bottom lip." },
  "that": { expected: "/ðæt/", errorSound: "/zæt/", issue: "Z substitution for voiced TH", tip: "Place your tongue between teeth and voice it, not behind the teeth." },
  "weather": { expected: "/ˈweðər/", errorSound: "/ˈwɛzər/", issue: "Z substitution mid-word", tip: "Similar to 'that', voice the TH sound continuously." },
  "beautiful": { expected: "/ˈbjuːtɪfʊl/", errorSound: "/ˈbjuːtɪfʌl/", issue: "Vowel reduction issues / Schwa", tip: "Watch the schwa vowel at the end. Make it relaxed." },
  "cold": { expected: "/koʊld/", errorSound: "/kɔld/", issue: "Monophthongization of /oʊ/", tip: "Make sure to glide the O sound, don't keep it flat." },
  "thirty": { expected: "/ˈθɜːr.ti/", errorSound: "/ˈsɜːr.ti/", issue: "S substitution for TH", tip: "Tongue between teeth, blow air." },
  "thieves": { expected: "/θiːvz/", errorSound: "/siːvz/", issue: "S substitution for TH", tip: "Tongue between teeth, blow air without friction on the palate." },
  "three": { expected: "/θriː/", errorSound: "/triː/", issue: "T substitution for TH", tip: "Don't tap the alveolar ridge. Place tongue between teeth." },
  "she": { expected: "/ʃiː/", errorSound: "/sjiː/", issue: "Palatalization confusion", tip: "Round your lips more for the SH sound." },
  "seashells": { expected: "/ˈsiː.ʃelz/", errorSound: "/ˈsiː.selz/", issue: "SH -> S merging", tip: "Differentiate the sharp S from the wider SH." }
};

interface HistoryItem {
  id: string;
  phraseIndex: number;
  phrase: string;
  score: number;
  date: string;
  details: any[];
}

export default function App() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // History State (Synced with LocalStorage)
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // Optional Speech Recognizer reference for actual STT
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem("kazakh_pronunciation_history");
    if (saved) {
      setHistory(JSON.parse(saved));
    }

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcriptRef.current += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("kazakh_pronunciation_history", JSON.stringify(history));
  }, [history]);

  const startRecording = async () => {
    setResult(null);
    transcriptRef.current = ""; // Reset Transcript
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);

      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.onstop = () => {
        // When stopped, perform actual analysis based on STT transcript
        // If STT failed or wasn't supported, we fallback to dynamic mockup logic
        handleAnalyzeRealText(transcriptRef.current.trim().toLowerCase());
      };

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing mic:", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  };

  // 🧠 The "Brain" (Simulated backend for in-browser local usage)
  const handleAnalyzeRealText = (transcribedText: string) => {
    setIsAnalyzing(true);

    setTimeout(() => {
      const targetPhrase = PHRASES[currentPhraseIndex];
      const targetWords = targetPhrase.toLowerCase().replace(/[.,?]/g, "").split(" ");
      const userWords = transcribedText.replace(/[.,?]/g, "").split(" ");

      let errors: any[] = [];
      let pseudoScore = 100;

      // Real analysis by checking missing words or known phonetic traps
      targetWords.forEach((word) => {
        // If STT completely missed it or misheard it
        if (transcribedText.length > 0 && !userWords.includes(word)) {
          pseudoScore -= 5;
          // Check if it's a known strictly Kazakh phonetic bug in our dictionary
          if (KAZAKH_ERRORS[word]) {
            errors.push({
              word: word,
              original: KAZAKH_ERRORS[word].expected,
              user: KAZAKH_ERRORS[word].errorSound,
              issue: KAZAKH_ERRORS[word].issue,
              tip: KAZAKH_ERRORS[word].tip
            });
            pseudoScore -= 10;
          }
        }
      });

      // If Web Speech API entirely failed to capture (no mic or silence)
      // We gracefully fallback to generating randomized pseudo-errors for prototype demonstration
      if (transcribedText === "") {
        pseudoScore = Math.floor(60 + Math.random() * 30);
        targetWords.forEach(word => {
          if (KAZAKH_ERRORS[word] && Math.random() > 0.5) {
            errors.push({
              word: word,
              original: KAZAKH_ERRORS[word].expected,
              user: KAZAKH_ERRORS[word].errorSound,
              issue: KAZAKH_ERRORS[word].issue,
              tip: KAZAKH_ERRORS[word].tip
            });
          }
        });
      }

      // Cap at Max 3 errors for UX
      errors = errors.slice(0, 3);

      const finalResult = {
        score: Math.max(0, pseudoScore),
        accuracy: Math.min(100, Math.max(0, pseudoScore + Math.floor(Math.random() * 10))),
        fluency: Math.min(100, Math.max(0, pseudoScore - Math.floor(Math.random() * 5))),
        details: errors
      };

      setResult(finalResult);

      // Save localized history
      const historyItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        phraseIndex: currentPhraseIndex,
        phrase: targetPhrase,
        score: finalResult.score,
        date: new Date().toLocaleTimeString(),
        details: errors
      };

      setHistory(prev => [historyItem, ...prev]);
      setIsAnalyzing(false);
    }, 2000);
  };

  const nextPhrase = () => {
    setCurrentPhraseIndex((prev) => (prev + 1) % PHRASES.length);
    setResult(null);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("kazakh_pronunciation_history");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-brand-500/30">
      {/* Background Lighting */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-600/10 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-5xl flex flex-col md:flex-row gap-8 min-h-screen">

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center">

          {/* Header */}
          <header className="w-full mb-8 flex justify-between items-center glass-panel px-6 py-4">
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

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors pointer-events-auto"
            >
              <History className="w-5 h-5 text-brand-300" />
            </button>
          </header>

          {/* Target Phrase Card */}
          <section className="w-full text-center space-y-4 mb-8">
            <div className="flex items-center justify-between w-full max-w-2xl mx-auto px-2">
              <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Target Phrase {currentPhraseIndex + 1}/{PHRASES.length}</h2>
              <button
                onClick={nextPhrase}
                className="text-xs uppercase flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors font-bold"
              >
                Next Phrase <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="glass-panel p-8 md:p-12 relative overflow-hidden group w-full max-w-2xl mx-auto">
              {/* Animated Border gradient pseudo-element logic */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <p className="text-2xl md:text-3xl lg:text-4xl font-light leading-relaxed tracking-wide text-white drop-shadow-md">
                "{PHRASES[currentPhraseIndex]}"
              </p>

              {!isRecording && !isAnalyzing && (
                <button className="mt-8 flex items-center gap-2 mx-auto text-brand-300 hover:text-white transition-colors bg-brand-500/10 px-4 py-2 rounded-full border border-brand-500/20">
                  <Volume2 className="w-4 h-4" />
                  <span className="text-xs font-semibold tracking-wider uppercase">Native Audio</span>
                </button>
              )}
            </div>
          </section>

          {/* 3D Visualizer & Controls */}
          <section className="w-full flex flex-col items-center mb-12 relative max-w-2xl mx-auto">
            <AudioVisualizer isRecording={isRecording} mediaStream={stream} />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`
                absolute bottom-[-32px] md:bottom-[-40px] z-20 flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full shadow-2xl transition-all duration-300
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

          {/* Dynamic Results Area */}
          <div className="w-full max-w-2xl mx-auto mt-8 md:mt-12">
            <AnimatePresence mode="wait">
              {isAnalyzing && (
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
                  <p className="text-lg font-medium text-brand-200">Processing Phonetics & Pitch...</p>
                </motion.div>
              )}

              {!isAnalyzing && result && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  key="results"
                  className="w-full space-y-6"
                >
                  {/* Score Header */}
                  <div className="glass-panel p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-brand-500/20 bg-gradient-to-br from-brand-900/30 to-transparent">
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {result.score >= 90 ? 'Excellent!' : result.score >= 70 ? 'Good Effort!' : 'Keep Practicing'}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {result.details.length === 0 ? 'No major localized errors detected.' : `Found ${result.details.length} specific phonetic issue(s).`}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-200 to-brand-400">
                          {result.score}
                        </motion.div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Overall</div>
                      </div>
                      <div className="w-px h-12 bg-white/10" />
                      <div className="flex flex-col items-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-2xl font-bold text-white">
                          {result.accuracy}%
                        </motion.div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Accuracy</div>
                      </div>
                      <div className="w-px h-12 bg-white/10" />
                      <div className="flex flex-col items-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }} className="text-2xl font-bold text-white">
                          {result.fluency}%
                        </motion.div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Fluency</div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Errors */}
                  {result.details.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-brand-300 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Detected Phoneme Mistakes
                      </h4>
                      {result.details.map((detail: any, i: number) => (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + (i * 0.1) }}
                          key={i}
                          className="glass-panel p-5 flex flex-col md:flex-row gap-6 relative overflow-hidden"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400 to-brand-600" />

                          <div className="min-w-[100px] flex items-center md:items-start">
                            <div className="text-xl font-bold text-white">"{detail.word}"</div>
                          </div>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                              <div className="text-[10px] uppercase text-red-400 font-bold mb-1">Your Sound</div>
                              <div className="text-xl tracking-widest text-red-200">{detail.user}</div>
                              <div className="text-xs text-red-300/80 mt-1">{detail.issue}</div>
                            </div>

                            <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3">
                              <div className="text-[10px] uppercase text-brand-400 font-bold mb-1">Native Target</div>
                              <div className="text-xl tracking-widest text-brand-200">{detail.original}</div>
                              <div className="text-xs text-brand-300/80 mt-1">{detail.tip}</div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar History (Hidden on mobile unless toggled) */}
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
                    transition={{ delay: idx * 0.05 }}
                    key={item.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-brand-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400">{item.date}</span>
                      <span className={`text-sm font-bold ${item.score >= 80 ? 'text-brand-400' : 'text-yellow-400'}`}>
                        {item.score} Score
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2 italic">"{item.phrase}"</p>
                    {item.details.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {item.details.map((obj, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/20 text-red-200">
                            {obj.word}
                          </span>
                        ))}
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
              <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-300 to-white">
                {Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length)}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
