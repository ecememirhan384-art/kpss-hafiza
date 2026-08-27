import type { AnswerEvent } from '../types/answerEvent';

const STORAGE_KEY = 'kpss-hafiza-answer-log';

function readAll(): AnswerEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnswerEvent[]) : [];
  } catch {
    return [];
  }
}

function writeAll(events: AnswerEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function logAnswer(event: AnswerEvent): void {
  const all = readAll();
  all.push(event);
  writeAll(all);
}

export function getAnswerLog(): AnswerEvent[] {
  return readAll();
}
