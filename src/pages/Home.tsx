import { Brain, NotebookText, RotateCcw, Target } from 'lucide-react';
import { WelcomeBanner } from '../components/home/WelcomeBanner';
import { Header } from '../components/layout/Header';
import { StartCard } from '../components/home/StartCard';
import { FeatureCard } from '../components/home/FeatureCard';
import { ProgressSection } from '../components/home/ProgressSection';
import { StatsGrid } from '../components/home/StatsGrid';
import { useHomeStats } from '../hooks/useHomeStats';
import { DAILY_GOAL } from '../lib/homeStats';

interface HomeProps {
  onStartDaily: () => void;
  onStartReview: () => void;
  onStartQuiz: () => void;
  onOpenQuickReview: () => void;
}

export function Home({
  onStartDaily,
  onStartReview,
  onStartQuiz,
  onOpenQuickReview,
}: HomeProps) {
  const { todaySolved, reviewCount, totalSolved, bestStreak } =
    useHomeStats();
  const remainingToday = Math.max(DAILY_GOAL - todaySolved, 0);

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 flex flex-col gap-6">
        <WelcomeBanner />

        <Header />

        <StartCard cardCount={remainingToday} onStart={onStartDaily} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon={Brain}
            emoji="🧠"
            title="Hafıza Kartları"
            description="Konuları kartlarla tekrar et."
            onClick={onStartDaily}
          />
          <FeatureCard
            icon={Target}
            emoji="🎯"
            title="Mini Quiz"
            description="Bilgini kısa testlerle sına."
            onClick={onStartQuiz}
          />
          <FeatureCard
            icon={RotateCcw}
            emoji="🔴"
            title="Tekrar Et"
            description={
              reviewCount > 0
                ? `${reviewCount} kart seni bekliyor.`
                : 'Şu an tekrar kartı yok.'
            }
            onClick={onStartReview}
          />
        </div>

        <ProgressSection studied={todaySolved} total={DAILY_GOAL} />

        <StatsGrid
          reviewCount={reviewCount}
          totalSolved={totalSolved}
          bestStreak={bestStreak}
        />

        <button
          type="button"
          onClick={onOpenQuickReview}
          className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-navy-soft hover:text-lila-dark transition-colors"
        >
          <NotebookText size={16} />
          Hızlı Tekrar Notları
        </button>
      </div>
    </div>
  );
}
