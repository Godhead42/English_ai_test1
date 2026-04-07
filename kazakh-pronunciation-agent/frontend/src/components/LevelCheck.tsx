import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ArrowRight, BrainCircuit, Sparkles, CheckCircle2 } from 'lucide-react';
import { t, Lang } from '../i18n';

interface Question {
  text: { ru: string; en: string };
  options: { text: { ru: string; en: string }; points: number }[];
}

const QUESTIONS: Question[] = [
  {
    text: { ru: "Можете ли вы представиться на английском?", en: "Can you introduce yourself in English?" },
    options: [
      { text: { ru: "Только имя и откуда я.", en: "Only my name and where I am from." }, points: 1 },
      { text: { ru: "Могу рассказать о семье, хобби и распорядке дня.", en: "I can talk about my family, hobbies, and simple daily routines." }, points: 2 },
      { text: { ru: "Могу чётко выражать мнение и обсуждать сложные темы.", en: "I can express my opinions clearly and discuss complex topics." }, points: 3 },
    ]
  },
  {
    text: { ru: "If I _____ rich, I _____ travel the world.", en: "If I _____ rich, I _____ travel the world." },
    options: [
      { text: { ru: "am / will", en: "am / will" }, points: 1 },
      { text: { ru: "was / would", en: "was / would" }, points: 2 },
      { text: { ru: "were / would", en: "were / would" }, points: 3 },
    ]
  },
  {
    text: { ru: "Как часто вы смотрите фильмы или читаете новости на английском?", en: "How often do you watch movies or read news in English?" },
    options: [
      { text: { ru: "Редко, слишком сложно понять.", en: "Rarely, it's too difficult to understand." }, points: 1 },
      { text: { ru: "Иногда, использую субтитры или словарь.", en: "Sometimes, I use subtitles or a dictionary." }, points: 2 },
      { text: { ru: "Часто, понимаю без проблем.", en: "Often, I consume English media without any problems." }, points: 3 },
    ]
  },
  {
    text: { ru: "Выберите правильное предложение:", en: "Choose the correct sentence:" },
    options: [
      { text: { ru: "I have lived here since 5 years.", en: "I have lived here since 5 years." }, points: 1 },
      { text: { ru: "I am living here for 5 years.", en: "I am living here for 5 years." }, points: 2 },
      { text: { ru: "I have been living here for 5 years.", en: "I have been living here for 5 years." }, points: 3 },
    ]
  }
];

interface LevelCheckProps {
  onComplete: (level: string) => void;
  lang: Lang;
}

export default function LevelCheck({ onComplete, lang }: LevelCheckProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [calculatedLevel, setCalculatedLevel] = useState('A1');

  const handleAnswer = (points: number) => {
    const newScore = score + points;
    if (currentQuestion < QUESTIONS.length - 1) {
      setScore(newScore);
      setCurrentQuestion(prev => prev + 1);
    } else {
      let level = 'A1';
      if (newScore >= 11) level = 'C1';
      else if (newScore >= 9) level = 'B2';
      else if (newScore >= 7) level = 'B1';
      else if (newScore >= 5) level = 'A2';
      setCalculatedLevel(level);
      setIsFinished(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-100 font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-600/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel max-w-2xl w-full p-8 md:p-12 relative z-10 border border-white/10 shadow-2xl rounded-3xl"
      >
        <AnimatePresence mode="wait">
          {!isFinished ? (
            <motion.div
              key="questions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center mb-6">
                <BrainCircuit className="w-8 h-8 text-brand-400" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center text-white">
                {t('levelcheck.title', lang)}
              </h1>
              <p className="text-slate-400 mb-8 text-center text-sm tracking-wide">
                {lang === 'ru' ? `Вопрос ${currentQuestion + 1} из ${QUESTIONS.length}` : `Question ${currentQuestion + 1} of ${QUESTIONS.length}`}
              </p>

              <div className="w-full bg-white/5 h-2 rounded-full mb-10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-blue-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentQuestion) / QUESTIONS.length) * 100}%` }}
                />
              </div>

              <h2 className="text-xl md:text-2xl font-medium mb-8 text-center leading-relaxed">
                {QUESTIONS[currentQuestion].text[lang]}
              </h2>

              <div className="w-full flex flex-col gap-4">
                {QUESTIONS[currentQuestion].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(option.points)}
                    className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-500/50 transition-all group flex items-center justify-between"
                  >
                    <span className="text-slate-200 group-hover:text-white transition-colors">{option.text[lang]}</span>
                    <ArrowRight className="w-5 h-5 text-transparent group-hover:text-brand-400 transform translate-x-[-10px] group-hover:translate-x-0 transition-all opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>

              {/* Skip button */}
              <button
                onClick={() => onComplete('A1')}
                className="mt-8 text-xs text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
              >
                {t('levelcheck.skip', lang)}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-brand-500/20 blur-2xl rounded-full" />
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-400 to-blue-600 flex items-center justify-center relative shadow-lg shadow-brand-500/30">
                  <GraduationCap className="w-12 h-12 text-white" />
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-1"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </motion.div>
              </div>

              <h1 className="text-3xl font-bold mb-4 text-white">
                {t('levelcheck.result', lang)}
              </h1>

              <div className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-300 to-blue-400 mb-6 drop-shadow-lg">
                {calculatedLevel}
              </div>

              <p className="text-slate-400 mb-10 max-w-md mx-auto">
                {lang === 'ru'
                  ? `Мы настроили упражнения под уровень ${calculatedLevel}. Вы можете изменить это позже.`
                  : `We've customized your pronunciation exercises for the ${calculatedLevel} level. You can always change this later.`}
              </p>

              <button
                onClick={() => onComplete(calculatedLevel)}
                className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-brand-500 to-blue-600 hover:from-brand-400 hover:to-blue-500 text-white font-bold text-lg tracking-wide shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center gap-2">
                  {lang === 'ru' ? 'Начать тренировку' : 'Start Training'} <Sparkles className="w-5 h-5" />
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
