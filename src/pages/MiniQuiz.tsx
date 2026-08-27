import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, PartyPopper } from 'lucide-react';
import questionsData from '../data/questions.json';
import { QuizQuestionCard } from '../components/quiz/QuizQuestionCard';
import { selectQuizQuestions } from '../lib/quizSelection';
import {
  getAllQuestionProgress,
  recordQuizAnswer,
} from '../lib/questionProgressStore';
import { saveQuizResult } from '../lib/quizResultStore';
import type { Question } from '../types/question';

const allQuestions = questionsData as Question[];
const QUIZ_SIZE = 10;

interface MiniQuizProps {
  onExit: () => void;
}

export function MiniQuiz({ onExit }: MiniQuizProps) {
  const [quiz] = useState<Question[]>(() =>
    selectQuizQuestions(allQuestions, getAllQuestionProgress(), QUIZ_SIZE),
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [resultSaved, setResultSaved] = useState(false);
  // See FlashcardStudy for why this can't just reset on currentIndex change:
  // the exiting card stays mounted (and clickable) during its fade-out.
  const isAnsweringRef = useRef(false);

  const isFinished = currentIndex >= quiz.length;
  const current = quiz[currentIndex];

  useEffect(() => {
    if (!isFinished || resultSaved || quiz.length === 0) return;

    saveQuizResult({
      id: `quiz-${Date.now()}`,
      date: new Date().toISOString(),
      totalQuestions: quiz.length,
      correctCount,
      wrongCount,
      questionIds: quiz.map((question) => question.id),
    });
    setResultSaved(true);
  }, [isFinished, resultSaved, quiz, correctCount, wrongCount]);

  const handleAnswer = (wasCorrect: boolean) => {
    if (isAnsweringRef.current) return;
    isAnsweringRef.current = true;
    // The exit transition below runs for 250ms; this comfortably outlasts
    // it regardless of animation-callback timing, then re-arms the guard.
    window.setTimeout(() => {
      isAnsweringRef.current = false;
    }, 400);

    recordQuizAnswer(current.id, wasCorrect);
    setCorrectCount((c) => c + (wasCorrect ? 1 : 0));
    setWrongCount((c) => c + (wasCorrect ? 0 : 1));
    setRevealed(false);
    setCurrentIndex((i) => i + 1);
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-soft"
          >
            <ArrowLeft size={18} />
            Ana Sayfa
          </motion.button>

          {!isFinished && quiz.length > 0 && (
            <span className="rounded-full bg-white border border-navy/10 text-navy-soft text-xs font-semibold px-3 py-1">
              {currentIndex + 1} / {quiz.length}
            </span>
          )}
        </div>

        {quiz.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm shadow-navy/5 border border-navy/5 text-center text-navy-soft">
            Şu an quiz için yeterli soru yok.
          </div>
        ) : isFinished ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-3xl bg-white p-8 shadow-sm shadow-navy/5 border border-navy/5 flex flex-col items-center text-center gap-3"
          >
            <PartyPopper className="text-lila" size={32} strokeWidth={2} />
            <h2 className="text-xl font-bold text-navy">🎉 Quiz Bitti</h2>
            <p className="text-navy-soft">
              {correctCount} / {quiz.length} bildim
            </p>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onExit}
              className="mt-3 w-full sm:w-auto rounded-2xl bg-white border border-navy/10 text-navy font-semibold px-6 py-3"
            >
              🔴 Tekrar etmen gerekenler: {wrongCount}
            </motion.button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16, pointerEvents: 'none' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <QuizQuestionCard
                question={current}
                revealed={revealed}
                onReveal={() => setRevealed(true)}
                onKnown={() => handleAnswer(true)}
                onForgot={() => handleAnswer(false)}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
