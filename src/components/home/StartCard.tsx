import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

interface StartCardProps {
  cardCount: number;
  onStart: () => void;
}

export function StartCard({ cardCount, onStart }: StartCardProps) {
  const subtitle =
    cardCount > 0
      ? `${cardCount} kart seni bekliyor.`
      : 'Bugünün hedefini tamamladın! 🎉';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-3xl bg-lila text-white p-6 sm:p-8 shadow-lg shadow-lila/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
    >
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Bugünün Tekrarı</h2>
        <p className="mt-1 text-white/85 text-sm sm:text-base">{subtitle}</p>
      </div>

      <motion.button
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        onClick={onStart}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-lila-dark font-semibold px-6 py-3 shadow-md self-start sm:self-auto"
      >
        <Play size={18} strokeWidth={2.5} />
        Çalışmaya Başla
      </motion.button>
    </motion.div>
  );
}
