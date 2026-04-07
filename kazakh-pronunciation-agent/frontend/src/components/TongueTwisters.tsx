import { useState, useEffect } from 'react';
import { Volume2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import API_BASE_URL from '../apiConfig';
import { t, type Lang } from '../i18n';

interface Props {
  level: string;
  lang: Lang;
}

export default function TongueTwisters({ level, lang }: Props) {
  const [twisters, setTwisters] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/tongue-twisters?level=${level}`)
      .then(r => r.json())
      .then(d => {
        setTwisters(d.tongue_twisters || []);
        setCurrentIdx(0);
      })
      .catch(() => setTwisters([]));
  }, [level]);

  const speak = () => {
    if (!twisters[currentIdx]) return;
    setPlaying(true);
    const audio = new Audio(`${API_BASE_URL}/api/tts?text=${encodeURIComponent(twisters[currentIdx])}&slow=true`);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play();
  };

  if (twisters.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="glass-panel p-6 space-y-4">
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
        <div className="flex items-center gap-3">
          <button
            onClick={speak}
            disabled={playing}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-widest hover:bg-amber-500/30 transition-all disabled:opacity-40"
          >
            <Volume2 className="w-4 h-4" />
            {playing ? t('twister.playing', lang) : t('twister.listen', lang)}
          </button>
          <button
            onClick={() => setCurrentIdx(i => (i + 1) % twisters.length)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('twister.next', lang)}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
          {currentIdx + 1} / {twisters.length} — {t('twister.hint', lang)}
        </p>
      </div>
    </div>
  );
}
