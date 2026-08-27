import type { QuestionProgress, QuestionStatus } from '../types/progress';
import { logAnswer } from './answerLogStore';

const STORAGE_KEY = 'kpss-hafiza-question-progress';

type ProgressMap = Record<string, QuestionProgress>;

function createDefaultProgress(questionId: string): QuestionProgress {
  return {
    questionId,
    status: 'new',
    correctCount: 0,
    wrongCount: 0,
    lastAnsweredAt: null,
  };
}

function readAll(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: ProgressMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function nextStatus(current: QuestionStatus, wasCorrect: boolean): QuestionStatus {
  if (!wasCorrect) return 'review';

  switch (current) {
    case 'new':
      return 'learning';
    case 'learning':
    case 'review':
      return 'known';
    case 'known':
      return 'known';
  }
}

export function getQuestionProgress(questionId: string): QuestionProgress {
  return readAll()[questionId] ?? createDefaultProgress(questionId);
}

export function getAllQuestionProgress(): ProgressMap {
  return readAll();
}

export function saveQuestionProgress(progress: QuestionProgress): void {
  const all = readAll();
  all[progress.questionId] = progress;
  writeAll(all);
}

// Flashcards ease a question in gradually (new -> learning -> known).
export function recordAnswer(questionId: string, wasCorrect: boolean): QuestionProgress {
  const current = getQuestionProgress(questionId);
  const answeredAt = new Date().toISOString();

  const updated: QuestionProgress = {
    ...current,
    correctCount: current.correctCount + (wasCorrect ? 1 : 0),
    wrongCount: current.wrongCount + (wasCorrect ? 0 : 1),
    lastAnsweredAt: answeredAt,
    status: nextStatus(current.status, wasCorrect),
  };

  saveQuestionProgress(updated);
  logAnswer({ questionId, wasCorrect, at: answeredAt, source: 'flashcard' });
  return updated;
}

// Quiz answers are a stronger signal: correct means known immediately, wrong sends it to review.
export function recordQuizAnswer(questionId: string, wasCorrect: boolean): QuestionProgress {
  const current = getQuestionProgress(questionId);
  const answeredAt = new Date().toISOString();

  const updated: QuestionProgress = {
    ...current,
    correctCount: current.correctCount + (wasCorrect ? 1 : 0),
    wrongCount: current.wrongCount + (wasCorrect ? 0 : 1),
    lastAnsweredAt: answeredAt,
    status: wasCorrect ? 'known' : 'review',
  };

  saveQuestionProgress(updated);
  logAnswer({ questionId, wasCorrect, at: answeredAt, source: 'quiz' });
  return updated;
}

export function resetQuestionProgress(questionId: string): void {
  const all = readAll();
  delete all[questionId];
  writeAll(all);
}
