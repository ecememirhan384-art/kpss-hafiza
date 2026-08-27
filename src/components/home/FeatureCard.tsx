import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  emoji: string;
  title: string;
  description: string;
  onClick?: () => void;
}

export function FeatureCard({
  icon: Icon,
  emoji,
  title,
  description,
  onClick,
}: FeatureCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="text-left rounded-2xl bg-white p-5 shadow-sm shadow-navy/5 border border-navy/5 flex flex-col gap-3"
    >
      <div className="w-11 h-11 rounded-xl bg-pink-soft-light flex items-center justify-center text-xl">
        <span aria-hidden>{emoji}</span>
      </div>
      <div>
        <h3 className="font-bold text-navy flex items-center gap-1.5">
          {title}
          <Icon size={16} className="text-lila" strokeWidth={2.5} />
        </h3>
        <p className="mt-1 text-sm text-navy-soft">{description}</p>
      </div>
    </motion.button>
  );
}
