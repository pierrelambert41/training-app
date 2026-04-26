# Feature : exercise

Gère la bibliothèque d'exercices : catalogue, favoris, création, détail.

## Structure cible (migration à planifier)

```
api/
  exercises.ts        # CRUD exercises SQLite
  favorites.ts        # CRUD exercise_favorites SQLite
components/
  library-screen.tsx
  exercise-detail-screen.tsx
  create-exercise-screen.tsx
  exercise-row.tsx
hooks/
  use-exercises.ts
  use-favorite.ts
  use-create-exercise.ts
  use-exercise-detail.ts
index.ts
```

## Statut

Migration planifiée. Les fichiers sont actuellement dans `src/services/`, `src/hooks/`, et `src/screens/(app)/`.
