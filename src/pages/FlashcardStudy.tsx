import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, PartyPopper } from 'lucide-react';
import questionsData from '../data/questions.json';
import { FlashcardCard } from '../components/flashcards/FlashcardCard';
import {
  getAllQuestionProgress,
  recordAnswer,
} from '../lib/questionProgressStore';
import { selectDailyQuestions, selectReviewQuestions } from '../lib/dailySelection';
import type { Question } from '../types/question';

const allQuestions = questionsData as Question[];
const DAILY_SIZE = 10;

export type FlashcardStudyMode = 'daily' | 'review';

interface FlashcardStudyProps {
  mode: FlashcardStudyMode;
  onExit: () => void;
}

export function FlashcardStudy({ mode, onExit }: FlashcardStudyProps) {
  const [questions, setQuestions] = useState<Question[]>(() => {
    const progress = getAllQuestionProgress();
    return mode === 'review'
      ? selectReviewQuestions(allQuestions, progress)
      : selectDailyQuestions(allQuestions, progress, DAILY_SIZE);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  // Guards against double-recording an answer while the old card is still
  // fading out: AnimatePresence keeps it mounted (and clickable) during its
  // exit transition, so a fast double-tap can otherwise hit its stale
  // onKnown/onForgot a second time. Reset only once that card is fully gone.
  const isAnsweringRef = useRef(false);

  const isFinished = currentIndex >= questions.length;
  const currentQuestion = questions[currentIndex];

  const finishedTitle =
    mode === 'review' ? 'Tekrar tamamlandı!' : 'Bugünkü çalışma tamamlandı!';
  const emptyMessage =
    mode === 'review'
      ? 'Harika! Şu anda tekrar etmen gereken kart kalmadı.'
      : 'Şu an çalışılacak kart yok.';

  const handleAnswer = (wasCorrect: boolean) => {
    if (isAnsweringRef.current) return;
    isAnsweringRef.current = true;
    // The exit transition below runs for 250ms; this comfortably outlasts
    // it regardless of animation-callback timing, then re-arms the guard.
    window.setTimeout(() => {
      isAnsweringRef.current = false;
    }, 400);

    recordAnswer(currentQuestion.id, wasCorrect);
    setSessionCorrect((c) => c + (wasCorrect ? 1 : 0));
    setSessionWrong((c) => c + (wasCorrect ? 0 : 1));
    setCurrentIndex((i) => i + 1);
  };

  const handleRestart = () => {
    // Review mode: recompute from the current progress store — cards
    // that graduated out of "review" during the session shouldn't reappear.
    // Daily mode keeps replaying the same session list, unchanged.
    if (mode === 'review') {
      setQuestions(selectReviewQuestions(allQuestions, getAllQuestionProgress()));
    }
    setCurrentIndex(0);
    setSessionCorrect(0);
    setSessionWrong(0);
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

          {!isFinished && questions.length > 0 && (
            <span className="rounded-full bg-white border border-navy/10 text-navy-soft text-xs font-semibold px-3 py-1">
              {currentIndex + 1} / {questions.length}
            </span>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm shadow-navy/5 border border-navy/5 text-center text-navy-soft">
            {emptyMessage}
          </div>
        ) : isFinished ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-3xl bg-white p-8 shadow-sm shadow-navy/5 border border-navy/5 flex flex-col items-center text-center gap-3"
          >
            <PartyPopper className="text-lila" size={32} strokeWidth={2} />
            <h2 className="text-xl font-bold text-navy">{finishedTitle}</h2>
            <p className="text-sm text-navy-soft">
              😎 {sessionCorrect} doğru &nbsp;·&nbsp; 🔴 {sessionWrong} yanlış
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-3 w-full">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleRestart}
                className="flex-1 rounded-2xl bg-white border border-navy/10 text-navy font-semibold px-5 py-3"
              >
                Tekrar Başla
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onExit}
                className="flex-1 rounded-2xl bg-lila text-white font-semibold px-5 py-3"
              >
                Ana Sayfaya Dön
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16, pointerEvents: 'none' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <FlashcardCard
                question={currentQuestion}
                allQuestions={allQuestions}
                onAnswer={handleAnswer}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
