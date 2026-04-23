import exercises from './exercises.json';

const VALID_CATEGORIES = ['compound', 'isolation', 'bodyweight', 'machine', 'cable'] as const;
const VALID_MOVEMENT_PATTERNS = [
  'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull',
  'hinge', 'squat', 'unilateral_quad', 'unilateral_hinge',
  'isolation_upper', 'isolation_lower', 'core', 'carry',
] as const;
const VALID_LOG_TYPES = ['weight_reps', 'bodyweight_reps', 'duration', 'distance_duration'] as const;
const VALID_SYSTEMIC_FATIGUE = ['low', 'moderate', 'high'] as const;
const VALID_MOVEMENT_STABILITY = ['stable', 'moderate', 'variable'] as const;
const VALID_PROGRESSION_TYPES = [
  'strength_fixed', 'double_progression', 'accessory_linear',
  'bodyweight_progression', 'duration_progression', 'distance_duration',
] as const;

describe('exercises dataset', () => {
  it('contains at least 250 exercises', () => {
    expect(exercises.length).toBeGreaterThanOrEqual(250);
  });

  it('has unique names', () => {
    const names = exercises.map((e) => e.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('has unique ids', () => {
    const ids = exercises.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every exercise has required string fields non-empty', () => {
    for (const e of exercises) {
      expect(typeof e.id).toBe('string');
      expect(e.id.length).toBeGreaterThan(0);
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(0);
      expect(typeof e.category).toBe('string');
      expect(typeof e.movement_pattern).toBe('string');
      expect(typeof e.log_type).toBe('string');
    }
  });

  it('every exercise has valid category', () => {
    for (const e of exercises) {
      expect(VALID_CATEGORIES).toContain(e.category as never);
    }
  });

  it('every exercise has valid movement_pattern', () => {
    for (const e of exercises) {
      expect(VALID_MOVEMENT_PATTERNS).toContain(e.movement_pattern as never);
    }
  });

  it('every exercise has valid log_type', () => {
    for (const e of exercises) {
      expect(VALID_LOG_TYPES).toContain(e.log_type as never);
    }
  });

  it('every exercise has valid systemic_fatigue', () => {
    for (const e of exercises) {
      expect(VALID_SYSTEMIC_FATIGUE).toContain(e.systemic_fatigue as never);
    }
  });

  it('every exercise has valid movement_stability', () => {
    for (const e of exercises) {
      expect(VALID_MOVEMENT_STABILITY).toContain(e.movement_stability as never);
    }
  });

  it('every exercise has valid recommended_progression_type', () => {
    for (const e of exercises) {
      expect(VALID_PROGRESSION_TYPES).toContain(e.recommended_progression_type as never);
    }
  });

  it('every exercise has is_custom = false and created_by = null', () => {
    for (const e of exercises) {
      expect(e.is_custom).toBe(false);
      expect(e.created_by).toBeNull();
    }
  });

  it('every exercise has array fields as arrays', () => {
    for (const e of exercises) {
      expect(Array.isArray(e.primary_muscles)).toBe(true);
      expect(e.primary_muscles.length).toBeGreaterThan(0);
      expect(Array.isArray(e.secondary_muscles)).toBe(true);
      expect(Array.isArray(e.equipment)).toBe(true);
      expect(Array.isArray(e.morpho_tags)).toBe(true);
      expect(Array.isArray(e.alternatives)).toBe(true);
      expect(Array.isArray(e.tags)).toBe(true);
    }
  });

  it('covers all movement patterns with at least 2 exercises each', () => {
    for (const pattern of VALID_MOVEMENT_PATTERNS) {
      const count = exercises.filter((e) => e.movement_pattern === pattern).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });
});
