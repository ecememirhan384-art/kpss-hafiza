import type { Question } from '../types/question';
import type { QuestionProgress } from '../types/progress';

type ProgressMap = Record<string, QuestionProgress>;

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

/**
 * Priority: review first, then new/learning (not yet mastered),
 * then known (only to fill out the quiz if nothing else is left).
 * Each question appears at most once.
 */
export function selectQuizQuestions(
  questions: Question[],
  progressMap: ProgressMap,
  count = 10,
): Question[] {
  const statusOf = (q: Question) => progressMap[q.id]?.status ?? 'new';

  const review = questions.filter((q) => statusOf(q) === 'review');
  const notYetKnown = questions.filter((q) => {
    const status = statusOf(q);
    return status === 'new' || status === 'learning';
  });
  const known = questions.filter((q) => statusOf(q) === 'known');

  const selected: Question[] = [];
  const seenIds = new Set<string>();

  for (const bucket of [shuffle(review), shuffle(notYetKnown), shuffle(known)]) {
    for (const question of bucket) {
      if (selected.length >= count) break;
      if (seenIds.has(question.id)) continue;
      seenIds.add(question.id);
      selected.push(question);
    }
    if (selected.length >= count) break;
  }

  return selected;
}
