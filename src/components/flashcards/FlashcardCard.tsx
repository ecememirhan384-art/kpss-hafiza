import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, X } from 'lucide-react';
import type { Question } from '../../types/question';
import { MemoryNoteBox } from './MemoryNoteBox';
import { buildOptions } from '../../lib/quizOptions';

interface FlashcardCardProps {
  question: Question;
  allQuestions: Question[];
  onAnswer: (wasCorrect: boolean) => void;
}

export function FlashcardCard({ question, allQuestions, onAnswer }: FlashcardCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const options = useMemo(
    () => buildOptions(question, allQuestions),
    [question, allQuestions],
  );

  const answered = selected !== null;
  const isCorrect = selected === question.answerText;

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

      <div className="flex flex-col gap-2.5">
        {options.map((option, index) => {
          const isThisAnswer = option === question.answerText;
          const isThisSelected = option === selected;
          const letter = String.fromCharCode(65 + index);

          let stateClasses =
            'border-navy/10 bg-white text-navy hover:border-lila/40';
          if (answered && isThisAnswer) {
            stateClasses = 'border-success bg-success-light text-success';
          } else if (answered && isThisSelected) {
            stateClasses = 'border-error bg-error-light text-error';
          } else if (answered) {
            stateClasses = 'border-navy/5 bg-white text-navy-soft opacity-60';
          }

          return (
            <motion.button
              key={option}
              type="button"
              whileTap={!answered ? { scale: 0.98 } : undefined}
              disabled={answered}
              onClick={() => setSelected(option)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm sm:text-base font-semibold transition-colors ${stateClasses}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/5 text-xs font-bold">
                {letter}
              </span>
              <span className="flex-1 break-words">{option}</span>
              {answered && isThisAnswer && (
                <Check size={18} className="shrink-0 text-success" />
              )}
              {answered && isThisSelected && !isThisAnswer && (
                <X size={18} className="shrink-0 text-error" />
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden flex flex-col gap-4"
          >
            <p
              className={`text-sm font-bold ${isCorrect ? 'text-success' : 'text-error'}`}
            >
              {isCorrect ? '😎 Doğru bildin!' : '🔴 Doğru cevap işaretlendi.'}
            </p>

            <MemoryNoteBox note={question.memoryNote} />

            <div>
              <button
                type="button"
                onClick={() => setShowExplanation((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-navy-soft"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showExplanation ? 'rotate-180' : ''}`}
                />
                Detaylı Açıklama
              </button>

              <AnimatePresence>
                {showExplanation && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden mt-2 text-sm text-navy-soft leading-relaxed break-words"
                  >
                    {question.explanation}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onAnswer(isCorrect)}
              className="rounded-2xl bg-lila text-white font-semibold px-5 py-3"
            >
              Devam Et →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
