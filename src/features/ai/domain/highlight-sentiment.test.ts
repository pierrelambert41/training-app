/**
 * Tests TA-140 — inférence du sentiment d'un recent_highlight.
 */

import { inferHighlightSentiment } from './highlight-sentiment';

describe('inferHighlightSentiment', () => {
  it.each([
    'Plateau squat détecté',
    'Baisse de volume cette semaine',
    'Fatigue élevée sur 7 jours',
    'Séance manquée mercredi',
  ])("'%s' → warning", (text) => {
    expect(inferHighlightSentiment(text)).toBe('warning');
  });

  it.each([
    'PR bench ce mois',
    'Record au soulevé de terre',
    'Progression régulière sur le squat',
    'Bench +5kg e1RM',
  ])("'%s' → positive", (text) => {
    expect(inferHighlightSentiment(text)).toBe('positive');
  });

  it.each(['4 séances cette semaine', 'Nouveau bloc démarré'])(
    "'%s' → neutral",
    (text) => {
      expect(inferHighlightSentiment(text)).toBe('neutral');
    }
  );

  it('warning prioritaire sur positive (texte mixte)', () => {
    expect(inferHighlightSentiment('Progression stoppée : plateau squat')).toBe('warning');
  });
});
