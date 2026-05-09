import { findBestMatch, buildExerciseMappings } from './exercise-matcher';

const exercises = [
  { id: 'ex-1', name: 'Barbell Bench Press' },
  { id: 'ex-2', name: 'Dumbbell Bench Press' },
  { id: 'ex-3', name: 'Barbell Squat' },
  { id: 'ex-4', name: 'Romanian Deadlift' },
  { id: 'ex-5', name: 'Pull-Up' },
];

describe('findBestMatch', () => {
  it('exact match returns score 1', () => {
    const result = findBestMatch('Barbell Bench Press', exercises);
    expect(result?.internalId).toBe('ex-1');
    expect(result?.score).toBe(1);
  });

  it('case-insensitive match', () => {
    const result = findBestMatch('barbell bench press', exercises);
    expect(result?.internalId).toBe('ex-1');
  });

  it('minor typo still matches above threshold', () => {
    const result = findBestMatch('Barbell Bench Prss', exercises);
    expect(result?.internalId).toBe('ex-1');
    expect(result?.score).toBeGreaterThan(0.5);
  });

  it('partial name match picks best candidate', () => {
    const result = findBestMatch('Bench Press', exercises);
    expect(['ex-1', 'ex-2']).toContain(result?.internalId);
  });

  it('completely different name returns null below threshold', () => {
    const result = findBestMatch('Leg Extension', exercises, 0.7);
    expect(result).toBeNull();
  });

  it('empty exercises list returns null', () => {
    const result = findBestMatch('Bench Press', []);
    expect(result).toBeNull();
  });

  it('custom threshold can be more strict — near match excluded', () => {
    // "Barbell Squatt" (typo) vs "Barbell Squat" (13 chars) → dist=1, score=12/13 ≈ 0.923 < 0.99
    const result = findBestMatch('Barbell Squatt', exercises, 0.99);
    expect(result).toBeNull();
  });

  it('exact threshold boundary: exact match always passes any threshold', () => {
    const result = findBestMatch('Barbell Squat', exercises, 1);
    expect(result?.internalId).toBe('ex-3');
    expect(result?.score).toBe(1);
  });

  it('diacritics and special chars are stripped', () => {
    const result = findBestMatch('Barbell-Bench-Press', exercises);
    expect(result?.internalId).toBe('ex-1');
  });

  it('Romanian Deadlift matches with good similarity', () => {
    const result = findBestMatch('Romanian Deadlift', exercises);
    expect(result?.internalId).toBe('ex-4');
    expect(result?.score).toBe(1);
  });
});

describe('buildExerciseMappings', () => {
  it('maps multiple names correctly', () => {
    const mappings = buildExerciseMappings(
      ['Barbell Bench Press', 'Unknown Exercise'],
      exercises,
    );
    expect(mappings).toHaveLength(2);
    expect(mappings[0].hevyName).toBe('Barbell Bench Press');
    expect(mappings[0].match?.internalId).toBe('ex-1');
    expect(mappings[1].hevyName).toBe('Unknown Exercise');
    expect(mappings[1].match).toBeNull();
  });

  it('handles empty hevy names list', () => {
    const mappings = buildExerciseMappings([], exercises);
    expect(mappings).toHaveLength(0);
  });

  it('handles empty exercises list', () => {
    const mappings = buildExerciseMappings(['Bench Press'], []);
    expect(mappings[0].match).toBeNull();
  });
});
