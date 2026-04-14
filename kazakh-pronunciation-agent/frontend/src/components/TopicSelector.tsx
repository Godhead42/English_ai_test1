import { motion } from 'framer-motion';
import type { Topic } from '../types';
import { t, type Lang } from '../i18n';

interface Props {
  topics: Topic[];
  selected: string;
  onSelect: (id: string) => void;
  lang: Lang;
}

export default function TopicSelector({ topics, selected, onSelect, lang }: Props) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-6 sm:mb-8">
      <h3 className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400 font-bold mb-3 sm:mb-4 text-center flex items-center justify-center gap-2">
        {t('topic.select', lang)}
      </h3>
      {/* Horizontal scroll on mobile, grid on sm+ */}
      <div className="flex sm:hidden gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide snap-x snap-mandatory">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelect(topic.id)}
            className={`
              snap-start shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all duration-200 text-center min-w-[80px]
              ${selected === topic.id
                ? 'bg-brand-500/20 border-brand-500/60 text-brand-300 shadow-[0_0_20px_rgba(45,212,191,0.15)]'
                : 'bg-white/5 border-white/10 text-slate-300'}
            `}
          >
            <span className="text-xl">{topic.icon}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider leading-tight">{topic.name}</span>
          </button>
        ))}
      </div>
      <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 gap-3">
        {topics.map((topic) => (
          <motion.button
            key={topic.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(topic.id)}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 text-center
              ${selected === topic.id
                ? 'bg-brand-500/20 border-brand-500/60 text-brand-300 shadow-[0_0_20px_rgba(45,212,191,0.15)]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'}
            `}
          >
            <span className="text-2xl">{topic.icon}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider leading-tight">{topic.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
