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

## TA-98 — Refacto `live.tsx` selon architecture Bulletproof React
**Livré** : `app/(app)/session/live.tsx` réduit à 3 lignes (re-export thin). 14 composants extraits dans `src/features/session/components/` (set-row, inline-set-editor, rir-selector, exercise-picker-modal, add-unplanned-config-modal, log-set-form, exercise-header, session-header, exercise-page, live-session-screen + 3 extraits supplémentaires pour rester sous 250L : session-footer-actions, shared-session-modals, set-row-list, log-set-fields, inline-set-editor-fields). 2 hooks extraits dans `hooks/` (use-elapsed-time, use-exercise-page-prefill). 2 helpers dans `lib/` (reps-color, build-virtual-rows). 1 logique domaine dans `domain/` (defaults-for-category). Types partagés dans `types/session-ui.ts`. Public API dans `index.ts`.  
**Config ESLint mise à jour** : ajout du type `feature-lib` (manquant en TA-97), permissions `feature-components → feature-components` (intra-feature), `feature-components → feature-domain`, `feature-components → feature-lib`, `feature-hooks → feature-lib`.  
**S'appuie sur** : TA-97 (architecture Bulletproof React, ESLint boundaries). Zéro changement de comportement — refacto pur.  
**Ouvre** : TA-99 = redesign UX de l'écran live (peut maintenant modifier `live-session-screen.tsx` sans risquer un god-object).  
**Stubs laissés** : aucun ajouté. `handleExercisePress` (TA-15) toujours stub dans `exercise-header.tsx`.  
**Test pré-existant échouant** : `session-live-screen.test.tsx:325` (mockPush) — identique à avant TA-98, non introduit par ce refacto.

---

## TA-99 — Redesign UX écran live session : édition inline, check par ligne, rest timer ajustable
**Livré** : édition inline charge/reps sur chaque ligne de set (composant `set-row-inline-form.tsx`), bouton check ✓ par ligne (remplace le bouton "Log Set" global en bas), rest timer ajustable par exercice (`rest-timer-adjuster.tsx`) avec presets 1min/1m30/2min/3min + saisie libre. La durée de repos est persistée en SQLite via `updateExerciseRestSeconds` (nouvelle action store + `updatePlannedExercise` service). Haptics `ImpactFeedbackStyle.Light` sur tap ✓.  
**Fichiers modifiés** : `set-row.tsx` (3 variantes selon état : current+inline, pending, logged), `set-row-list.tsx` (passe prefills par ligne), `exercise-page.tsx` (supprime `LogSetForm` global, ajoute `RestTimerAdjuster`), `session-store.ts` (ajoute `updateExerciseRestSeconds`).  
**Nouveaux fichiers** : `set-row-inline-form.tsx`, `rest-timer-adjuster.tsx`.  
**Tests** : `session-live-screen.test.tsx` et `set-row-log-type-unilateral.test.tsx` réécrits pour le paradigme inline (test IDs : `check-set-button`, `inline-load-input`, `inline-reps-input`, etc.). Bug pre-existant corrigé : `mockPush` → `mockReplace` pour la navigation vers `session/end`.  
**S'appuie sur** : TA-98 (structure Bulletproof), `updatePlannedExercise` déjà dans le service.  
**Ouvre** : le RIR inline n'est pas encore éditable par set (utilise `prefillRir` = targetRir) — ticket de suivi si besoin.  
**Stubs laissés** : RIR inline figé à `targetRir` de la PlannedExercise (pas de sélecteur RIR dans la ligne courante). Le sélecteur RIR reste dans `InlineSetEditor` pour l'édition post-log.

---

## TA-103 — Modèle de données Phase 5 — table Recommendation et indexes
**Livré** : table `recommendations` en SQLite (migration v8 dans `db.ts`), types TS (`RecommendationType`, `RecommendationAction`, `RecommendationSource`, `Recommendation`, `NewRecommendationInput`, `UpdateRecommendationInput`) dans `src/types/recommendation.ts` + export via `src/types/index.ts`, service CRUD `src/services/recommendations.ts` (`saveRecommendation`, `getRecommendationById`, `getRecommendationsBySession`, `updateRecommendation`, `deleteRecommendation`, `clearRecommendationsForSession`), `SyncTableName` étendu avec `'recommendations'`, migration Supabase `20260429000000_recommendations_indexes.sql` (indexes `idx_recommendations_exercise` et `idx_recommendations_type`), 14 tests d'intégration.  
**S'appuie sur** : TA-72 (tables `sessions`, `set_logs`), `safeEnqueue`/`sync-helpers`, pattern de service CRUD établi (sessions.ts, set-logs.ts). La table `recommendations` + RLS existaient déjà dans `20260423000000_initial_schema.sql`.  
**Ouvre** : le moteur de progression (tickets Phase 5 suivants) peut écrire des recommandations via `saveRecommendation` dès maintenant. `clearRecommendationsForSession` est prêt pour le recalcul post-séance.  
**Stubs laissés** : aucun. Les recommandations sont stockables mais aucune logique de calcul n'est branchée (hors scope de ce ticket).

---

## TA-104 — Domaine : implémentation des 6 types de progression
**Livré** : 6 fonctions pures de progression (zéro I/O, zéro store) + dispatcher `computeProgressionDecision` + feature `progression/` complète.  
**Fichiers créés** :
- `src/features/progression/types/progression-decision.ts` — types `ProgressionDecision`, `ProgressionAction`, `ComputeProgressionDecisionArgs`
- `src/features/progression/domain/progression-types/strength-fixed.ts` + `.test.ts`
- `src/features/progression/domain/progression-types/double-progression.ts` + `.test.ts`
- `src/features/progression/domain/progression-types/accessory-linear.ts` + `.test.ts`
- `src/features/progression/domain/progression-types/bodyweight-progression.ts` + `.test.ts`
- `src/features/progression/domain/progression-types/duration-progression.ts` + `.test.ts`
- `src/features/progression/domain/progression-types/distance-duration.ts` + `.test.ts`
- `src/features/progression/domain/compute-progression-decision.ts` — dispatcher typesafe switch/case
- `src/features/progression/index.ts` — public API R3
- `eslint.config.mjs` — ajout permission `feature-domain → feature-domain` (même feature)  
**Tests** : 52 tests, 6 suites — 100% verts. TypeScript 0 erreur. ESLint boundaries 0 erreur.  
**S'appuie sur** : TA-103 (types `SetLog`, `PlannedExercise`, `ProgressionType`, `ProgressionConfig` déjà définis dans `src/types/`), TA-97 (boundaries config).  
**Ouvre** : le moteur peut maintenant être branché sur le flow post-séance pour générer des `Recommendation` via `saveRecommendation` (TA-103). `computeProgressionDecision` est la seule fonction publique exposée — les consommateurs l'appellent avec le type discriminant et la config typée.  
**Stubs laissés** : les types `ProgressionInput<T>` sont définis mais non utilisés par le dispatcher (pensés pour futurs hooks). `DistanceDurationConfig` utilise des constantes internes pour les increments (non configurables via `progressionConfig`) — à exposer si besoin.  
**Décision produit** : pour `distance_duration`, la progression par distance utilise `next_load` pour stocker la distance cible (en mètres), et la progression par durée utilise `next_rep_target` pour stocker la durée cible (en secondes). Convention documentée dans le code source.

---

## TA-84 — Abandon explicite, reprise automatique et tests d'intégration offline
**Livré** : abandon de séance (action dans `live.tsx`), reprise automatique (`start.tsx` redirige vers `live` si session en cours), tests d'intégration offline complets.  
**S'appuie sur** : `session-store`, `sessions` service, `start.tsx`, `live.tsx`, `end.tsx`.  
**Ouvre** : le flow session est complet. Phase 5 = progression cross-session + sync Supabase.  
**Bugs découverts post-livraison** :
- `crypto.randomUUID()` non disponible sur Hermes → remplacé par `generateUUID()` (voir pitfalls RN-01)
- `handleStartSession` dans `active-block-screen` et `workout-day-detail-screen` restait un stub `Alert.alert` non branché (voir pitfalls RN-03)

**Stubs laissés** : `handleExercisePress` dans `workout-day-detail-screen.tsx` (détail exercice, Phase 5).
