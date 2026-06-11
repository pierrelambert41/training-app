import { fatigueLevelDisplay } from './fatigue-trend';

describe('fatigueLevelDisplay', () => {
  it('suit les paliers de business-rules §3.2', () => {
    expect(fatigueLevelDisplay(0).label).toBe('Fraîcheur');
    expect(fatigueLevelDisplay(3).label).toBe('Fraîcheur');
    expect(fatigueLevelDisplay(4).label).toBe('Vigilance');
    expect(fatigueLevelDisplay(6).label).toBe('Vigilance');
    expect(fatigueLevelDisplay(7).label).toBe('Fatigue élevée');
    expect(fatigueLevelDisplay(8).label).toBe('Fatigue élevée');
    expect(fatigueLevelDisplay(9).label).toBe('Deload recommandé');
    expect(fatigueLevelDisplay(10).label).toBe('Deload recommandé');
  });

  it('associe les couleurs status existantes', () => {
    expect(fatigueLevelDisplay(2).colorClass).toBe('text-status-success');
    expect(fatigueLevelDisplay(5).colorClass).toBe('text-status-warning');
    expect(fatigueLevelDisplay(10).colorClass).toBe('text-status-danger');
  });
});
