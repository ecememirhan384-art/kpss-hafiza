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
  const [revealed, setRevealed] = useState(false);

  const options = useMemo(
    () => buildOptions(question, allQuestions),
    [question, allQuestions],
  );

  // Some questions don't have 3 plausible same-type distractors (too rare
  // an answer type, or a mistagged row) — force-fitting a multiple-choice
  // UI onto those would show obviously-wrong or off-topic options, so they
  // fall back to the old reveal/self-report flow instead.
  const isMultipleChoice = options !== null;
  const answered = isMultipleChoice ? selected !== null : revealed;
  const isCorrect = isMultipleChoice ? selected === question.answerText : null;

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

      {isMultipleChoice ? (
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
      ) : (
        !revealed && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -1 }}
            onClick={() => setRevealed(true)}
            className="self-start inline-flex items-center gap-2 rounded-2xl bg-lila-light text-lila-dark font-semibold px-5 py-2.5"
          >
            👀 Cevabı Göster
          </motion.button>
        )
      )}

      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden flex flex-col gap-4"
          >
            {isMultipleChoice ? (
              <p
                className={`text-sm font-bold ${isCorrect ? 'text-success' : 'text-error'}`}
              >
                {isCorrect ? '😎 Doğru bildin!' : '🔴 Doğru cevap işaretlendi.'}
              </p>
            ) : (
              <div>
                <p className="text-xs font-bold text-navy-soft uppercase tracking-wide">
                  Cevap
                </p>
                <p className="mt-1 text-base font-bold text-lila-dark break-words">
                  {question.answerText}
                </p>
              </div>
            )}

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

            {isMultipleChoice ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onAnswer(isCorrect ?? false)}
                className="rounded-2xl bg-lila text-white font-semibold px-5 py-3"
              >
                Devam Et →
              </motion.button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onAnswer(true)}
                  className="flex-1 rounded-2xl bg-lila text-white font-semibold px-5 py-3"
                >
                  😎 Biliyordum
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onAnswer(false)}
                  className="flex-1 rounded-2xl bg-white border border-navy/10 text-navy font-semibold px-5 py-3"
                >
                  🔴 Unuttum
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
