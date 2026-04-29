import type { SetLog } from '@/types/set-log';

/**
 * Sous-ensemble de RecoveryLog utilisé pour le calcul du fatigue score.
 * Type complet non encore implémenté (Phase 4 saisie absente) — dégradation gracieuse.
 * Source de vérité : docs/data-model.md §RecoveryLog.
 */
export interface RecoveryLogSnapshot {
  date: string;
  sleepHours: number | null;
  energy: number | null;
  soreness: number | null;
}

/**
 * Sous-ensemble de CardioSession utilisé pour le calcul du fatigue score.
 * Type complet non encore implémenté — dégradation gracieuse.
 * Source de vérité : docs/data-model.md §CardioSession.
 */
export interface CardioSessionSnapshot {
  date: string;
  rpe: number | null;
  legImpact: number | null;
  fatiguePost: number | null;
}

/**
 * Readiness pré-séance extraite de Session.
 * Tous les champs sont optionnels (données peuvent manquer).
 */
export interface PreSessionReadiness {
  readiness: number | null;
  energy: number | null;
  motivation: number | null;
  sleepQuality: number | null;
}

/**
 * Inputs pour computeFatigueScore.
 * Toutes les sources de données sont optionnelles — le score est calculé
 * sur les données disponibles et normalisé (dégradation gracieuse).
 *
 * - recentSetLogs       : SetLogs des 2-3 dernières séances, groupés par session.
 * - recoveryLogs        : RecoveryLogs des 7 derniers jours.
 * - preSessionReadiness : Readiness/énergie/motivation/sommeil pré-séance courante.
 * - recentSessionDates  : Dates ISO des séances récentes (pour calcul assiduité).
 * - plannedSessionDates : Dates ISO des séances planifiées sur les 2 dernières semaines.
 * - cardioSessions      : Sessions cardio récentes (impact fatigue systémique).
 */
export interface FatigueInputs {
  recentSetLogs?: SetLog[][];
  recoveryLogs?: RecoveryLogSnapshot[];
  preSessionReadiness?: PreSessionReadiness;
  recentSessionDates?: string[];
  plannedSessionDates?: string[];
  cardioSessions?: CardioSessionSnapshot[];
}

/**
 * Paliers de fatigue selon §3.2 business-rules.md.
 */
export type FatigueLevel = 'fresh' | 'watchful' | 'fatigued' | 'deload';

export interface FatigueScore {
  score: number;
  level: FatigueLevel;
}

/**
 * Formule e1RM Epley : load * (1 + reps / 30).
 * Source : docs/business-rules.md §7.
 */
function computeE1rm(load: number, reps: number): number {
  return load * (1 + reps / 30);
}

/**
 * Calcule le e1RM moyen d'une séance à partir de ses SetLogs.
 * Retourne null si aucun SetLog ne contient load + reps valides.
 */
function sessionAverageE1rm(setLogs: SetLog[]): number | null {
  const values = setLogs
    .filter((s): s is SetLog & { load: number; reps: number } =>
      s.load !== null && s.reps !== null && s.load > 0 && s.reps > 0,
    )
    .map((s) => computeE1rm(s.load, s.reps));

  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Indicateur 1 (Fort) — Performance en baisse sur 2+ séances.
 *
 * Compare le e1RM moyen de la dernière séance à la précédente.
 * Score 0 si stable ou en hausse, score 1 si en baisse.
 * Retourne null si moins de 2 séances disponibles.
 */
function scorePerformanceDecline(recentSetLogs: SetLog[][]): number | null {
  if (recentSetLogs.length < 2) return null;

  const last = recentSetLogs[recentSetLogs.length - 1]!;
  const previous = recentSetLogs[recentSetLogs.length - 2]!;

  const e1rmLast = sessionAverageE1rm(last);
  const e1rmPrevious = sessionAverageE1rm(previous);

  if (e1rmLast === null || e1rmPrevious === null) return null;

  return e1rmLast < e1rmPrevious ? 1 : 0;
}

/**
 * Indicateur 2 (Fort) — RIR systématiquement 0-1 sur les 2-3 dernières séances.
 *
 * Retourne le ratio de sets à RIR <= 1 parmi tous les sets avec RIR renseigné.
 * Score normalisé : 0 si aucun set à RIR faible, 1 si tous les sets à RIR <= 1.
 * Retourne null si aucun RIR disponible.
 */
function scoreLowRir(recentSetLogs: SetLog[][]): number | null {
  const allSets = recentSetLogs.flat();
  const setsWithRir = allSets.filter((s) => s.rir !== null);

  if (setsWithRir.length === 0) return null;

  const lowRirSets = setsWithRir.filter((s) => (s.rir as number) <= 1);
  return lowRirSets.length / setsWithRir.length;
}

/**
 * Indicateur 3 (Moyen) — Sommeil < 6h ou énergie < 4/10 dans les RecoveryLogs récents.
 *
 * Score 0 si aucun indicateur de fatigue, 1 si tous les jours en sous-récupération.
 * Retourne null si aucune donnée disponible.
 */
function scoreRecoverySleepEnergy(recoveryLogs: RecoveryLogSnapshot[]): number | null {
  const relevant = recoveryLogs.filter(
    (r) => r.sleepHours !== null || r.energy !== null,
  );

  if (relevant.length === 0) return null;

  const fatigueCount = relevant.filter(
    (r) =>
      (r.sleepHours !== null && r.sleepHours < 6) ||
      (r.energy !== null && r.energy < 4),
  ).length;

  return fatigueCount / relevant.length;
}

/**
 * Indicateur 4 (Moyen) — Courbatures > 7/10 dans les RecoveryLogs récents.
 *
 * Score 0 si pas de courbatures sévères, 1 si toujours > 7/10.
 * Retourne null si aucune donnée disponible.
 */
function scoreRecoverySoreness(recoveryLogs: RecoveryLogSnapshot[]): number | null {
  const withSoreness = recoveryLogs.filter((r) => r.soreness !== null);

  if (withSoreness.length === 0) return null;

  const highSoreness = withSoreness.filter(
    (r) => (r.soreness as number) > 7,
  ).length;

  return highSoreness / withSoreness.length;
}

/**
 * Indicateur 5 (Moyen) — Readiness pré-séance < 4/10.
 *
 * Score 0 si readiness >= 4, score 1 si readiness est 1.
 * Normalise en tenant compte de tous les champs disponibles (readiness, energy, motivation, sleepQuality).
 * Retourne null si aucune donnée disponible.
 */
function scorePreSessionReadiness(readiness: PreSessionReadiness): number | null {
  const values = [
    readiness.readiness,
    readiness.energy,
    readiness.motivation,
    readiness.sleepQuality,
  ].filter((v): v is number => v !== null);

  if (values.length === 0) return null;

  const average = values.reduce((sum, v) => sum + v, 0) / values.length;

  if (average < 4) {
    return 1 - (average - 1) / 3;
  }
  return 0;
}

/**
 * Indicateur 6 (Faible-Moyen) — Cardio à impact élevé la veille.
 *
 * Score basé sur rpe, legImpact et fatiguePost de la session la plus récente.
 * Retourne null si aucune session cardio disponible.
 */
function scoreCardioImpact(cardioSessions: CardioSessionSnapshot[]): number | null {
  if (cardioSessions.length === 0) return null;

  const mostRecent = cardioSessions[cardioSessions.length - 1]!;

  const indicators = [
    mostRecent.rpe,
    mostRecent.legImpact,
    mostRecent.fatiguePost,
  ].filter((v): v is number => v !== null);

  if (indicators.length === 0) return null;

  const average = indicators.reduce((sum, v) => sum + v, 0) / indicators.length;
  return average / 10;
}

/**
 * Indicateur 7 (Faible) — Assiduité irrégulière (< 75% du plan sur les 2 dernières semaines).
 *
 * Score 0 si assiduité correcte, 1 si très irrégulière.
 * Retourne null si aucune donnée de planification disponible.
 */
function scoreAdherence(
  recentSessionDates: string[],
  plannedSessionDates: string[],
): number | null {
  if (plannedSessionDates.length === 0) return null;

  const adherenceRate = recentSessionDates.length / plannedSessionDates.length;
  return adherenceRate < 0.75 ? 1 - adherenceRate / 0.75 : 0;
}

/**
 * Détermine le palier de fatigue à partir du score (0-10).
 * Source : docs/business-rules.md §3.2.
 */
function toFatigueLevel(score: number): FatigueLevel {
  if (score <= 3) return 'fresh';
  if (score <= 6) return 'watchful';
  if (score <= 8) return 'fatigued';
  return 'deload';
}

/**
 * Poids des indicateurs selon leur importance (Fort / Moyen / Faible).
 * Source : docs/business-rules.md §3.1.
 */
const WEIGHTS = {
  performanceDecline: 3,
  lowRir: 3,
  recoverySleepEnergy: 2,
  recoverySoreness: 2,
  preSessionReadiness: 2,
  cardioImpact: 1.5,
  adherence: 1,
} as const;

/**
 * Calcule le fatigue score composite (0-10) à partir des inputs disponibles.
 *
 * Tous les indicateurs sont optionnels. Le score est calculé sur les données
 * présentes et normalisé selon les poids disponibles (dégradation gracieuse).
 *
 * Paliers (§3.2 business-rules.md) :
 * - 0-3  : fraîcheur, progression normale
 * - 4-6  : vigilance, progression prudente
 * - 7-8  : fatigue significative, séance allégée recommandée
 * - 9-10 : deload recommandé
 *
 * @param inputs - Sources de données de récupération (toutes optionnelles)
 * @returns FatigueScore — score normalisé 0-10 + palier
 */
export function computeFatigueScore(inputs: FatigueInputs): FatigueScore {
  const {
    recentSetLogs = [],
    recoveryLogs = [],
    preSessionReadiness,
    recentSessionDates = [],
    plannedSessionDates = [],
    cardioSessions = [],
  } = inputs;

  type WeightedScore = { value: number; weight: number };
  const collected: WeightedScore[] = [];

  const addIfPresent = (value: number | null, weight: number) => {
    if (value !== null) {
      collected.push({ value, weight });
    }
  };

  addIfPresent(
    scorePerformanceDecline(recentSetLogs),
    WEIGHTS.performanceDecline,
  );
  addIfPresent(scoreLowRir(recentSetLogs), WEIGHTS.lowRir);
  addIfPresent(scoreRecoverySleepEnergy(recoveryLogs), WEIGHTS.recoverySleepEnergy);
  addIfPresent(scoreRecoverySoreness(recoveryLogs), WEIGHTS.recoverySoreness);
  addIfPresent(
    preSessionReadiness ? scorePreSessionReadiness(preSessionReadiness) : null,
    WEIGHTS.preSessionReadiness,
  );
  addIfPresent(scoreCardioImpact(cardioSessions), WEIGHTS.cardioImpact);
  addIfPresent(
    plannedSessionDates.length > 0
      ? scoreAdherence(recentSessionDates, plannedSessionDates)
      : null,
    WEIGHTS.adherence,
  );

  if (collected.length === 0) {
    return { score: 0, level: 'fresh' };
  }

  const totalWeight = collected.reduce((sum, item) => sum + item.weight, 0);
  const weightedSum = collected.reduce(
    (sum, item) => sum + item.value * item.weight,
    0,
  );

  const normalized = (weightedSum / totalWeight) * 10;
  const score = Math.min(10, Math.max(0, Math.round(normalized * 10) / 10));

  return { score, level: toFatigueLevel(score) };
}

