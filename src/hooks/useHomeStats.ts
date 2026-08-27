import { useState } from 'react';
import {
  getBestStreak,
  getReviewCount,
  getTodaySolvedCount,
  getTotalSolvedCount,
} from '../lib/homeStats';

export interface HomeStats {
  todaySolved: number;
  reviewCount: number;
  totalSolved: number;
  bestStreak: number;
}

function loadStats(): HomeStats {
  return {
    todaySolved: getTodaySolvedCount(),
    reviewCount: getReviewCount(),
    totalSolved: getTotalSolvedCount(),
    bestStreak: getBestStreak(),
  };
}

export function useHomeStats(): HomeStats {
  const [stats] = useState<HomeStats>(loadStats);
  return stats;
}
