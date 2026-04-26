# Feature : program

Gère les programmes d'entraînement : génération, blocs, jours d'entraînement, exercices planifiés.

## Structure cible (migration à planifier)

```
api/
  programs.ts              # CRUD programs SQLite
  blocks.ts                # CRUD blocks SQLite
  workout-days.ts          # CRUD workout_days SQLite
  planned-exercises.ts     # CRUD planned_exercises SQLite
components/
  active-block-screen.tsx
  workout-day-detail-screen.tsx
  replace-exercise-screen.tsx
  generate/                # Screens du questionnaire de génération (steps 1-8)
hooks/
  use-active-program.ts
  use-today-workout.ts
  use-workout-day-detail.ts
  use-replace-exercise.ts
stores/
  active-program-store.ts
  generation-store.ts
domain/
  program-generation.ts         # Moteur de génération (fonctions pures)
  progression-config.ts         # Assignation progressionType + progressionConfig
index.ts
```

## Statut

Migration planifiée. Les fichiers sont actuellement dans `src/services/`, `src/hooks/`, `src/stores/` et `src/screens/(app)/programs/`.
