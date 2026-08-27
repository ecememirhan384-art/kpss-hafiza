export interface QuizResult {
  id: string;
  date: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  questionIds: string[];
}
