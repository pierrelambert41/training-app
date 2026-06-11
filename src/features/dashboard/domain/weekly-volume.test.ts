import { countWeeklySetsByMuscle, weekBounds } from './weekly-volume';

describe('weekBounds', () => {
  it('retourne lundi → dimanche de la semaine courante (offset 0)', () => {
    // 2026-06-11 est un jeudi
    expect(weekBounds('2026-06-11', 0)).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('gère le dimanche (jsDay 0) comme fin de semaine, pas début', () => {
    // 2026-06-14 est un dimanche : sa semaine commence le lundi 8
    expect(weekBounds('2026-06-14', 0)).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('décale par semaines entières avec offset négatif', () => {
    expect(weekBounds('2026-06-11', -2)).toEqual({
      start: '2026-05-25',
      end: '2026-05-31',
    });
  });
});

describe('countWeeklySetsByMuscle', () => {
  it('compte 1 série pour chaque muscle agoniste du set (comptage agoniste)', () => {
    const volumes = countWeeklySetsByMuscle([
      { primaryMuscles: '["chest","triceps"]' },
      { primaryMuscles: '["chest"]' },
      { primaryMuscles: '["quads","glutes"]' },
    ]);
    expect(volumes).toEqual([
      { muscle: 'chest', sets: 2 },
      { muscle: 'glutes', sets: 1 },
      { muscle: 'quads', sets: 1 },
      { muscle: 'triceps', sets: 1 },
    ]);
  });

  it('trie par volume décroissant puis alphabétique', () => {
    const volumes = countWeeklySetsByMuscle([
      { primaryMuscles: '["lats"]' },
      { primaryMuscles: '["lats"]' },
      { primaryMuscles: '["chest"]' },
    ]);
    expect(volumes[0]).toEqual({ muscle: 'lats', sets: 2 });
  });

  it('ignore les JSON invalides et les valeurs non-string', () => {
    const volumes = countWeeklySetsByMuscle([
      { primaryMuscles: 'pas-du-json' },
      { primaryMuscles: '{"muscle":"chest"}' },
      { primaryMuscles: '[42, "", "chest"]' },
    ]);
    expect(volumes).toEqual([{ muscle: 'chest', sets: 1 }]);
  });

  it('retourne vide sans sets', () => {
    expect(countWeeklySetsByMuscle([])).toEqual([]);
  });
});
