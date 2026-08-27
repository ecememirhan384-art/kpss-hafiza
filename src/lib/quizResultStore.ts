import type { QuizResult } from '../types/quizResult';

const STORAGE_KEY = 'kpss-hafiza-quiz-results';

function readAll(): QuizResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QuizResult[]) : [];
  } catch {
    return [];
  }
}

function writeAll(results: QuizResult[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

export function saveQuizResult(result: QuizResult): void {
  const all = readAll();
  all.push(result);
  writeAll(all);
}

export function getAllQuizResults(): QuizResult[] {
  return readAll();
}
