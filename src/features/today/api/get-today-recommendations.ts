import type { SQLiteDatabase } from 'expo-sqlite';
import { getRecommendationsBySession } from '@/services/recommendations';
import { getSessionsByUserId } from '@/services/sessions';
import type { TodayRecommendations, TodaySessionStatus } from '../types/today-recommendations';
import {
  fatigueScoreToSessionStatus,
  VALID_SESSION_STATUSES,
} from '../domain/fatigue-score-to-session-status';

export async function getTodayRecommendations(
  db: SQLiteDatabase,
  userId: string,
): Promise<TodayRecommendations> {
  const sessions = await getSessionsByUserId(db, userId, 10);
  const lastCompleted = sessions.find((s) => s.status === 'completed') ?? null;

  if (!lastCompleted) {
    return {
      sessionStatus: null,
      fatigueScore: null,
      loadRecommendations: [],
      plateauRecommendations: [],
      deloadRecommendation: null,
      fatigue_alert: null,
    };
  }

  const recommendations = await getRecommendationsBySession(db, lastCompleted.id);

  const loadRecommendations = recommendations.filter((r) => r.type === 'load_change');
  const plateauRecommendations = recommendations.filter((r) => r.type === 'plateau');
  const deloadRecommendation = recommendations.find((r) => r.type === 'deload') ?? null;
  const fatigueAlert = recommendations.find((r) => r.type === 'fatigue_alert') ?? null;

  const metadataStatus = loadRecommendations[0]?.metadata?.sessionStatus;
  const sessionStatusFromMetadata: TodaySessionStatus | undefined =
    typeof metadataStatus === 'string' &&
    VALID_SESSION_STATUSES.includes(metadataStatus as TodaySessionStatus)
      ? (metadataStatus as TodaySessionStatus)
      : undefined;

  const sessionStatus =
    sessionStatusFromMetadata ?? fatigueScoreToSessionStatus(lastCompleted.fatigueScore);

  return {
    sessionStatus,
    fatigueScore: lastCompleted.fatigueScore,
    loadRecommendations,
    plateauRecommendations,
    deloadRecommendation,
    fatigue_alert: fatigueAlert,
  };
}
