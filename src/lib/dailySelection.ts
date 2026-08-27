import type { Question } from '../types/question';
import type { QuestionProgress } from '../types/progress';

type ProgressMap = Record<string, QuestionProgress>;

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function statusOf(progressMap: ProgressMap, question: Question) {
  return progressMap[question.id]?.status ?? 'new';
}

/** Review queue: worst-known (highest wrongCount) first; ties broken by the oldest lastAnsweredAt first. */
export function selectReviewQuestions(
  questions: Question[],
  progressMap: ProgressMap,
): Question[] {
  return questions
    .filter((q) => statusOf(progressMap, q) === 'review')
    .sort((a, b) => {
      const pa = progressMap[a.id];
      const pb = progressMap[b.id];
      if (pb.wrongCount !== pa.wrongCount) return pb.wrongCount - pa.wrongCount;
      return (pa.lastAnsweredAt ?? '').localeCompare(pb.lastAnsweredAt ?? '');
    });
}

/**
 * Today's study queue: review cards first (worst first), then not-yet-known
 * cards, then known cards only if there's still room. No repeats, capped at `count`.
 */
export function selectDailyQuestions(
  questions: Question[],
  progressMap: ProgressMap,
  count = 10,
): Question[] {
  const review = selectReviewQuestions(questions, progressMap);
  const fresh = shuffle(
    questions.filter((q) => {
      const status = statusOf(progressMap, q);
      return status === 'new' || status === 'learning';
    }),
  );
  const known = shuffle(questions.filter((q) => statusOf(progressMap, q) === 'known'));

  const selected: Question[] = [];
  const seenIds = new Set<string>();

  for (const bucket of [review, fresh, known]) {
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
