// ============================================================
// SM-2 Spaced Repetition Algorithm
// (SuperMemo 2 — classic, lightweight, well-suited for D1/SQLite)
// ============================================================
// quality: 0..5 (the user's self-assessment of how well they remembered)
//   0-2: complete blackout / wrong → reset
//   3: barely correct, big struggle
//   4: correct with some hesitation
//   5: perfect
// بر اساس https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method

export interface SM2Input {
  ease: number;       // current ease factor (>= 1.3)
  interval: number;   // current interval in days
  repetitions: number;// consecutive correct count
}

export interface SM2Result {
  ease: number;
  interval: number;   // days until next review
  repetitions: number;
  nextReviewAt: string;
}

export function sm2(input: SM2Input, quality: number): SM2Result {
  if (quality < 0 || quality > 5) quality = 3;
  let { ease, interval, repetitions } = input;

  if (quality < 3) {
    // پاسخ اشتباه → ریست
    repetitions = 0;
    interval = 1;
  } else {
    // پاسخ درست
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }
  }

  // به‌روزرسانی ease
  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const nextReviewAt = new Date(Date.now() + interval * 86400 * 1000).toISOString();
  return { ease, interval, repetitions, nextReviewAt };
}

// کیفیت ساده شده برای UI: again / hard / good / easy
// again → 1, hard → 3, good → 4, easy → 5
export const QUALITY_BY_BUTTON = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
} as const;

export type ReviewButton = keyof typeof QUALITY_BY_BUTTON;
