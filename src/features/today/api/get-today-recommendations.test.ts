import { getTodayRecommendations } from './get-today-recommendations';
import * as sessionsService from '@/services/sessions';
import * as recommendationsService from '@/services/recommendations';
import type { Session } from '@/types/session';
import type { Recommendation } from '@/types/recommendation';

jest.mock('@/services/sessions');
jest.mock('@/services/recommendations');

const mockDB = {} as Parameters<typeof getTodayRecommendations>[0];

const baseSession: Session = {
  id: 'session-1',
  userId: 'user-1',
  workoutDayId: 'day-1',
  blockId: 'block-1',
  date: '2026-05-05',
  startedAt: '2026-05-05T10:00:00.000Z',
  endedAt: '2026-05-05T11:00:00.000Z',
  status: 'completed',
  readiness: null,
  energy: null,
  motivation: null,
  sleepQuality: null,
  preSessionNotes: null,
  completionScore: 0.8,
  performanceScore: 0.7,
  fatigueScore: 3,
  postSessionNotes: null,
  deviceId: 'device-1',
  syncedAt: null,
  createdAt: '2026-05-05T10:00:00.000Z',
  updatedAt: '2026-05-05T11:00:00.000Z',
};

const makeRec = (overrides: Partial<Recommendation>): Recommendation => ({
  id: 'rec-1',
  sessionId: 'session-1',
  exerciseId: 'ex-1',
  source: 'rules_engine',
  type: 'load_change',
  message: 'Progression',
  nextLoad: 100,
  nextRepTarget: 8,
  nextRirTarget: 2,
  action: 'increase',
  confidence: 0.8,
  metadata: { sessionStatus: 'progression', plannedExerciseId: 'pe-1', nextSets: null },
  createdAt: '2026-05-05T11:00:00.000Z',
  ...overrides,
});

describe('getTodayRecommendations', () => {
  const mockGetSessions = sessionsService.getSessionsByUserId as jest.MockedFunction<
    typeof sessionsService.getSessionsByUserId
  >;
  const mockGetRecs = recommendationsService.getRecommendationsBySession as jest.MockedFunction<
    typeof recommendationsService.getRecommendationsBySession
  >;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('retourne des valeurs vides si aucune session completee', async () => {
    mockGetSessions.mockResolvedValue([]);

    const result = await getTodayRecommendations(mockDB, 'user-1');

    expect(result.sessionStatus).toBeNull();
    expect(result.fatigueScore).toBeNull();
    expect(result.loadRecommendations).toHaveLength(0);
    expect(result.deloadRecommendation).toBeNull();
  });

  it('retourne sessionStatus depuis metadata quand disponible', async () => {
    mockGetSessions.mockResolvedValue([baseSession]);
    mockGetRecs.mockResolvedValue([makeRec({ metadata: { sessionStatus: 'progression' } })]);

    const result = await getTodayRecommendations(mockDB, 'user-1');

    expect(result.sessionStatus).toBe('progression');
  });

  it('derive sessionStatus depuis fatigueScore si pas de metadata', async () => {
    const session = { ...baseSession, fatigueScore: 5 };
    mockGetSessions.mockResolvedValue([session]);
    mockGetRecs.mockResolvedValue([makeRec({ type: 'load_change', metadata: {} })]);

    const result = await getTodayRecommendations(mockDB, 'user-1');

    expect(result.sessionStatus).toBe('maintien');
  });

  it('mappe fatigueScore >= 9 -> deload', async () => {
    const session = { ...baseSession, fatigueScore: 9 };
    mockGetSessions.mockResolvedValue([session]);
    mockGetRecs.mockResolvedValue([]);

    const result = await getTodayRecommendations(mockDB, 'user-1');

    expect(result.sessionStatus).toBe('deload');
  });

  it('mappe fatigueScore >= 7 -> allegee', async () => {
    const session = { ...baseSession, fatigueScore: 7 };
    mockGetSessions.mockResolvedValue([session]);
    mockGetRecs.mockResolvedValue([]);

    const result = await getTodayRecommendations(mockDB, 'user-1');

    expect(result.sessionStatus).toBe('allegee');
  });

  it('separe les recommandations par type', async () => {
    mockGetSessions.mockResolvedValue([baseSession]);
    const loadRec = makeRec({ id: 'rec-1', type: 'load_change' });
    const plateauRec = makeRec({ id: 'rec-2', type: 'plateau', exerciseId: 'ex-2' });
    const deloadRec = makeRec({ id: 'rec-3', type: 'deload', exerciseId: null });
    mockGetRecs.mockResolvedValue([loadRec, plateauRec, deloadRec]);

    const result = await getTodayRecommendations(mockDB, 'user-1');

    expect(result.loadRecommendations).toHaveLength(1);
    expect(result.loadRecommendations[0]!.id).toBe('rec-1');
    expect(result.plateauRecommendations).toHaveLength(1);
    expect(result.plateauRecommendations[0]!.id).toBe('rec-2');
    expect(result.deloadRecommendation?.id).toBe('rec-3');
  });

  it('retourne sessionStatus null si fatigueScore null et pas de metadata', async () => {
    const session = { ...baseSession, fatigueScore: null };
    mockGetSessions.mockResolvedValue([session]);
    mockGetRecs.mockResolvedValue([]);

    const result = await getTodayRecommendations(mockDB, 'user-1');

    expect(result.sessionStatus).toBeNull();
  });
});
