import type { Question } from '../types/question';

const OPTION_COUNT = 4;

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

// A one-word answer ("Belçika") next to a full sentence ("Musul Sorunu'nun
// çözümlenmesi (1926'da...)") reads as an obviously fake option. Only treat
// two answers as close enough to pair up if their lengths are in the same
// ballpark.
function lengthCloseEnough(correctLen: number, candidateLen: number): boolean {
  const tolerance = Math.max(15, correctLen * 0.6);
  return Math.abs(candidateLen - correctLen) <= tolerance;
}

/**
 * Builds a shuffled multiple-choice option set: the real answer plus 3
 * distractors sampled from other questions' answers. Candidates are tried
 * from most to least plausible — same memoryType (a place next to a place,
 * a date next to a date) and same bölüm (same topic) first, with answer
 * length also matched so a short answer never lands next to a paragraph —
 * loosening those constraints only if a stage doesn't have enough options.
 */
export function buildOptions(question: Question, allQuestions: Question[]): string[] {
  const correct = question.answerText;
  const correctLen = correct.length;
  const seen = new Set([normalize(correct)]);
  const pool = allQuestions.filter((q) => q.id !== question.id);

  const stages: Array<(q: Question) => boolean> = [
    (q) =>
      q.memoryType === question.memoryType &&
      q.bolum === question.bolum &&
      lengthCloseEnough(correctLen, q.answerText.length),
    (q) => q.memoryType === question.memoryType && q.bolum === question.bolum,
    (q) =>
      q.memoryType === question.memoryType &&
      lengthCloseEnough(correctLen, q.answerText.length),
    (q) => q.memoryType === question.memoryType,
    (q) =>
      q.bolum === question.bolum && lengthCloseEnough(correctLen, q.answerText.length),
    (q) => q.bolum === question.bolum,
    (q) => lengthCloseEnough(correctLen, q.answerText.length),
    () => true,
  ];

  const distractors: string[] = [];
  for (const matchesStage of stages) {
    if (distractors.length >= OPTION_COUNT - 1) break;
    for (const candidate of shuffle(pool.filter(matchesStage))) {
      if (distractors.length >= OPTION_COUNT - 1) break;
      const key = normalize(candidate.answerText);
      if (seen.has(key)) continue;
      seen.add(key);
      distractors.push(candidate.answerText);
    }
  }

  return shuffle([correct, ...distractors]);
}
