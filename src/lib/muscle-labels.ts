/**
 * Labels FR des groupes musculaires (vocabulaire de exercises.primary_muscles /
 * secondary_muscles). Extrait de exercise-detail-screen (TA-152) pour être
 * partagé avec le dashboard volume — même règle que CALIB-01 : une seule
 * source pour un mapping consommé par plusieurs features.
 */
const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Pectoraux',
  lats: 'Dorsaux',
  back: 'Dos',
  lower_back: 'Bas du dos',
  quads: 'Quadriceps',
  hamstrings: 'Ischio-jambiers',
  glutes: 'Fessiers',
  glute_medius: 'Moyen fessier',
  adductors: 'Adducteurs',
  calves: 'Mollets',
  triceps: 'Triceps',
  biceps: 'Biceps',
  shoulders: 'Épaules',
  front_deltoid: 'Deltoïde antérieur',
  lateral_deltoid: 'Deltoïde latéral',
  rear_deltoid: 'Deltoïde postérieur',
  traps: 'Trapèzes',
  lower_traps: 'Trapèzes inférieurs',
  core: 'Gainage',
  rectus_abdominis: 'Grand droit',
  lower_rectus_abdominis: 'Bas des abdos',
  forearms: 'Avant-bras',
  lower_chest: 'Pec inférieur',
  legs: 'Jambes',
};

export function muscleLabel(muscle: string): string {
  return MUSCLE_LABELS[muscle] ?? muscle.replace(/_/g, ' ');
}
