import { SRSState, Flashcard } from '../types';

// Ratings for SM-2
export enum ReviewGrade {
  AGAIN = 0, // Complete blackout
  HARD = 3,  // Remembered with great difficulty
  GOOD = 4,  // Correct response after hesitation
  EASY = 5   // Perfect response
}

/**
 * SuperMemo-2 Algorithm Implementation
 * Calculates the next interval and ease factor based on user performance.
 */
export const calculateNextReview = (current: SRSState, grade: ReviewGrade): SRSState => {
  let { interval, repetition, easeFactor } = current;

  if (grade >= 3) {
    // Correct response logic
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  } else {
    // Incorrect response logic (Reset)
    repetition = 0;
    interval = 1;
  }

  // Update Ease Factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // q is the grade (0-5)
  // EF cannot go below 1.3
  const q = grade;
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate Next Date
  const now = new Date();
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + interval);

  return {
    interval,
    repetition,
    easeFactor,
    nextReviewDate: nextDate.getTime()
  };
};

export const getInitialSRSState = (): SRSState => ({
  interval: 0,
  repetition: 0,
  easeFactor: 2.5,
  nextReviewDate: Date.now() // Ready immediately
});

export const getCardsDue = (cards: Flashcard[]): Flashcard[] => {
  const now = Date.now();
  return cards.filter(card => card.srs.nextReviewDate <= now);
};