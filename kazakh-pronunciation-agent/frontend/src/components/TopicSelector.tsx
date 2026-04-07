import { motion } from 'framer-motion';
import type { Topic } from '../types';

interface Props {
  topics: Topic[];
  selected: string;
  onSelect: (id: string) => void;
}

export default function TopicSelector({ topics, selected, onSelect }: Props) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4 text-center flex items-center justify-center gap-2">
        📚 Choose a Topic
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
