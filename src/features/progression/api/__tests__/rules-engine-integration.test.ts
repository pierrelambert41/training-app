/**
 * TA-114 — Tests d'intégration end-to-end du moteur de progression.
 *
 * Valide la chaîne complète : séance loggée → runRulesEngine → recommandations
 * persistées → SessionPlan correct.
 *
 * Couvre 6 scénarios métier (cf. docs/business-rules.md) :
 *  1. Progression strength_fixed (3 séances réussies, RIR >= 2 → +increment)
 *  2. Fatigue → statut 'allegee' (fatigue ∈ [7,8] → -10 % charge, -1 série)
 *  3. Plateau (3 séances identiques, RIR >= 2 → reco type 'plateau')
 *  4. Deload fatigue_triggered (fatigue >= 9 sur 2+ jours consécutifs)
 *  5. Deload scheduled (week_number atteint indépendamment de la fatigue)
 *  6. Première séance, aucun historique → maintien sans erreur
 *
 * Infra in-memory SQLite et factories : `../rules-engine-test-helpers.ts`
 * (mutualisé avec `rules-engine-service.test.ts`).
 */

import { runRulesEngine } from '../rules-engine-service';
import { getBlockById } from '@/services/blocks';
import { getRecommendationsBySession } from '@/services/recommendations';
import { getSessionById, updateSession } from '@/services/sessions';

import {
  installCryptoMock,
  logBenchSets,
  makeInMemoryDb,
  seedBlock,
  seedPlannedExercise,
  seedSession,
} from '../rules-engine-test-helpers';

beforeAll(() => {
  installCryptoMock();
});

/**
 * Marque une séance comme `completed` avec endedAt et un fatigueScore optionnel.
 * Local au fichier de test (pas réutilisé ailleurs).
 */
async function markCompleted(
  db: Parameters<typeof updateSession>[0],
  sessionId: string,
  date: string,
  opts: { fatigueScore?: number; performanceScore?: number } = {},
): Promise<void> {
  await updateSession(db, sessionId, {
    status: 'completed',
    endedAt: `${date}T11:00:00Z`,
    fatigueScore: opts.fatigueScore,
    performanceScore: opts.performanceScore,
  });
}

// ---------------------------------------------------------------------------
// Tests E2E
// ---------------------------------------------------------------------------

describe('Rules engine — intégration end-to-end', () => {
  /**
   * Test E2E 1 — Scénario progression
   *
   * 3 séances strength_fixed réussies (toutes complétées, dernier set RIR >= 2)
   * → recommandation 'increase' générée pour la prochaine séance,
   *    next_load = charge courante + increment_upper_kg.
   *
   * Source : business-rules.md §2.1.
   */
  it('E2E 1 — 3 séances strength_fixed réussies (RIR>=2) → recommandation increase avec +increment', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);
    await seedPlannedExercise(db);

    // 2 séances historiques réussies : 100 kg x 8 reps RIR 2.
    for (let i = 0; i < 2; i++) {
      const id = `sess-prev-${i}`;
      const date = `2026-04-2${5 + i}`;
      await seedSession(db, { id, date });
      await logBenchSets(db, id, 100, 8, 2, 3, 'ex-bench', 'pe-bench', `sl-prev-${i}`);
      await markCompleted(db, id, date, { fatigueScore: 3 });
    }

    // Séance courante : même charge, toutes séries réussies, RIR 2.
    const current = await seedSession(db, { id: 'sess-cur', date: '2026-04-29' });
    await logBenchSets(db, current.id, 100, 8, 2, 3, 'ex-bench', 'pe-bench', 'sl-cur');

    const result = await runRulesEngine(db, current.id);

    // sessionPlan : action 'increase', next_load = 100 + 2.5 = 102.5.
    expect(result.sessionPlan.exercisePlans).toHaveLength(1);
    const benchPlan = result.sessionPlan.exercisePlans[0]!;
    expect(benchPlan.decision).toBe('increase');
    expect(benchPlan.next_load).toBe(102.5);

    // Recommandation persistée correspondante.
    const recs = await getRecommendationsBySession(db, current.id);
    const loadChange = recs.find((r) => r.type === 'load_change');
    expect(loadChange).toBeDefined();
    expect(loadChange!.action).toBe('increase');
    expect(loadChange!.nextLoad).toBe(102.5);
    expect(loadChange!.exerciseId).toBe('ex-bench');
    expect(loadChange!.source).toBe('rules_engine');
  });

  /**
   * Test E2E 2 — Scénario fatigue
   *
   * fatigueScore courant dans la zone 7-8 → SessionPlan.status = 'allegee',
   * charges réduites de 10 % et -1 série (spec §3.3).
   *
   * Combinaison ciblée d'indicateurs (cf. fatigue-score.ts) :
   *  - performanceDecline=1 (e1RM courant < e1RM précédent), poids 3
   *  - lowRir=1 (tous les sets RIR <= 1), poids 3
   *  - preSessionReadiness=0 (readiness=5 → ≥4, pas de pénalité), poids 2
   *  → score = (1×3 + 1×3 + 0×2) / 8 × 10 = 7.5 ∈ [7, 8].
   *
   * Source : business-rules.md §3.3, §4.
   */
  it('E2E 2 — fatigueScore ∈ [7, 8] → SessionPlan.status allegee, charge -10%, -1 série', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);
    await seedPlannedExercise(db);

    // Séance précédente : 100 kg × 8 reps RIR 0 (e1RM ≈ 126.67).
    const prev = await seedSession(db, {
      id: 'sess-prev',
      date: '2026-04-26',
      readiness: 5,
      energy: 5,
      motivation: 5,
      sleepQuality: 5,
    });
    await logBenchSets(db, prev.id, 100, 8, 0, 3, 'ex-bench', 'pe-bench', 'sl-prev');
    await markCompleted(db, prev.id, '2026-04-26', { fatigueScore: 6 });

    // Séance courante : reps en baisse → e1RM courant = 100×(1+6/30)=120 < 126.67
    // → performanceDecline=1. RIR 0 partout → lowRir=1.
    const current = await seedSession(db, {
      id: 'sess-cur',
      date: '2026-04-29',
      readiness: 5,
      energy: 5,
      motivation: 5,
      sleepQuality: 5,
    });
    await logBenchSets(db, current.id, 100, 6, 0, 3, 'ex-bench', 'pe-bench', 'sl-cur');

    const result = await runRulesEngine(db, current.id);

    // Score composite dans la zone 'fatigued' (7-8).
    expect(result.fatigueScore).toBeGreaterThanOrEqual(7);
    expect(result.fatigueScore).toBeLessThan(9);
    expect(result.sessionPlan.status).toBe('allegee');

    // Charge réduite de 10 % : base = 100 (lastLoad), allegee = 90.
    const benchPlan = result.sessionPlan.exercisePlans[0]!;
    expect(benchPlan.next_load).toBe(90);

    // -1 série par exercice (sets planifiés=3 → 2).
    expect(benchPlan.next_sets).toBe(2);
  });

  /**
   * Test E2E 3 — Scénario plateau
   *
   * 3 séances identiques (mêmes charges + reps, RIR moyen >= 2, fatigue < 6)
   * → recommandation type 'plateau' créée pour l'exercice.
   *
   * Source : business-rules.md §6, plateau-detection.ts (seuil 3 sessions).
   */
  it('E2E 3 — 3 séances identiques (charge+reps stables, RIR>=2) → Recommendation type plateau', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);
    await seedPlannedExercise(db);

    // 2 séances historiques + courante = 3 séances toutes à 100 kg / 8 reps RIR 3.
    for (let i = 0; i < 2; i++) {
      const id = `sess-prev-${i}`;
      const date = `2026-04-2${5 + i}`;
      await seedSession(db, { id, date });
      await logBenchSets(db, id, 100, 8, 3, 3, 'ex-bench', 'pe-bench', `sl-prev-${i}`);
      await markCompleted(db, id, date, { fatigueScore: 3 });
    }

    const current = await seedSession(db, { id: 'sess-cur', date: '2026-04-29' });
    await logBenchSets(db, current.id, 100, 8, 3, 3, 'ex-bench', 'pe-bench', 'sl-cur');

    const result = await runRulesEngine(db, current.id);

    // Plateau détecté pour le bench.
    expect(result.plateauAlerts).toHaveLength(1);
    expect(result.plateauAlerts[0]!.exerciseId).toBe('ex-bench');
    expect(result.plateauAlerts[0]!.sessionsInPlateau).toBeGreaterThanOrEqual(3);

    // Recommandation persistée : type 'plateau', exerciseId correct.
    const recs = await getRecommendationsBySession(db, current.id);
    const plateaus = recs.filter((r) => r.type === 'plateau');
    expect(plateaus).toHaveLength(1);
    expect(plateaus[0]!.exerciseId).toBe('ex-bench');
    expect(plateaus[0]!.source).toBe('rules_engine');
    // Action : 'maintain' (non escaladé en 'replace' tant que < 6 séances).
    expect(plateaus[0]!.action).toBe('maintain');
  });

  /**
   * Test E2E 4 — Scénario deload fatigue_triggered
   *
   * fatigueScore >= 9 sur 2+ jours **consécutifs** (calendaires) dans le
   * fatigue history → Recommendation type 'deload', block.status passe
   * 'active' → 'deloaded'.
   *
   * Note métier (cf. deload-rules.ts hasConsecutiveHighFatigueDays) :
   *   - La condition regarde le `fatigueHistory` construit par le moteur
   *     (séances persistées + séance courante).
   *   - 2 séances précédentes datées J-2 et J-1 avec fatigueScore persisté = 9
   *     suffisent pour satisfaire la condition, peu importe le fatigue calculé
   *     en live pour la séance courante.
   *
   * Source : business-rules.md §3.4.
   */
  it('E2E 4 — fatigueScore >= 9 pendant 2+ jours consécutifs → deload triggered, block deloaded', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db, { deloadStrategy: 'fatigue_triggered', status: 'active' });
    await seedPlannedExercise(db);

    // J-2 : fatigueScore persisté = 9.
    const prev1 = await seedSession(db, { id: 'sess-prev-1', date: '2026-04-27' });
    await logBenchSets(db, prev1.id, 100, 8, 2, 3, 'ex-bench', 'pe-bench', 'sl-prev-1');
    await markCompleted(db, prev1.id, '2026-04-27', { fatigueScore: 9 });

    // J-1 : fatigueScore persisté = 9 (jour adjacent → consécutifs).
    const prev2 = await seedSession(db, { id: 'sess-prev-2', date: '2026-04-28' });
    await logBenchSets(db, prev2.id, 100, 8, 2, 3, 'ex-bench', 'pe-bench', 'sl-prev-2');
    await markCompleted(db, prev2.id, '2026-04-28', { fatigueScore: 9 });

    // Séance courante J = 2026-04-29.
    const current = await seedSession(db, { id: 'sess-cur', date: '2026-04-29' });
    await logBenchSets(db, current.id, 100, 8, 2, 3, 'ex-bench', 'pe-bench', 'sl-cur');

    const result = await runRulesEngine(db, current.id);

    expect(result.deloadTriggered).toBe(true);
    expect(result.deloadDecision).not.toBeNull();
    expect(result.deloadDecision!.mode).toBe('fatigue_triggered');

    // block.status doit avoir basculé en 'deloaded'.
    const block = await getBlockById(db, 'block-1');
    expect(block!.status).toBe('deloaded');

    // Recommandation type 'deload', niveau séance (exerciseId=null).
    const recs = await getRecommendationsBySession(db, current.id);
    const deloads = recs.filter((r) => r.type === 'deload');
    expect(deloads).toHaveLength(1);
    expect(deloads[0]!.exerciseId).toBeNull();
    expect(deloads[0]!.action).toBe('deload');
  });

  /**
   * Test E2E 5 — Scénario deload scheduled
   *
   * block.deload_strategy = 'scheduled', durationWeeks=4 → semaine deload = 5
   * (cf. scheduledDeloadWeek). weekNumber=5 atteint → deload déclenché
   * indépendamment du fatigue score (utilisateur frais).
   *
   * Source : business-rules.md §3.4 mode `scheduled`.
   */
  it('E2E 5 — block scheduled, weekNumber atteint → deload triggered indépendamment du fatigue', async () => {
    const db = makeInMemoryDb();
    // durée 4 semaines → scheduledDeloadWeek=5 ; weekNumber=5 → triggered.
    await seedBlock(db, {
      deloadStrategy: 'scheduled',
      durationWeeks: 4,
      weekNumber: 5,
      status: 'active',
    });
    await seedPlannedExercise(db);

    // Utilisateur **frais** : readiness/RIR au max → fatigue score bas.
    // C'est bien le mode 'scheduled' qui doit forcer le deload, pas la fatigue.
    const session = await seedSession(db, {
      id: 'sess-cur',
      date: '2026-04-29',
      readiness: 10,
      energy: 10,
      motivation: 10,
      sleepQuality: 10,
    });
    await logBenchSets(db, session.id, 100, 8, 2, 3, 'ex-bench', 'pe-bench', 'sl-cur');

    const result = await runRulesEngine(db, session.id);

    // Confirmation : ce n'est pas la fatigue qui déclenche.
    expect(result.fatigueScore).toBeLessThan(7);
    expect(result.deloadTriggered).toBe(true);
    expect(result.deloadDecision).not.toBeNull();
    expect(result.deloadDecision!.mode).toBe('scheduled');
    expect(result.deloadDecision!.weekNumber).toBe(5);

    // block.status passé à 'deloaded'.
    const block = await getBlockById(db, 'block-1');
    expect(block!.status).toBe('deloaded');

    // Recommendation type 'deload' persistée.
    const recs = await getRecommendationsBySession(db, session.id);
    const deloads = recs.filter((r) => r.type === 'deload');
    expect(deloads).toHaveLength(1);
    expect(deloads[0]!.exerciseId).toBeNull();
  });

  /**
   * Test E2E 6 — Première séance, aucun historique
   *
   * Aucune séance précédente complétée → pas de plateau possible
   * (< 3 sessions), pas de deload (fatigue_triggered demande 2 jours
   * consécutifs >= 9 dans l'historique). Le moteur doit produire des
   * recommandations de maintien sans aucune erreur.
   *
   * Edge case critique : valide la dégradation gracieuse au premier run.
   */
  it('E2E 6 — première séance (aucun historique) → recommandations de maintien, aucune erreur', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);
    await seedPlannedExercise(db);

    const session = await seedSession(db, { id: 'sess-cur', date: '2026-04-29' });
    await logBenchSets(db, session.id, 100, 8, 2, 3, 'ex-bench', 'pe-bench', 'sl-cur');

    // Ne doit pas throw.
    const result = await runRulesEngine(db, session.id);

    // Plan généré pour l'exercice planifié.
    expect(result.sessionPlan.exercisePlans).toHaveLength(1);

    // Pas de plateau (besoin de ≥ 3 sessions).
    expect(result.plateauAlerts).toHaveLength(0);

    // Pas de deload : aucune session précédente avec fatigueScore >= 9 sur
    // jours consécutifs ; la séance courante seule ne peut satisfaire la
    // condition "2 jours consécutifs".
    expect(result.deloadTriggered).toBe(false);

    // Recommandations persistées : exactement 1 load_change pour le bench.
    const recs = await getRecommendationsBySession(db, session.id);
    const loadChanges = recs.filter((r) => r.type === 'load_change');
    expect(loadChanges).toHaveLength(1);
    expect(loadChanges[0]!.exerciseId).toBe('ex-bench');
    expect(recs.filter((r) => r.type === 'plateau')).toHaveLength(0);
    expect(recs.filter((r) => r.type === 'deload')).toHaveLength(0);

    // Scores écrits sur la séance courante (pas de NPE sur historique vide).
    const reloaded = await getSessionById(db, session.id);
    expect(reloaded!.completionScore).not.toBeNull();
    expect(reloaded!.performanceScore).not.toBeNull();
    expect(reloaded!.fatigueScore).not.toBeNull();
  });
});
