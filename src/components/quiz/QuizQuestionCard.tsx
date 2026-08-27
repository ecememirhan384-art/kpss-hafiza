import { motion } from 'framer-motion';
import type { Question } from '../../types/question';

interface QuizQuestionCardProps {
  question: Question;
  revealed: boolean;
  onReveal: () => void;
  onKnown: () => void;
  onForgot: () => void;
}

export function QuizQuestionCard({
  question,
  revealed,
  onReveal,
  onKnown,
  onForgot,
}: QuizQuestionCardProps) {
  const examBadge = [question.examYear, question.examType]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm shadow-navy/5 border border-navy/5 flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {examBadge && (
          <span className="rounded-full bg-lila-light text-lila-dark text-xs font-semibold px-3 py-1">
            {examBadge}
          </span>
        )}
        <span className="rounded-full bg-pink-soft-light text-navy-soft text-xs font-semibold px-3 py-1">
          {question.bolumTitle}
        </span>
      </div>

      <p className="text-lg sm:text-xl font-bold text-navy leading-snug break-words">
        {question.question}
      </p>

      {!revealed && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -1 }}
          onClick={onReveal}
          className="self-start inline-flex items-center gap-2 rounded-2xl bg-lila-light text-lila-dark font-semibold px-5 py-2.5"
        >
          👀 Cevabı Göster
        </motion.button>
      )}

      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          <div>
            <p className="text-xs font-bold text-navy-soft uppercase tracking-wide">
              Cevap
            </p>
            <p className="mt-1 text-base font-bold text-lila-dark break-words">
              {question.answerText}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onKnown}
              className="flex-1 rounded-2xl bg-lila text-white font-semibold px-5 py-3"
            >
              😎 Bildim
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onForgot}
              className="flex-1 rounded-2xl bg-white border border-navy/10 text-navy font-semibold px-5 py-3"
            >
              🔴 Bilemedim
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
