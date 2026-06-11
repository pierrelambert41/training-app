import {
  defaultBarWeightKg,
  formatWeight,
  fromDisplayWeight,
  kgToLb,
  lbToKg,
  resolveExerciseUnit,
  roundToLoadableIncrement,
  toDisplayWeight,
} from './units';

describe('units', () => {
  describe('conversions', () => {
    it('convertit kg → lb (45 lb ≈ 20.4 kg)', () => {
      expect(kgToLb(20.411654)).toBeCloseTo(45, 3);
    });

    it('convertit lb → kg (225 lb ≈ 102.06 kg)', () => {
      expect(lbToKg(225)).toBeCloseTo(102.058, 2);
    });

    it('aller-retour stable', () => {
      expect(lbToKg(kgToLb(100))).toBeCloseTo(100, 6);
    });
  });

  describe('toDisplayWeight', () => {
    it('kg : arrondi à 0.1', () => {
      expect(toDisplayWeight(82.4567, 'kg')).toBe(82.5);
    });

    it('lb : convertit puis arrondit à 0.1', () => {
      expect(toDisplayWeight(100, 'lb')).toBe(220.5);
    });
  });

  describe('fromDisplayWeight', () => {
    it('kg : identité', () => {
      expect(fromDisplayWeight(82.5, 'kg')).toBe(82.5);
    });

    it('lb : 185 lb → 83.915 kg', () => {
      expect(fromDisplayWeight(185, 'lb')).toBeCloseTo(83.915, 3);
    });

    it('saisie lb stockée en kg puis réaffichée en lb retombe sur la saisie', () => {
      const kg = fromDisplayWeight(185, 'lb');
      expect(toDisplayWeight(kg, 'lb')).toBe(185);
    });
  });

  describe('formatWeight', () => {
    it('formate en kg', () => {
      expect(formatWeight(82.5, 'kg')).toBe('82.5 kg');
    });

    it('formate en lb sans décimale inutile', () => {
      expect(formatWeight(lbToKg(185), 'lb')).toBe('185 lb');
    });
  });

  describe('roundToLoadableIncrement', () => {
    it('kg : multiple de 2.5', () => {
      expect(roundToLoadableIncrement(81.3, 'kg')).toBe(82.5);
      expect(roundToLoadableIncrement(81.2, 'kg')).toBe(80);
    });

    it('lb : la valeur affichée tombe sur un multiple de 5 lb', () => {
      const rounded = roundToLoadableIncrement(42, 'lb'); // 92.6 lb brut
      expect(toDisplayWeight(rounded, 'lb') % 5).toBe(0);
    });
  });

  describe('defaultBarWeightKg', () => {
    it('barre olympique : 20 kg en mode kg', () => {
      expect(defaultBarWeightKg('kg')).toBe(20);
    });

    it('barre olympique : 45 lb en mode lb (pas 44.1)', () => {
      expect(toDisplayWeight(defaultBarWeightKg('lb'), 'lb')).toBe(45);
    });
  });

  describe('resolveExerciseUnit', () => {
    it("retourne l'override de l'exercice si présent", () => {
      expect(resolveExerciseUnit({ displayUnit: 'lb' }, 'kg')).toBe('lb');
    });

    it('retombe sur la préférence globale sinon', () => {
      expect(resolveExerciseUnit({ displayUnit: null }, 'kg')).toBe('kg');
      expect(resolveExerciseUnit(null, 'lb')).toBe('lb');
      expect(resolveExerciseUnit(undefined, 'kg')).toBe('kg');
    });
  });
});
