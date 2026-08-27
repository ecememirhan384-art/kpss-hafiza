export type AnswerSource = 'flashcard' | 'quiz';

export interface AnswerEvent {
  questionId: string;
  wasCorrect: boolean;
  at: string;
  source: AnswerSource;
}
