import { groupPlates, PLATE_SETS, suggestPlatesPerSide, totalFromPlates } from './plate-math';

describe('plate-math', () => {
  describe('totalFromPlates', () => {
    it('barre seule', () => {
      expect(totalFromPlates(20, [])).toBe(20);
    });

    it('barre 20 + 2×(25+5) = 80', () => {
      expect(totalFromPlates(20, [25, 5])).toBe(80);
    });

    it("l'exemple de Pierre : deux 25 et deux 5 par côté... non — 25+5 par côté", () => {
      // 2 plaques de 25 et 2 de 5 au total = 25+5 par côté sur barre 20 → 80
      expect(totalFromPlates(20, [25, 5])).toBe(80);
    });

    it('gère les décimales (2.5 + 1.25)', () => {
      expect(totalFromPlates(20, [2.5, 1.25])).toBe(27.5);
    });
  });

  describe('suggestPlatesPerSide', () => {
    it('cible 100 kg sur barre 20 → 2×(25+15) : 25+15 par côté', () => {
      expect(suggestPlatesPerSide(100, 20, PLATE_SETS.kg)).toEqual([25, 15]);
    });

    it('cible exacte au poids de barre → aucune plaque', () => {
      expect(suggestPlatesPerSide(20, 20, PLATE_SETS.kg)).toEqual([]);
    });

    it('cible sous la barre → null', () => {
      expect(suggestPlatesPerSide(15, 20, PLATE_SETS.kg)).toBeNull();
    });

    it('approximation par en-dessous si la cible ne tombe pas juste', () => {
      const plates = suggestPlatesPerSide(81, 20, PLATE_SETS.kg)!;
      expect(totalFromPlates(20, plates)).toBeLessThanOrEqual(81);
      expect(totalFromPlates(20, plates)).toBe(80);
    });

    it('fonctionne en lb (225 lb = barre 45 + 2×90)', () => {
      const plates = suggestPlatesPerSide(225, 45, PLATE_SETS.lb)!;
      expect(totalFromPlates(45, plates)).toBe(225);
      expect(plates).toEqual([45, 45]);
    });
  });

  describe('groupPlates', () => {
    it('regroupe et trie par valeur décroissante', () => {
      expect(groupPlates([5, 25, 25, 2.5])).toEqual([
        { plate: 25, count: 2 },
        { plate: 5, count: 1 },
        { plate: 2.5, count: 1 },
      ]);
    });
  });
});
