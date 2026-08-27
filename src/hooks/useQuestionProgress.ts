import { useCallback, useState } from 'react';
import type { QuestionProgress } from '../types/progress';
import {
  getQuestionProgress,
  recordAnswer,
} from '../lib/questionProgressStore';

export function useQuestionProgress(questionId: string) {
  const [progress, setProgress] = useState<QuestionProgress>(() =>
    getQuestionProgress(questionId),
  );

  const answer = useCallback(
    (wasCorrect: boolean) => {
      setProgress(recordAnswer(questionId, wasCorrect));
    },
    [questionId],
  );

  return { progress, answer };
}
