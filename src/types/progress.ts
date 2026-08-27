export type QuestionStatus = 'new' | 'learning' | 'known' | 'review';

export interface QuestionProgress {
  questionId: string;
  status: QuestionStatus;
  correctCount: number;
  wrongCount: number;
  lastAnsweredAt: string | null;
}
