export interface Question {
  id: string;
  cilt: number;
  bolum: number;
  bolumTitle: string;
  test: number;
  questionNumber: number;
  examYear: number | null;
  examType: string | null;
  question: string;
  answerText: string;
  explanation: string;
  memoryNote: string;
  memoryType: string;
}
