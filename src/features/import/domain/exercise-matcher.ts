export type ExerciseRef = {
  id: string;
  name: string;
};

export type MatchResult = {
  internalId: string;
  internalName: string;
  score: number;
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function normalizeExerciseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function similarityScore(a: string, b: string): number {
  const na = normalizeExerciseName(a);
  const nb = normalizeExerciseName(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

export function findBestMatch(
  hevyName: string,
  exercises: ExerciseRef[],
  threshold = 0.5,
): MatchResult | null {
  let bestScore = -1;
  let best: ExerciseRef | null = null;

  for (const ex of exercises) {
    const score = similarityScore(hevyName, ex.name);
    if (score > bestScore) {
      bestScore = score;
      best = ex;
    }
  }

  if (!best || bestScore < threshold) return null;

  return { internalId: best.id, internalName: best.name, score: bestScore };
}

export function buildExerciseMappings(
  hevyNames: string[],
  exercises: ExerciseRef[],
): Array<{ hevyName: string; match: MatchResult | null }> {
  return hevyNames.map((hevyName) => ({
    hevyName,
    match: findBestMatch(hevyName, exercises),
  }));
}
