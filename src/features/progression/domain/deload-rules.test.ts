import {
  shouldTriggerDeload,
  applyDeloadModifiers,
  type DeloadDecision,
  type FatigueHistoryEntry,
  type RecentSessionSnapshot,
  type ShouldTriggerDeloadInputs,
} from './deload-rules';
import type { ExercisePlan } from './session-plan';
import type { Block } from '@/types/block';

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function makeBlock(
  overrides: Partial<Pick<Block, 'deloadStrategy' | 'weekNumber' | 'durationWeeks'>> = {},
): Pick<Block, 'deloadStrategy' | 'weekNumber' | 'durationWeeks'> {
  return {
    deloadStrategy: 'fatigue_triggered',
    weekNumber: 1,
    durationWeeks: 6,
    ...overrides,
  };
}

function makeFatigueHistory(scores: number[], startDate = '2026-04-20'): FatigueHistoryEntry[] {
  const start = new Date(startDate);
  return scores.map((score, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { date: date.toISOString().slice(0, 10), fatigueScore: score };
  });
}

function makeRecentSessions(
  scores: (number | null)[],
  startDate = '2026-04-20',
): RecentSessionSnapshot[] {
  const start = new Date(startDate);
  return scores.map((score, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { date: date.toISOString().slice(0, 10), performanceScore: score };
  });
}

function makeExercisePlan(overrides: Partial<ExercisePlan> = {}): ExercisePlan {
  return {
    plannedExerciseId: 'pe-1',
    next_load: 100,
    next_rep_target: 8,
    next_rir_target: 2,
    next_sets: null,
    decision: 'increase',
    reason: 'Toutes séries au max — charge augmentée.',
    ...overrides,
  };
}

function makeInputs(overrides: Partial<ShouldTriggerDeloadInputs> = {}): ShouldTriggerDeloadInputs {
  return {
    block: makeBlock(),
    recentSessions: [],
    fatigueHistory: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mode scheduled
// ---------------------------------------------------------------------------

describe('shouldTriggerDeload — mode scheduled', () => {
  it('déclenche à semaine 5 quand duration_weeks=5', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'scheduled', durationWeeks: 5, weekNumber: 5 }),
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.triggered).toBe(true);
    expect(result!.mode).toBe('scheduled');
    expect(result!.weekNumber).toBe(5);
  });

  it('déclenche à semaine 7 quand duration_weeks=8', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'scheduled', durationWeeks: 8, weekNumber: 7 }),
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.triggered).toBe(true);
    expect(result!.mode).toBe('scheduled');
    expect(result!.weekNumber).toBe(7);
  });

  it('ne déclenche pas à semaine 4 (avant la semaine deload)', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'scheduled', durationWeeks: 6, weekNumber: 4 }),
      }),
    );

    expect(result).toBeNull();
  });

  it('déclenche aussi à une semaine postérieure à la semaine deload', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'scheduled', durationWeeks: 8, weekNumber: 8 }),
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.weekNumber).toBe(7);
  });

  it('ignore la fatigue history en mode scheduled (semaine non atteinte)', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'scheduled', durationWeeks: 8, weekNumber: 3 }),
        fatigueHistory: makeFatigueHistory([10, 10, 10]),
      }),
    );

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mode fatigue_triggered — condition 1 : fatigue >= 9 deux jours consécutifs
// ---------------------------------------------------------------------------

describe('shouldTriggerDeload — fatigue_triggered condition 1', () => {
  it('déclenche si fatigueScore >= 9 sur 2 jours consécutifs', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        fatigueHistory: makeFatigueHistory([5, 9, 9]),
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.triggered).toBe(true);
    expect(result!.mode).toBe('fatigue_triggered');
    expect(result!.reason).toMatch(/9.*jours consécutifs/i);
  });

  it('ne déclenche pas si une seule journée >= 9', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        fatigueHistory: makeFatigueHistory([5, 9, 5]),
      }),
    );

    expect(result).toBeNull();
  });

  it('ne déclenche pas si deux jours >= 9 mais non consécutifs', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        fatigueHistory: makeFatigueHistory([9, 5, 9]),
      }),
    );

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mode fatigue_triggered — condition 2 : 3 séances consécutives en baisse
// ---------------------------------------------------------------------------

describe('shouldTriggerDeload — fatigue_triggered condition 2', () => {
  it('déclenche si 3 séances consécutives avec performance en baisse', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        recentSessions: makeRecentSessions([8, 7, 5]),
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.triggered).toBe(true);
    expect(result!.mode).toBe('fatigue_triggered');
    expect(result!.reason).toMatch(/baisse/i);
  });

  it('ne déclenche pas si seulement 2 séances en baisse', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        recentSessions: makeRecentSessions([8, 5]),
      }),
    );

    expect(result).toBeNull();
  });

  it('ne déclenche pas si la baisse est interrompue par une remontée', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        recentSessions: makeRecentSessions([8, 7, 8, 6]),
      }),
    );

    expect(result).toBeNull();
  });

  it('ignore les sessions sans performanceScore', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        recentSessions: makeRecentSessions([8, null, null]),
      }),
    );

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mode fatigue_triggered — condition 3 : fatigue >= 7 + assiduité < 75 %
// ---------------------------------------------------------------------------

describe('shouldTriggerDeload — fatigue_triggered condition 3', () => {
  it('déclenche si latest fatigue >= 7 ET assiduité < 75 %', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        fatigueHistory: makeFatigueHistory([5, 6, 7]),
        attendanceRate: 0.5,
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.triggered).toBe(true);
    expect(result!.mode).toBe('fatigue_triggered');
    expect(result!.reason).toMatch(/assiduité/i);
  });

  it('ne déclenche pas si fatigue >= 7 mais assiduité OK', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        fatigueHistory: makeFatigueHistory([5, 6, 7]),
        attendanceRate: 0.9,
      }),
    );

    expect(result).toBeNull();
  });

  it('ne déclenche pas si assiduité basse mais fatigue < 7', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        fatigueHistory: makeFatigueHistory([5, 6, 6]),
        attendanceRate: 0.4,
      }),
    );

    expect(result).toBeNull();
  });

  it('ne déclenche pas la condition 3 si attendanceRate non fourni', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered' }),
        fatigueHistory: makeFatigueHistory([5, 6, 7]),
      }),
    );

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mode none
// ---------------------------------------------------------------------------

describe('shouldTriggerDeload — mode none', () => {
  it('retourne null même si fatigue très haute', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'none' }),
        fatigueHistory: makeFatigueHistory([10, 10, 10]),
        recentSessions: makeRecentSessions([2, 1, 0]),
        attendanceRate: 0.1,
      }),
    );

    expect(result).toBeNull();
  });

  it('retourne null même en semaine 7 d’un bloc long', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'none', durationWeeks: 8, weekNumber: 7 }),
      }),
    );

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// forceDeload
// ---------------------------------------------------------------------------

describe('shouldTriggerDeload — forceDeload', () => {
  it('déclenche même en mode none', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'none', weekNumber: 3, durationWeeks: 6 }),
        forceDeload: true,
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.triggered).toBe(true);
    expect(result!.mode).toBe('scheduled'); // fallback per spec
    expect(result!.reason).toBe('manual');
    expect(result!.weekNumber).toBe(3);
  });

  it('déclenche en mode scheduled avant la semaine deload (override manuel)', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'scheduled', weekNumber: 2, durationWeeks: 5 }),
        forceDeload: true,
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.mode).toBe('scheduled');
    expect(result!.reason).toBe('manual');
    // weekNumber retourné = semaine deload programmée (cohérence avec mode scheduled).
    expect(result!.weekNumber).toBe(5);
  });

  it('déclenche en mode fatigue_triggered même sans condition', () => {
    const result = shouldTriggerDeload(
      makeInputs({
        block: makeBlock({ deloadStrategy: 'fatigue_triggered', weekNumber: 4 }),
        forceDeload: true,
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.mode).toBe('fatigue_triggered');
    expect(result!.reason).toBe('manual');
    expect(result!.weekNumber).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// applyDeloadModifiers
// ---------------------------------------------------------------------------

describe('applyDeloadModifiers', () => {
  const triggeredDecision: DeloadDecision = {
    triggered: true,
    mode: 'scheduled',
    reason: 'Deload programmé : semaine 5.',
    weekNumber: 5,
  };

  it('réduit la charge de 35 % et arrondit à 0.5 kg', () => {
    const plan = makeExercisePlan({ next_load: 100 });

    const result = applyDeloadModifiers(plan, triggeredDecision, 4);

    // 100 * 0.65 = 65 — déjà multiple de 0.5
    expect(result.next_load).toBe(65);
  });

  it('arrondit la charge au 0.5 kg le plus proche', () => {
    const plan = makeExercisePlan({ next_load: 82.5 });

    const result = applyDeloadModifiers(plan, triggeredDecision, 4);

    // 82.5 * 0.65 = 53.625 → arrondi à 53.5
    expect(result.next_load).toBe(53.5);
  });

  it('réduit les séries de 1 (4 → 3)', () => {
    const plan = makeExercisePlan();

    const result = applyDeloadModifiers(plan, triggeredDecision, 4);

    expect(result.next_sets).toBe(3);
  });

  it('clamp les séries à un minimum de 1', () => {
    const plan = makeExercisePlan();

    const result = applyDeloadModifiers(plan, triggeredDecision, 1);

    expect(result.next_sets).toBe(1);
  });

  it('force le RIR cible à 4', () => {
    const plan = makeExercisePlan({ next_rir_target: 1 });

    const result = applyDeloadModifiers(plan, triggeredDecision, 4);

    expect(result.next_rir_target).toBe(4);
  });

  it('préserve la charge null', () => {
    const plan = makeExercisePlan({ next_load: null });

    const result = applyDeloadModifiers(plan, triggeredDecision, 4);

    expect(result.next_load).toBeNull();
    expect(result.next_sets).toBe(3);
    expect(result.next_rir_target).toBe(4);
  });

  it('retourne le plan inchangé si la décision n’est pas déclenchée', () => {
    const plan = makeExercisePlan({ next_load: 100, next_sets: null, next_rir_target: 2 });
    const noopDecision: DeloadDecision = {
      triggered: false,
      mode: 'none',
      reason: '',
      weekNumber: 1,
    };

    const result = applyDeloadModifiers(plan, noopDecision, 4);

    expect(result.next_load).toBe(100);
    expect(result.next_sets).toBeNull();
    expect(result.next_rir_target).toBe(2);
  });

  it('préserve plannedExerciseId et decision (info diagnostique)', () => {
    const plan = makeExercisePlan({ plannedExerciseId: 'pe-42', decision: 'increase' });

    const result = applyDeloadModifiers(plan, triggeredDecision, 4);

    expect(result.plannedExerciseId).toBe('pe-42');
    expect(result.decision).toBe('increase');
  });
});
