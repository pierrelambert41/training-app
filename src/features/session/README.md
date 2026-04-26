# Feature : session

Gère le cycle de vie d'une séance d'entraînement : démarrage, logging des sets, abandon, fin.

## Structure cible (migration TA-98)

```
api/
  sessions.ts           # CRUD sessions SQLite
  set-logs.ts           # CRUD set_logs SQLite
  session-scores.ts     # Calcul des scores de séance
components/
  session-live-screen.tsx   # Écran principal de séance (actuellement app/(app)/session/live.tsx)
  session-start-screen.tsx
  session-end-screen.tsx
  ExercisePager.tsx
  ExerciseDots.tsx
  SetRowLog.tsx
  RestTimer.tsx
  NoteBottomSheet.tsx
hooks/
  use-active-session.ts
  use-session-exercises.ts
  use-last-set-for-exercise.ts
stores/
  session-store.ts
domain/
  session-scores-domain.ts   # Logique de scoring pure (sans I/O)
index.ts
```

## Statut

Migration planifiée dans TA-98. Les fichiers sont actuellement dans `src/services/`, `src/hooks/`, `src/stores/` et `src/components/session/`.

L'écran `app/(app)/session/live.tsx` (2001 lignes) est l'anti-pattern ARCH-01 de référence — voir `docs/pitfalls.md`.
