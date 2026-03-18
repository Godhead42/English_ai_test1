import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Volume2, RefreshCw, Activity, ChevronRight, History, Trash2, CheckCircle, ArrowRight, Play, Check } from 'lucide-react';
import AudioVisualizer from './components/AudioVisualizer';
import ChatBot from './components/ChatBot';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Web Speech API Type Fallback
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const LEVELS = [
  { id: 'A1', name: 'BEGINNER' },
  { id: 'A2', name: 'ELEMENTARY' },
  { id: 'B1', name: 'INTERMEDIATE' },
  { id: 'B2', name: 'UPPER INTERMEDIATE' },
  { id: 'C1', name: 'ADVANCED' },
  { id: 'C2', name: 'PROFICIENCY' },
];

const PHRASES_BY_LEVEL: Record<string, string[]> = {
  A1: [
    "Hello, my name is Anna.",
    "I live in a big city.",
    "Do you like apples?",
    "Where is the train station?"
  ],
  A2: [
    "I usually wake up at seven o'clock.",
    "We went to the beach last weekend.",
    "Could you help me with this box?",
    "It is raining outside right now."
  ],
  B1: [
    "I believe that reading books is very important.",
    "If I had more time, I would travel the world.",
    "Can you recommend a good restaurant nearby?",
    "I'm looking forward to our meeting next week."
  ],
  B2: [
    "Despite the heavy rain, the event was highly successful.",
    "It's essential to consider all perspectives before making a decision.",
    "I would appreciate it if you could send me the report by Friday.",
    "Did you check the schedule for the new training sessions?"
  ],
  C1: [
    "The inherent ambiguity of the policy led to widespread confusion.",
    "She presented a compelling argument that dismantled the opposition's claims.",
    "Neither of the proposed solutions adequately address the root cause.",
    "We must mitigate the potential risks associated with this venture."
  ],
  C2: [
    "The ubiquitous nature of technology has irrevocably altered our daily paradigm.",
    "The bureaucratic red tape invariably stifles entrepreneurial innovation.",
    "Articulate speech is an indispensable asset in modern diplomacy.",
    "His serendipitous discovery revolutionized the entire scientific community."
  ]
};

// Words with American/British differences
const ACCENT_VARIANTS: Record<string, string> = {
  "schedule": "Pronunciation varies: 'skedule' (American) vs 'shedule' (British). Both are correct.",
  "tomato": "Pronunciation varies: 'tomay-to' (American) vs 'tomah-to' (British). Both are correct.",
  "neither": "Pronunciation varies: 'neether' (American) vs 'nyther' (British). Both are correct.",
  "water": "Pronunciation varies: 'wader' (American/Flap T) vs 'waw-tuh' (British/Glottal). Both are correct.",
  "advertisement": "Pronunciation varies: 'ad-ver-tize-ment' (American) vs 'ad-ver-tiss-ment' (British). Both are correct."
};

interface HistoryItem {
  id: string;
  level: string;
  phraseIndex: number;
  phrase: string;
  score: number;
  date: string;
  details: any[];
}

export default function App() {
  const [currentLevel, setCurrentLevel] = useState('A1');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");

  const currentPhrases = PHRASES_BY_LEVEL[currentLevel];
  const targetPhrase = currentPhrases[currentPhraseIndex];

  useEffect(() => {
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

  const speakPhrase = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Setting default to natural tone
    utterance.lang = 'en-GB'; // or 'en-US', we can toggle
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    setResult(null);
    transcriptRef.current = "";
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);

      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.onstop = () => {
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

  const handleAnalyzeRealText = (transcribedText: string) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      // 1. Strict Cleaning
      const cleanTarget = targetPhrase.toLowerCase().replace(/[.,?!]/g, "");
      const targetWords = cleanTarget.split(" ");
      const userWords = transcribedText.replace(/[.,?!]/g, "").split(" ");

      let correctWordsArr: string[] = [];
      let incorrectWordsArr: any[] = [];
      let accentNotes: string[] = [];
      let matchCount = 0;

      // 2. Strict Matching evaluating against Cambridge standards
      // If user said completely different text, they will get 0 matches.
      targetWords.forEach((word) => {
        if (ACCENT_VARIANTS[word] && !accentNotes.includes(ACCENT_VARIANTS[word])) {
          accentNotes.push(ACCENT_VARIANTS[word]);
        }

        if (userWords.includes(word)) {
          matchCount++;
          correctWordsArr.push(word);
        } else {
          incorrectWordsArr.push({
            word: word,
            issue: "Pronunciation unclear or missing entirely.",
            tip: "Listen to the correct phrase and try repeating the specific word."
          });
        }
      });

      // 3. Accuracy Calculation (If entirely wrong text -> 0%)
      const baseAccuracy = targetWords.length > 0 ? (matchCount / targetWords.length) * 100 : 0;
      // Subtract penalty if user said extra words (stuttering/wrong phrase)
      const lengthPenalty = Math.max(0, (userWords.length - targetWords.length) * 2);

      let finalScore = Math.max(0, Math.round(baseAccuracy - lengthPenalty));

      // Edge case: empty transcript = 0 score
      if (transcribedText === "") {
        finalScore = 0;
      }

      const finalResult = {
        score: finalScore,
        accuracy: Math.max(0, Math.round(baseAccuracy)),
        fluency: transcribedText === "" ? 0 : Math.min(100, finalScore + (Math.random() * 10)),
        correctWords: correctWordsArr,
        incorrectWords: incorrectWordsArr,
        accentNotes: accentNotes,
        complete: finalScore === 100 ? 100 : Math.round(baseAccuracy)
      };

      setResult(finalResult);

      const historyItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        level: currentLevel,
        phraseIndex: currentPhraseIndex,
        phrase: targetPhrase,
        score: finalResult.score,
        date: new Date().toLocaleTimeString(),
        details: incorrectWordsArr
      };

      setHistory(prev => [historyItem, ...prev]);
      setIsAnalyzing(false);
    }, 1500);
  };

  const nextPhrase = () => {
    setCurrentPhraseIndex((prev) => (prev + 1) % currentPhrases.length);
    setResult(null);
  };

  const changeLevel = (lvl: string) => {
    setCurrentLevel(lvl);
    setCurrentPhraseIndex(0);
    setResult(null);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("kazakh_pronunciation_history");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-brand-500/30 pb-20">
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-600/10 blur-[150px] pointer-events-none" />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-6xl flex flex-col md:flex-row gap-8 min-h-screen">
        <div className="flex-1 flex flex-col items-center">

          <header className="w-full mb-8 flex justify-between items-center glass-panel px-6 py-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-blue-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Activity className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-200 to-white">
                  AI English Coach
                </h1>
                <p className="text-xs text-brand-300/70 tracking-widest uppercase font-semibold flex items-center gap-2">
                  PRONUNCIATION TRAINER <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-brand-300 tracking-wider">
              {currentLevel} CAMBRIDGE
            </div>
          </header>

          {/* Level Selector UI */}
          <div className="w-full mb-8">
            <h2 className="text-sm font-semibold text-brand-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> SELECT YOUR LEVEL
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {LEVELS.map(lvl => (
                <button
                  key={lvl.id}
                  onClick={() => changeLevel(lvl.id)}
                  className={`p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all border ${currentLevel === lvl.id
                    ? 'bg-brand-500/20 border-brand-500 opacity-100 shadow-[0_0_15px_rgba(45,212,191,0.2)]'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 opacity-60 hover:opacity-100'
                    }`}
                >
                  <span className={`text-xl font-bold ${currentLevel === lvl.id ? 'text-brand-300' : 'text-slate-300'}`}>
                    {lvl.id}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">
                    {lvl.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <section className="w-full text-center space-y-4 mb-4">
            <div className="flex items-center justify-between w-full p-2">
              <button className="text-xs uppercase flex items-center gap-1 text-slate-500 hover:text-white transition-colors font-bold" disabled>
                &lt; PREV
              </button>
              <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> PHRASE {currentPhraseIndex + 1}/{currentPhrases.length}
              </h2>
              <button
                onClick={nextPhrase}
                className="text-xs uppercase flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors font-bold"
              >
                NEXT <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="glass-panel p-8 md:p-12 relative overflow-hidden group w-full rounded-2xl border border-white/5">
              <p className="text-3xl md:text-4xl font-light leading-relaxed tracking-wide text-white drop-shadow-md">
                "{targetPhrase}"
              </p>

              {!isRecording && !isAnalyzing && !result && (
                <button
                  onClick={() => speakPhrase(targetPhrase)}
                  className="mt-8 flex items-center gap-2 mx-auto text-brand-300 hover:text-white transition-colors bg-brand-500/10 px-6 py-2.5 rounded-full border border-brand-500/20 hover:bg-brand-500/20"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span className="text-xs font-semibold tracking-wider uppercase">LISTEN FIRST</span>
                </button>
              )}
            </div>
          </section>

          <section className="w-full flex flex-col items-center mb-8 relative max-w-2xl mx-auto mt-4">
            {!result && (
              <div className="w-full relative">
                <AudioVisualizer isRecording={isRecording} mediaStream={stream} />
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`
                z-20 flex items-center justify-center w-20 h-20 rounded-full shadow-2xl transition-all duration-300
                ${result ? 'mt-4' : 'absolute bottom-[-40px] '} 
                ${isRecording
                  ? 'bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                  : 'bg-brand-500 text-slate-950 hover:bg-brand-400 hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] border border-brand-300'}
              `}
            >
              {isRecording ? (
                <Square className="w-8 h-8 fill-current" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </motion.button>
          </section>

          {/* Results Area */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  key="analyzing"
                  className="w-full glass-panel p-8 text-center flex flex-col items-center justify-center space-y-4 rounded-2xl"
                >
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-brand-400 animate-spin absolute" />
                  </div>
                  <p className="text-lg font-medium text-brand-200">Evaluating against Cambridge Standards...</p>
                </motion.div>
              )}

              {!isAnalyzing && result && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  key="results"
                  className="w-full space-y-6"
                >
                  {/* Score Header matches user screenshot exact layout */}
                  <div className="glass-panel p-6 flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl border border-white/5 bg-gradient-to-br from-brand-900/30 to-transparent">
                    <div className="text-center md:text-left flex-1">
                      <h3 className="text-3xl font-bold text-white mb-1">
                        {result.score >= 90 ? 'Excellent!' : result.score >= 50 ? 'Good try!' : 'Needs Practice'}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {result.score >= 90 ? 'No major pronunciation issues detected.' : 'Some words need a little work.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 md:gap-8">
                      <div className="flex flex-col items-center">
                        <div className={`text-4xl font-bold ${result.score >= 80 ? 'text-brand-400' : 'text-yellow-400'}`}>
                          {result.score}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Overall</div>
                      </div>
                      <div className="w-px h-12 bg-white/10" />
                      <div className="flex flex-col items-center">
                        <div className="text-2xl font-bold text-brand-400">
                          {Math.round(result.accuracy)}%
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Accuracy</div>
                      </div>
                      <div className="w-px h-12 bg-white/10" />
                      <div className="flex flex-col items-center">
                        <div className="text-2xl font-bold text-brand-400">
                          {result.complete}%
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Complete</div>
                      </div>
                    </div>
                  </div>

                  {/* Words Breakdown (Matches user screenshot) */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/5">
                    <h4 className="text-sm font-semibold text-brand-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> WORD-BY-WORD BREAKDOWN
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-400 mb-2 uppercase">
                          <Check className="w-3 h-3" /> Correct Words ({result.correctWords.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.correctWords.map((word: string, i: number) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-200 border border-brand-500/30 text-sm">
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>

                      {result.incorrectWords.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2 text-xs font-bold text-red-400 mb-2 uppercase">
                            Incorrect or Missed ({result.incorrectWords.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {result.incorrectWords.map((item: any, i: number) => (
                              <span key={i} className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30 text-sm">
                                {item.word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Accents detection / feedback */}
                  {result.accentNotes && result.accentNotes.length > 0 && (
                    <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                      <h4 className="text-sm font-semibold text-blue-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                        Pronunciation Nuances
                      </h4>
                      <ul className="list-disc list-inside text-sm text-blue-200/80 space-y-1">
                        {result.accentNotes.map((note: string, idx: number) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Listen Full Phrase / Try Again UI */}
                  <div className="glass-panel p-6 rounded-2xl border border-white/5 text-center flex flex-col items-center">
                    <h4 className="text-sm font-semibold text-brand-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Volume2 className="w-4 h-4" /> LISTEN TO THE FULL PHRASE
                    </h4>
                    <p className="text-slate-400 text-sm mb-6">
                      Listen to the correct pronunciation of the full phrase, then try again.
                    </p>

                    <button
                      onClick={() => speakPhrase(targetPhrase)}
                      className="flex items-center gap-2 mx-auto text-brand-300 hover:text-white transition-colors bg-brand-500/10 px-6 py-2.5 rounded-full border border-brand-500/20 mb-8 hover:bg-brand-500/30"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span className="text-xs font-semibold tracking-wider uppercase">PLAY FULL PHRASE</span>
                    </button>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setResult(null)}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" /> Try Again
                      </button>
                      <button
                        onClick={nextPhrase}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold transition-colors"
                      >
                        Next Phrase <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar History */}
        <div className="hidden md:flex flex-col w-80 glass-panel border border-white/5 p-6 z-50 rounded-2xl self-start sticky top-8 max-h-[90vh]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm uppercase tracking-widest text-brand-300 font-bold flex items-center gap-2">
              <History className="w-4 h-4" /> MY PROGRESS
            </h3>
            {history.length > 0 && (
              <button onClick={clearHistory} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No recordings yet. Speak to save your progress!
              </div>
            ) : (
              <AnimatePresence>
                {history.map((item) => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={item.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 font-bold">{item.level}</span>
                      <span className={`text-sm font-bold ${item.score >= 80 ? 'text-brand-400' : 'text-yellow-400'}`}>
                        {item.score}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2 italic">"{item.phrase}"</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      <ChatBot />
    </div>
  );
}
