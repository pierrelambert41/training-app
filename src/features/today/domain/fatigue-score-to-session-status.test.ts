import { fatigueScoreToSessionStatus } from './fatigue-score-to-session-status';

describe('fatigueScoreToSessionStatus', () => {
  it('retourne null si score null', () => {
    expect(fatigueScoreToSessionStatus(null)).toBeNull();
  });

  it('mappe score >= 9 -> deload', () => {
    expect(fatigueScoreToSessionStatus(9)).toBe('deload');
    expect(fatigueScoreToSessionStatus(10)).toBe('deload');
  });

  it('mappe score >= 7 et < 9 -> allegee', () => {
    expect(fatigueScoreToSessionStatus(7)).toBe('allegee');
    expect(fatigueScoreToSessionStatus(8)).toBe('allegee');
  });

  it('mappe score >= 4 et < 7 -> maintien', () => {
    expect(fatigueScoreToSessionStatus(4)).toBe('maintien');
    expect(fatigueScoreToSessionStatus(6)).toBe('maintien');
  });

  it('mappe score < 4 -> progression', () => {
    expect(fatigueScoreToSessionStatus(0)).toBe('progression');
    expect(fatigueScoreToSessionStatus(3)).toBe('progression');
  });
});
