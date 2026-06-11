/**
 * Paliers de fatigue pour l'affichage dashboard — mêmes seuils que
 * computeFatigueScore (docs/business-rules.md §3.2, source unique des
 * valeurs métier).
 */

export type FatiguePoint = {
  date: string;
  score: number;
};

export type FatigueLevelDisplay = {
  label: string;
  /** Classe NativeWind de couleur de texte (palette status existante). */
  colorClass: string;
};

export function fatigueLevelDisplay(score: number): FatigueLevelDisplay {
  if (score <= 3) return { label: 'Fraîcheur', colorClass: 'text-status-success' };
  if (score <= 6) return { label: 'Vigilance', colorClass: 'text-status-warning' };
  if (score <= 8) return { label: 'Fatigue élevée', colorClass: 'text-status-warning' };
  return { label: 'Deload recommandé', colorClass: 'text-status-danger' };
}
