import type { Question } from '../types/question';

const OPTION_COUNT = 4;

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Builds a shuffled multiple-choice option set: the real answer plus
 * distractors sampled from other questions' answers. Same-bölüm answers
 * are preferred first since same-topic wrong options make a more
 * meaningful test than answers pulled from an unrelated era.
 */
export function buildOptions(question: Question, allQuestions: Question[]): string[] {
  const correctKey = normalize(question.answerText);
  const seen = new Set([correctKey]);

  const pool = allQuestions.filter((q) => q.id !== question.id);
  const sameSection = shuffle(pool.filter((q) => q.bolum === question.bolum));
  const rest = shuffle(pool.filter((q) => q.bolum !== question.bolum));

  const distractors: string[] = [];
  for (const candidate of [...sameSection, ...rest]) {
    if (distractors.length >= OPTION_COUNT - 1) break;
    const key = normalize(candidate.answerText);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(candidate.answerText);
  }

  return shuffle([question.answerText, ...distractors]);
}
