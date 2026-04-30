import { detectPlateau } from './plateau-detection';
import type { ExerciseSession } from './plateau-detection';
import type { SetLog } from '@/types/set-log';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSetLog(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'sl-1',
    sessionId: 'sess-1',
    exerciseId: 'ex-bench',
    plannedExerciseId: 'pe-1',
    setNumber: 1,
    targetLoad: 80,
    targetReps: 8,
    targetRir: 2,
    load: 80,
    reps: 8,
    rir: 2,
    durationSeconds: null,
    distanceMeters: null,
    completed: true,
    side: null,
    notes: null,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z',
    ...overrides,
  };
}

/**
 * Crée une session fictive pour un exercice avec des SetLogs basiques.
 */
function makeSession(
  sessionId: string,
  sessionDate: string,
  fatigueScore: number,
  setLogOverrides: Partial<SetLog>[] = [{}, {}, {}],
): ExerciseSession {
  const setLogs: SetLog[] = setLogOverrides.map((overrides, i) =>
    makeSetLog({ id: `${sessionId}-sl-${i}`, sessionId, setNumber: i + 1, ...overrides }),
  );
  return { sessionId, sessionDate, fatigueScore, setLogs };
}

/**
 * Crée 3 sessions identiques (plateau clair).
 */
function makeClearPlateauHistory(
  fatigueScore = 2,
  load = 80,
  reps = 8,
  rir = 2,
): ExerciseSession[] {
  return [
    makeSession('sess-1', '2026-04-01', fatigueScore, [
      { load, reps, rir },
      { load, reps, rir },
      { load, reps, rir },
    ]),
    makeSession('sess-2', '2026-04-04', fatigueScore, [
      { load, reps, rir },
      { load, reps, rir },
      { load, reps, rir },
    ]),
    makeSession('sess-3', '2026-04-07', fatigueScore, [
      { load, reps, rir },
      { load, reps, rir },
      { load, reps, rir },
    ]),
  ];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('detectPlateau', () => {
  // --- Cas 1 : plateau clair ---

  describe('plateau clair', () => {
    it('détecte un plateau avec 3 séances identiques et fatigue basse', () => {
      const history = makeClearPlateauHistory();
      const result = detectPlateau(history);

      expect(result).not.toBeNull();
      expect(result!.exerciseId).toBe('ex-bench');
      expect(result!.sessionsInPlateau).toBe(3);
    });

    it('contient les 4 recommandations ordonnées (check_technique → suggest_variant → adjust_rep_range → modify_tempo)', () => {
      const history = makeClearPlateauHistory();
      const result = detectPlateau(history);

      expect(result!.recommendations).toHaveLength(4);
      expect(result!.recommendations[0]!.type).toBe('check_technique');
      expect(result!.recommendations[1]!.type).toBe('suggest_variant');
      expect(result!.recommendations[2]!.type).toBe('adjust_rep_range');
      expect(result!.recommendations[3]!.type).toBe('modify_tempo');
    });

    it('ne contient pas de recommandation replace en dessous du seuil (3 séances)', () => {
      const history = makeClearPlateauHistory();
      const result = detectPlateau(history);

      expect(result!.recommendations.find((r) => r.type === 'replace')).toBeUndefined();
    });

    it('accepte une tolérance de ±0.25 kg sur la charge (arrondi step 0.25)', () => {
      // 80.1 et 80.15 s'arrondissent tous les deux à 80.0 sur un step de 0.25
      const history = [
        makeSession('sess-1', '2026-04-01', 2, [{ load: 80.0, reps: 8, rir: 2 }]),
        makeSession('sess-2', '2026-04-04', 2, [{ load: 80.1, reps: 8, rir: 2 }]),
        makeSession('sess-3', '2026-04-07', 2, [{ load: 80.0, reps: 8, rir: 2 }]),
      ];
      const result = detectPlateau(history);
      // 80.0 et 80.1 arrondis à 0.25 donnent tous les deux 80.0 → même bucket → plateau
      expect(result).not.toBeNull();
    });

    it('ne confond pas deux crans distincts de 0.25 kg comme identiques', () => {
      // 80.0 et 80.25 sont deux crans différents — progression réelle d'un microload
      const history = [
        makeSession('sess-1', '2026-04-01', 2, [{ load: 80.0, reps: 8, rir: 2 }]),
        makeSession('sess-2', '2026-04-04', 2, [{ load: 80.25, reps: 8, rir: 2 }]),
        makeSession('sess-3', '2026-04-07', 2, [{ load: 80.5, reps: 8, rir: 2 }]),
      ];
      expect(detectPlateau(history)).toBeNull();
    });
  });

  // --- Cas 2 : faux positif — fatigue élevée ---

  describe('faux positif : fatigue élevée', () => {
    it('retourne null si fatigueScore >= 6 sur au moins une séance', () => {
      const history = makeClearPlateauHistory(6); // fatigue = 6, seuil = 6
      expect(detectPlateau(history)).toBeNull();
    });

    it('retourne null si fatigueScore = 7 (fatigue significative)', () => {
      const history = makeClearPlateauHistory(7);
      expect(detectPlateau(history)).toBeNull();
    });

    it('détecte le plateau si fatigueScore = 5 (sous le seuil)', () => {
      const history = makeClearPlateauHistory(5);
      expect(detectPlateau(history)).not.toBeNull();
    });

    it('retourne null si une seule séance a une fatigue élevée', () => {
      const history = [
        makeSession('sess-1', '2026-04-01', 2, [{ load: 80, reps: 8, rir: 2 }]),
        makeSession('sess-2', '2026-04-04', 7, [{ load: 80, reps: 8, rir: 2 }]), // fatigue élevée
        makeSession('sess-3', '2026-04-07', 2, [{ load: 80, reps: 8, rir: 2 }]),
      ];
      expect(detectPlateau(history)).toBeNull();
    });
  });

  // --- Cas 3 : seuil remplacement (6+ séances) ---

  describe('seuil de remplacement (6+ séances)', () => {
    it('ajoute la recommandation replace à partir de 6 séances en plateau', () => {
      const sessions = Array.from({ length: 6 }, (_, i) =>
        makeSession(`sess-${i + 1}`, `2026-04-${String(i * 3 + 1).padStart(2, '0')}`, 2, [
          { load: 80, reps: 8, rir: 2 },
          { load: 80, reps: 8, rir: 2 },
          { load: 80, reps: 8, rir: 2 },
        ]),
      );

      const result = detectPlateau(sessions);

      expect(result).not.toBeNull();
      expect(result!.sessionsInPlateau).toBe(6);
      expect(result!.recommendations[4]!.type).toBe('replace');
    });

    it('ajoute replace pour 7 séances en plateau', () => {
      const sessions = Array.from({ length: 7 }, (_, i) =>
        makeSession(`sess-${i + 1}`, `2026-04-${String(i * 3 + 1).padStart(2, '0')}`, 2, [
          { load: 80, reps: 8, rir: 2 },
        ]),
      );

      const result = detectPlateau(sessions);

      expect(result).not.toBeNull();
      expect(result!.recommendations.find((r) => r.type === 'replace')).toBeDefined();
      expect(result!.sessionsInPlateau).toBe(7);
    });

    it("n'ajoute pas replace pour exactement 5 séances en plateau", () => {
      const sessions = Array.from({ length: 5 }, (_, i) =>
        makeSession(`sess-${i + 1}`, `2026-04-${String(i * 3 + 1).padStart(2, '0')}`, 2, [
          { load: 80, reps: 8, rir: 2 },
        ]),
      );

      const result = detectPlateau(sessions);

      expect(result).not.toBeNull();
      expect(result!.recommendations.find((r) => r.type === 'replace')).toBeUndefined();
    });
  });

  // --- Cas 4 : données insuffisantes (< 3 séances) ---

  describe('données insuffisantes (< 3 séances)', () => {
    it('retourne null pour un historique vide', () => {
      expect(detectPlateau([])).toBeNull();
    });

    it('retourne null pour 1 seule séance', () => {
      const history = [makeClearPlateauHistory()[0]!];
      expect(detectPlateau(history)).toBeNull();
    });

    it('retourne null pour 2 séances (insuffisant)', () => {
      const history = makeClearPlateauHistory().slice(0, 2);
      expect(detectPlateau(history)).toBeNull();
    });
  });

  // --- Cas 5 : pas de plateau (progression détectée) ---

  describe('pas de plateau — progression détectée', () => {
    it('retourne null si la charge augmente entre les séances', () => {
      const history = [
        makeSession('sess-1', '2026-04-01', 2, [{ load: 75, reps: 8, rir: 2 }]),
        makeSession('sess-2', '2026-04-04', 2, [{ load: 77.5, reps: 8, rir: 2 }]),
        makeSession('sess-3', '2026-04-07', 2, [{ load: 80, reps: 8, rir: 2 }]),
      ];
      expect(detectPlateau(history)).toBeNull();
    });

    it('retourne null si les reps progressent entre les séances', () => {
      const history = [
        makeSession('sess-1', '2026-04-01', 2, [{ load: 80, reps: 6, rir: 3 }]),
        makeSession('sess-2', '2026-04-04', 2, [{ load: 80, reps: 7, rir: 3 }]),
        makeSession('sess-3', '2026-04-07', 2, [{ load: 80, reps: 8, rir: 3 }]),
      ];
      expect(detectPlateau(history)).toBeNull();
    });
  });

  // --- Cas 6 : RIR insuffisant ---

  describe('pas de plateau — RIR trop bas (conditions non favorables)', () => {
    it("retourne null si RIR moyen < 2 (l'utilisateur etait a l'echec)", () => {
      const history = makeClearPlateauHistory(2, 80, 8, 1); // rir = 1
      expect(detectPlateau(history)).toBeNull();
    });

    it('détecte le plateau si RIR moyen >= 2', () => {
      const history = makeClearPlateauHistory(2, 80, 8, 2); // rir = 2
      expect(detectPlateau(history)).not.toBeNull();
    });
  });

  // --- Cas 7 : données manquantes dans les SetLogs ---

  describe('SetLogs avec données manquantes', () => {
    it('retourne null si les charges sont null dans les SetLogs', () => {
      const history = [
        makeSession('sess-1', '2026-04-01', 2, [{ load: null }]),
        makeSession('sess-2', '2026-04-04', 2, [{ load: null }]),
        makeSession('sess-3', '2026-04-07', 2, [{ load: null }]),
      ];
      expect(detectPlateau(history)).toBeNull();
    });

    it('retourne null si les reps sont null dans les SetLogs', () => {
      const history = [
        makeSession('sess-1', '2026-04-01', 2, [{ load: 80, reps: null }]),
        makeSession('sess-2', '2026-04-04', 2, [{ load: 80, reps: null }]),
        makeSession('sess-3', '2026-04-07', 2, [{ load: 80, reps: null }]),
      ];
      expect(detectPlateau(history)).toBeNull();
    });

    it('retourne null si les RIR sont null dans les SetLogs', () => {
      const history = [
        makeSession('sess-1', '2026-04-01', 2, [{ load: 80, reps: 8, rir: null }]),
        makeSession('sess-2', '2026-04-04', 2, [{ load: 80, reps: 8, rir: null }]),
        makeSession('sess-3', '2026-04-07', 2, [{ load: 80, reps: 8, rir: null }]),
      ];
      expect(detectPlateau(history)).toBeNull();
    });
  });

  // --- Cas 8 : comptage correct des séances en plateau ---

  describe('comptage des séances en plateau', () => {
    it('compte correctement 4 séances consécutives en plateau parmi 5 total', () => {
      const history = [
        // Séance avec progression — coupe la séquence
        makeSession('sess-1', '2026-04-01', 2, [{ load: 75, reps: 8, rir: 3 }]),
        // 4 séances en plateau
        makeSession('sess-2', '2026-04-04', 2, [{ load: 80, reps: 8, rir: 2 }]),
        makeSession('sess-3', '2026-04-07', 2, [{ load: 80, reps: 8, rir: 2 }]),
        makeSession('sess-4', '2026-04-10', 2, [{ load: 80, reps: 8, rir: 2 }]),
        makeSession('sess-5', '2026-04-13', 2, [{ load: 80, reps: 8, rir: 2 }]),
      ];

      const result = detectPlateau(history);
      expect(result).not.toBeNull();
      expect(result!.sessionsInPlateau).toBe(4);
    });

    it('trie les séances chronologiquement même si elles sont passées dans le désordre', () => {
      const history = [
        makeSession('sess-3', '2026-04-07', 2, [{ load: 80, reps: 8, rir: 2 }]),
        makeSession('sess-1', '2026-04-01', 2, [{ load: 80, reps: 8, rir: 2 }]),
        makeSession('sess-2', '2026-04-04', 2, [{ load: 80, reps: 8, rir: 2 }]),
      ];

      const result = detectPlateau(history);
      expect(result).not.toBeNull();
      expect(result!.sessionsInPlateau).toBe(3);
    });
  });
});
