# Story Log

Journal chronologique des stories livrées. Chaque entrée documente ce qui a été construit, comment ça s'imbrique avec les stories précédentes/suivantes, et ce qui reste ouvert.

Mis à jour par le dev à la fin de chaque story. Lu par le dev au début de chaque story pour comprendre le contexte existant.

---

## TA-80 — Ajout exercice non-prévu en séance live
**Livré** : Modal de recherche d'exercice + ajout d'un `PlannedExercise` éphémère à la session en cours.  
**S'appuie sur** : session-store (TA-7x), liste d'exercices existants.  
**Ouvre** : le logger de séance (`live.tsx`) comme hub central de la session.  
**Stubs laissés** : aucun.

---

## TA-81 — Notes rapides par set et par séance
**Livré** : `SetNoteBottomSheet` + `SessionNotesBottomSheet`, persistance des notes dans SQLite via `set_logs.notes` et `sessions.notes`.  
**S'appuie sur** : `live.tsx` (TA-80), schéma `set_logs` + `sessions`.  
**Ouvre** : les notes sont disponibles pour l'écran de fin de séance (TA-83).  
**Stubs laissés** : aucun.

---

## TA-82 — Logging exercices unilatéraux (durée/distance)
**Livré** : support `logType = 'unilateral'` dans `SetRowLog`, saisie côté gauche/droite, `SetLogSide`.  
**S'appuie sur** : `live.tsx`, types `SetLog` + `PlannedExercise`.  
**Ouvre** : les scores de fatigue/performance (TA-83) peuvent exploiter les deux côtés.  
**Stubs laissés** : aucun.

---

## TA-83 — Écran de fin de séance (scores accomplissement/performance/fatigue)
**Livré** : `end.tsx` avec calcul des scores via `session-scores.ts`. Score `progressionVsPrevious` stubbé à 0.5 (données cross-session non disponibles avant Phase 5).  
**S'appuie sur** : `live.tsx` (abandon → end), `session-store`, `computeSessionScores`.  
**Ouvre** : Phase 5 devra remplacer le stub `progressionVsPrevious` par le vrai moteur.  
**Stubs laissés** : `session-scores.ts:121` — `progressionVsPrevious` hardcodé à 0.5.

---

## TA-97 — Architecture Bulletproof React + ESLint boundaries
**Livré** : `docs/architecture.md` §8 (layout + 6 règles R1-R6), `CLAUDE.md` enrichi avec section "Architecture frontend", `docs/pitfalls.md` anti-pattern ARCH-01 (`live.tsx`), `eslint-plugin-boundaries@6` installé + configuré (`eslint.config.mjs`), `src/features/` créé avec READMEs pour 6 features, feature pilote `auth/` migrée vers `src/features/auth/` (api/, hooks/, stores/, index.ts), ADR-017.  
**S'appuie sur** : structure `src/` existante, agent instructions déjà enrichies (R1-R6 dans dev.md/dev-hard.md/reviewer.md).  
**Ouvre** : TA-98 = migration `session/` (live.tsx 2001 lignes). Migration `program/`, `exercise/`, `sync/`, `ai/` dans tickets dédiés.  
**Stubs laissés** : les features `session`, `program`, `exercise`, `sync`, `ai` ont leur dossier `src/features/<feat>/` avec README mais pas encore de fichiers migrés. Les hooks transverses `src/hooks/use-active-session.ts`, `use-today-workout.ts`, `use-active-program.ts` importent depuis `@/features/auth` mais sont eux-mêmes encore dans `src/hooks/` (migration dans leurs tickets respectifs).
**Note** : 1 test pre-existant échoue dans `session-live-screen.test.tsx` (non lié à TA-97, introduit par TA-100).

---

## TA-84 — Abandon explicite, reprise automatique et tests d'intégration offline
**Livré** : abandon de séance (action dans `live.tsx`), reprise automatique (`start.tsx` redirige vers `live` si session en cours), tests d'intégration offline complets.  
**S'appuie sur** : `session-store`, `sessions` service, `start.tsx`, `live.tsx`, `end.tsx`.  
**Ouvre** : le flow session est complet. Phase 5 = progression cross-session + sync Supabase.  
**Bugs découverts post-livraison** :
- `crypto.randomUUID()` non disponible sur Hermes → remplacé par `generateUUID()` (voir pitfalls RN-01)
- `handleStartSession` dans `active-block-screen` et `workout-day-detail-screen` restait un stub `Alert.alert` non branché (voir pitfalls RN-03)

**Stubs laissés** : `handleExercisePress` dans `workout-day-detail-screen.tsx` (détail exercice, Phase 5).
