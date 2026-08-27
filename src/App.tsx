import { useState } from 'react';
import { Home } from './pages/Home';
import { FlashcardStudy } from './pages/FlashcardStudy';
import { MiniQuiz } from './pages/MiniQuiz';
import { QuickReview } from './pages/QuickReview';

type View = 'home' | 'daily' | 'review' | 'quiz' | 'quickReview';

function App() {
  const [view, setView] = useState<View>('home');

  if (view === 'daily') {
    return <FlashcardStudy mode="daily" onExit={() => setView('home')} />;
  }

  if (view === 'review') {
    return <FlashcardStudy mode="review" onExit={() => setView('home')} />;
  }

  if (view === 'quiz') {
    return <MiniQuiz onExit={() => setView('home')} />;
  }

  if (view === 'quickReview') {
    return <QuickReview onExit={() => setView('home')} />;
  }

  return (
    <Home
      onStartDaily={() => setView('daily')}
      onStartReview={() => setView('review')}
      onStartQuiz={() => setView('quiz')}
      onOpenQuickReview={() => setView('quickReview')}
    />
  );
}

export default App;
