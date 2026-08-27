import { getAllQuestionProgress } from './questionProgressStore';
import { getAnswerLog } from './answerLogStore';

export const DAILY_GOAL = 10;

function isToday(isoDate: string): boolean {
  return isoDate.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export function getTodaySolvedCount(): number {
  const todaysEvents = getAnswerLog().filter((event) => isToday(event.at));
  return new Set(todaysEvents.map((event) => event.questionId)).size;
}

export function getReviewCount(): number {
  return Object.values(getAllQuestionProgress()).filter(
    (progress) => progress.status === 'review',
  ).length;
}

export function getTotalSolvedCount(): number {
  return Object.values(getAllQuestionProgress()).filter(
    (progress) => progress.correctCount + progress.wrongCount > 0,
  ).length;
}

export function getBestStreak(): number {
  const chronological = [...getAnswerLog()].sort((a, b) =>
    a.at.localeCompare(b.at),
  );

  let best = 0;
  let current = 0;

  for (const event of chronological) {
    if (event.wasCorrect) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}
