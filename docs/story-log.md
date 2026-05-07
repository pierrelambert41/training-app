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
**Stubs laissés** : `session-scores.ts:121` — `progressionVsPrevious` hardcodé à 0.5. **Résolu en TA-110.**

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

## TA-105 — Domaine : calcul du fatigue score composite
**Livré** : fonction pure `computeFatigueScore(inputs: FatigueInputs) → FatigueScore` avec 7 indicateurs pondérés et dégradation gracieuse complète.  
**Fichiers créés** :
- `src/features/progression/domain/fatigue-score.ts` — types locaux (`RecoveryLogSnapshot`, `CardioSessionSnapshot`, `PreSessionReadiness`, `FatigueInputs`, `FatigueScore`, `FatigueLevel`), 7 fonctions d'indicateurs privées, dispatcher `computeFatigueScore`
- `src/features/progression/domain/fatigue-score.test.ts` — 18 tests, 100% verts (fraîcheur, watchful, deload, dégradation gracieuse, e1RM, paliers)
**Fichiers modifiés** :
- `src/features/progression/index.ts` — export public API R3 (`computeFatigueScore` + types)
**Indicateurs implémentés** (§3.1 business-rules.md) :
1. Performance en baisse via e1RM Epley (poids Fort = 3) — comparaison 2 séances minimum
2. RIR systématiquement 0-1 (poids Fort = 3) — ratio sur toutes les séries récentes
3. Sommeil < 6h ou énergie < 4/10 dans RecoveryLogs (poids Moyen = 2)
4. Courbatures > 7/10 dans RecoveryLogs (poids Moyen = 2)
5. Readiness pré-séance < 4/10 (poids Moyen = 2) — moyenne readiness/energy/motivation/sleepQuality
6. Cardio à impact élevé (poids Faible-Moyen = 1.5) — rpe/legImpact/fatiguePost
7. Assiduité irrégulière < 75% du plan (poids Faible = 1)
**Dégradation gracieuse** : `RecoveryLog` et `CardioSession` sans type global TS ni saisie UI en Phase 4 → types locaux snapshot définis dans `fatigue-score.ts`. Tous les inputs sont optionnels, score normalisé sur les données disponibles.  
**Tests** : 18 tests, TypeScript 0 erreur, ESLint boundaries 0 erreur. Total feature : 71 tests, 7 suites.  
**S'appuie sur** : TA-104 (feature `progression/` + domaine), TA-103 (types `SetLog`, `Session`).  
**Ouvre** : le statut de séance (ticket suivant Phase 5) peut appeler `computeFatigueScore` pour déterminer le statut (`progression`/`maintien`/`allegee`/`deload`). La persistance du fatigue_score dans `sessions` est hors scope de TA-105.  
**Stubs laissés** : `RecoveryLogSnapshot` et `CardioSessionSnapshot` sont des types locaux à migrer quand les types globaux seront disponibles (voir pitfalls PROG-02).

---

## TA-106 — Domaine : calcul du statut de séance et charges cibles (SessionPlan)
**Livré** : fonction pure `computeNextSessionPlan(inputs: SessionPlanInputs) → SessionPlan` qui orchestre `computeFatigueScore` (TA-105) et `computeProgressionDecision` (TA-104) pour produire un statut global de séance + des charges cibles par exercice.  
**Fichiers créés** :
- `src/features/progression/domain/session-plan.ts` — types `SessionStatus`, `SessionPlan`, `ExercisePlan`, `SessionPlanInputs`, `RecoveryContext` + implémentation des 6 statuts + surcharges fatigue
- `src/features/progression/domain/session-plan.test.ts` — 23 tests, 100% verts (6 statuts + cas limites)
**Fichiers modifiés** :
- `src/features/progression/index.ts` — export public API R3 (`computeNextSessionPlan` + types)
**6 statuts implémentés** (§4 business-rules.md) :
- `progression` : fatigue 0-3, pas de longue pause, pas assez de séances consécutives pour aggressive
- `maintien` : fatigue 4-6
- `allegee` : fatigue 7-8 → charges * 0.9, -1 série (min 1), arrondi au 0.25 kg (spec §3.3)
- `prudente` : longue pause > 14j → charges * 0.8, prime sur tous les autres statuts sauf deload
- `aggressive` : fatigue ≤ 1 + 3+ séances consécutives en increase → statut sans modification de charge (signal uniquement)
- `deload` : fatigue ≥ 9 → charges * 0.65, reps = repRangeMin, RIR cible = 4. **Prime sur prudente** (longue pause + fatigue >= 9 → deload, pas prudente)
**Architecture** : la surcharge fatigue s'applique post-décision du moteur de progression. La décision logique (`action`) est toujours préservée pour traçabilité. La clé des dictionnaires `setLogsByExercise` et `progressionHistoryByExercise` est l'ID du `PlannedExercise` (pas de l'exercice).  
**Champ `next_sets`** : `ExercisePlan` expose `next_sets: number | null`. `null` = non modifié, nombre = override (utilisé par `allegee` pour -1 série). `deload` ne réduit pas les séries via ce champ (volume réduit délégué à la stratégie de deload — hors scope TA-106).  
**`countConsecutiveProgressions`** : prend le min sur tous les exercices — un exercice sans 3 progressions consécutives bloque le statut `aggressive`.  
**Tests** : 23 tests. Total feature progression : 94 tests, 8 suites — 100% verts. TypeScript 0 erreur.  
**S'appuie sur** : TA-104 (`computeProgressionDecision`), TA-105 (`computeFatigueScore`), types `PlannedExercise`, `Session`, `SetLog` (src/types/).  
**Ouvre** : le service de séance peut appeler `computeNextSessionPlan` avant chaque séance pour afficher le statut et les charges cibles. Les résultats peuvent alimenter `saveRecommendation` (TA-103).  
**Stubs laissés** : le statut `aggressive` est un signal — aucune modification de charge n'est forcée (conform à la spec "push supplémentaire possible, non forcé"). La réduction de volume en `deload` (-1 à -2 séries selon §3.4) n'est pas implémentée via `next_sets` — seule la charge est ajustée à ce stade.

---

## TA-107 — Domaine : détection de plateau
**Livré** : fonction pure `detectPlateau(exerciseHistory: ExerciseSession[]) → PlateauAnalysis | null` avec type `ExerciseSession` (SetLogs groupés par session + fatigueScore), détection des 4 conditions de plateau (charge identique, reps identiques, RIR >= 2, fatigueScore < 6), recommandations ordonnées selon §6 business-rules.md, seuil de remplacement à 6+ séances.  
**Fichiers créés** :
- `src/features/progression/domain/plateau-detection.ts` — types `ExerciseSession`, `PlateauAnalysis`, `PlateauRecommendation`, `PlateauRecommendationType` + implémentation
- `src/features/progression/domain/plateau-detection.test.ts` — 24 tests, 100% verts
**Fichiers modifiés** :
- `src/features/progression/index.ts` — export public API R3 (`detectPlateau` + types)
**Recommandations (ordre §6)** : `check_technique` → `suggest_variant` → `adjust_rep_range` → `modify_tempo` → `replace` (si 6+ séances).  
**Tolérance de charge** : arrondi au step de 0.25 kg via médiane des SetLogs. Deux charges sont "identiques" si elles ont le même cran après arrondi à 0.25 (80.0 et 80.1 = même cran, 80.0 et 80.25 = crans distincts = progression).  
**Comptage sessionsInPlateau** : remonte depuis la dernière session jusqu'à la première rupture de plateau (charge ou reps différents) pour capter les 6+ séances déclenchant `replace`.  
**Tests** : 24 tests, 9 suites feature, 118 total — 100% verts. TypeScript 0 erreur. ESLint boundaries 0 erreur.  
**S'appuie sur** : TA-104 (types `SetLog`, feature `progression/`), TA-103 (type `Recommendation` disponible pour persistance future).  
**Ouvre** : le service de recommandations peut appeler `detectPlateau` post-séance et persister via `saveRecommendation` (type `plateau`, source `rules_engine`). L'affichage IA du plateau est Phase 7 (hors scope).  
**R6** : `plateau-detection.ts` à 268 lignes (> 250) — densité documentaire (JSDoc ~60 lignes), fonctions pures cohésives non splitables sans overhead inutile. Sous le seuil critique de 400.  
**Stubs laissés** : aucun (le code mort `?? ''` a été supprimé — l'invariant setLogs non-vide est garanti par les guards loads/reps en amont).

---

## TA-108 — Domaine : règles et application du deload
**Livré** : 2 fonctions pures.
- `shouldTriggerDeload(inputs) → DeloadDecision | null` : décide si un deload doit être déclenché à partir de `block.deloadStrategy`, `recentSessions`, `fatigueHistory`, `attendanceRate?`, `forceDeload?`. Couvre les 3 modes (`scheduled` / `fatigue_triggered` / `none`) + override manuel.
- `applyDeloadModifiers(exercisePlan, decision, plannedSets) → ExercisePlan` : applique le format deload (charges -35 % arrondies à 0.5 kg, séries -1 min 1, RIR cible 4).

**Fichiers créés** :
- `src/features/progression/domain/deload-rules.ts` — types `DeloadMode`, `DeloadDecision`, `RecentSessionSnapshot`, `FatigueHistoryEntry`, `ShouldTriggerDeloadInputs` + 2 fonctions exposées
- `src/features/progression/domain/deload-rules.test.ts` — 29 tests, 100 % verts (3 conditions fatigue, scheduled, none, forceDeload, applyDeloadModifiers)

**Fichiers modifiés** :
- `src/features/progression/index.ts` — export public API R3 (`shouldTriggerDeload`, `applyDeloadModifiers` + types)

**Conditions fatigue_triggered** (§3.4) : (1) fatigueScore >= 9 deux jours calendaires consécutifs ; (2) 3 séances consécutives avec `performanceScore` strictement décroissant (séances sans score ignorées) ; (3) latest fatigue >= 7 ET `attendanceRate` < 0.75 (input optionnel, condition 3 inactivable si non fourni).

**Semaine deload scheduled** : `durationWeeks <= 5 → semaine 5` ; `> 5 → semaine 7`. Déclenche dès `block.weekNumber >= semaine deload`.

**Sémantique `weekNumber` du DeloadDecision** : pour mode `scheduled` (et forceDeload mode `scheduled`), retourne la semaine deload programmée. Pour `fatigue_triggered` et forceDeload (mode hérité non-scheduled), retourne la semaine actuelle du bloc — c'est la semaine où le deload commence.

**ForceDeload + mode `none`** : fallback sur mode `scheduled` per spec, `weekNumber` = semaine actuelle, reason = `'manual'`.

**S'appuie sur** : TA-103 (type `Block.deloadStrategy`), TA-105 (`fatigueScore` produit en amont), TA-106 (type `ExercisePlan`).

**Ouvre** : un service applicatif Phase 5 pourra orchestrer `shouldTriggerDeload` + bascule `block.status` vers `'deloaded'` (cf. ADR-011) et appeler `applyDeloadModifiers` sur les `exercisePlans` produits par `computeNextSessionPlan` quand un deload est actif. La persistance d'une `Recommendation` (type `deload`) à partir de la `DeloadDecision` reste à câbler.

**Tests** : 29 tests deload-rules + 147 total feature progression, 100 % verts. TypeScript 0 erreur. ESLint boundaries 0 erreur.

**R6** : `deload-rules.ts` à 343 lignes (entre 250 et 400) — densité documentaire (JSDoc + comments WHY) + 3 conditions fatigue indépendantes + format deload partagé. Splitter `shouldTriggerDeload` et `applyDeloadModifiers` séparerait deux fonctions étroitement liées (constantes `DELOAD_*` partagées).

**Stubs laissés** : aucun. Note d'intégration : la condition 3 (assiduité) requiert `attendanceRate` calculé en amont par l'orchestrateur (le calcul plan vs réalisé sur 2 semaines dépend du planning hors scope domaine pur).

---

## TA-109 — Service rules engine : orchestration et persistance des recommandations
**Livré** : `runRulesEngine(db, sessionId, options?) → RulesEngineResult`. Orchestre les fonctions domain TA-104..TA-108 + persiste Recommendation/Session/Block. Branché dans `app/(app)/session/end.tsx` post-`completeSession`.

**Fichiers créés** :
- `src/features/progression/api/rules-engine-service.ts` — orchestrateur (351 lignes), point d'entrée unique, idempotent.
- `src/features/progression/api/rules-engine-service.test.ts` — 13 tests d'intégration in-memory SQLite.
- `src/features/progression/domain/rules-engine-helpers.ts` — helpers purs (groupage SetLogs, plateau-per-exercise, fatigue history, action mapping).
- `src/features/progression/domain/progression-vs-previous.ts` — `computeProgressionVsPrevious(current, previous)` : remplace stub TA-83 (e1RM Epley pondéré, ratio current/previous, normalisé 0..1 via fenêtre 0.7..1.1).
- `src/features/progression/domain/progression-vs-previous.test.ts` — 16 tests (no history, stable, progression, regression, multi-exercices, edge cases).

**Fichiers modifiés** :
- `src/services/session-scores.ts` — `computeSessionScores` accepte un 4ᵉ argument optionnel `progressionVsPrevious` (default 0.5). Stub TA-83 supprimé du commentaire interne.
- `src/services/session-scores.test.ts` — 2 tests pour le nouveau param (override 1.0, override 0).
- `app/(app)/session/end.tsx` — appelle `runRulesEngine` après `completeSession`, try/catch tolérant pour ne pas bloquer la nav offline.
- `src/features/progression/index.ts` — export `runRulesEngine`, `RulesEngineResult`, `RunRulesEngineOptions`, `computeProgressionVsPrevious`.
- `eslint.config.mjs` — ajout `feature-api → feature-domain` (même feature) suite à pitfall ARCH-03.
- `docs/decisions.md` — ADR-020 (idempotence par clear+recreate, no-regression sur block.status).
- `docs/pitfalls.md` — ARCH-03.

**Persistance** :
- 1 `Recommendation` `load_change` par exercice planifié (source `rules_engine`, action mappée depuis `ExercisePlan.decision`).
- 1 `Recommendation` `plateau` par exercice détecté en plateau (action `replace` si 6+ séances, sinon `maintain`).
- 1 `Recommendation` `deload` niveau séance si déclenché (`exerciseId = null`, action `deload`).
- `session.completion_score`/`performance_score`/`fatigue_score` mis à jour avec valeurs réelles (composite TA-105 pour fatigue, override du legacy readiness-only).
- `block.status active → deloaded` si deload déclenché (ADR-011) — idempotent : pas de mutation si déjà `deloaded`/`completed`/`planned`.

**Idempotence** : `clearRecommendationsForSession` au début de chaque run, puis recreate. Re-run produit le même état sémantique (même nombre de recos, mêmes types/exercises/actions/charges). IDs UUID différents mais identité repose sur `(session_id, exercise_id, type)`.

**progressionVsPrevious** : ratio e1RM moyen pondéré (Epley) par exercice partagé entre séance courante et séance précédente (la plus récente complétée du même user). Plage 0..1 via mapping linéaire 0.7..1.1 → 0..1. Returns 0.5 si pas d'historique exploitable.

**S'appuie sur** : TA-103 (CRUD Recommendation), TA-104 à TA-108 (domain pur), TA-72 (CRUD Session/SetLog), ADR-011 (block.status `deloaded`).

**Ouvre** : Phase 6 (sync Supabase) peut maintenant exploiter le contenu de `recommendations` côté serveur. Phase 7 (IA) peut résumer les `Recommendation` du moteur en langage naturel. UI post-séance peut afficher `RulesEngineResult.sessionPlan` pour annoncer les charges de la prochaine séance.

**Tests** : 13 tests d'intégration TA-109 + 16 tests progression-vs-previous + 524 total suite, 100 % verts. TypeScript 0 erreur. ESLint boundaries 0 erreur (sur features/).

**R6** : `rules-engine-service.ts` à 351 lignes (entre 250 et 400) — orchestration séquentielle linéaire, splittable mais non requis. Helpers purs déjà extraits dans `rules-engine-helpers.ts` (133 lignes). Fonction principale `runRulesEngine` reste lisible top-to-bottom.

**Stubs laissés** :
- Pas d'historique `ProgressionDecision` persisté entre séances (param `progressionHistoryByExercise` toujours `{}`). À ajouter quand on stockera les décisions du moteur.
- `attendanceRate` non calculé pour le deload (PROG-02 — pas de planning vs réalisé). Condition 3 du fatigue_triggered inactivable.
- RecoveryLog/CardioSession non disponibles → tableaux vides à `computeFatigueScore` (pitfall PROG-02 inchangé).

---

## TA-110 — Remplacement du stub `progressionVsPrevious = 0.5` dans session-scores
**Livré** : le stub `progressionVsPrevious: number = 0.5` de `computeSessionScores` remplacé par un calcul réel basé sur les SetLogs de la séance précédente. La signature passe de `progressionVsPrevious: number = 0.5` à `previousSetLogs: SetLog[] | null = null`. La logique e1RM Epley (`load * (1 + reps / 30)`) est inline dans `session-scores.ts` (2 fonctions privées + `computeProgressionVsPrevious` privée), car les `shared-services` ne peuvent pas importer depuis `feature-index` selon les règles ESLint boundaries.

**Fichiers modifiés** :
- `src/services/session-scores.ts` — nouvelle signature + logique inline `computeProgressionVsPrevious` privée (16 lignes). 4 nouveaux tests sur la composante progression.
- `src/services/session-scores.test.ts` — bloc `progressionVsPrevious parameter` remplacé par `previousSetLogs — progressionVsPrevious computation` (4 tests : null/neutre, +5%, -10% sévère, 0 exercice commun).
- `src/features/progression/api/rules-engine-service.ts` — suppression de l'import `computeProgressionVsPrevious` + passage de `previousMostRecentSetLogs` directement à `computeSessionScores` (la valeur était déjà chargée).

**Note architecture** : la fonction `computeProgressionVsPrevious` reste dans `src/features/progression/domain/progression-vs-previous.ts` comme source de vérité pour les tests unitaires détaillés (16 tests). La copie dans `session-scores.ts` est intentionnelle — l'isolation ESLint boundaries (shared-services → feature-index interdit) justifie la duplication des 2 fonctions utilitaires e1RM (3 lignes chacune).

**S'appuie sur** : TA-109 (`rules-engine-service.ts`, `progression-vs-previous.ts`), TA-83 (stub initial).

**Ouvre** : le calcul de performance post-séance est maintenant complet end-to-end. `session-store.completeSession` produit un score neutre (pas d'historique → 0.5), puis `runRulesEngine` recalcule avec l'historique réel.

**Bugs découverts** : aucun.

**Stubs laissés** : aucun. L'entrée stub TA-83 de `docs/story-log.md` est clôturée.

---

## TA-111 — Écran Aujourd'hui : consommation des vraies recommandations
**Livré** : feature `src/features/today/` complète avec api, hook, composants et index. Route `app/(app)/index.tsx` réduite à 3 lignes (re-export thin, R1). Badge `SessionStatusBadge` étendu à 6 statuts (`progression`, `maintien`, `allegee`, `deload`, `prudente`, `aggressive`). Nouveau type `DisplaySessionStatus` exporté depuis `@/components/ui`.

**Fichiers créés** :
- `src/features/today/api/get-today-recommendations.ts` — query SQLite : charge la dernière session complétée, extrait les 4 types de Recommendation
- `src/features/today/api/get-today-recommendations.test.ts` — 7 tests (vide, metadata, fallback fatigueScore, mapping 0-3/4-6/7-8/9-10)
- `src/features/today/hooks/use-today-recommendations.ts` — hook TanStack Query wrappant l'API
- `src/features/today/types/today-recommendations.ts` — `TodaySessionStatus` + `TodayRecommendations` (redéfinit l'union localement pour éviter l'import shared-components depuis feature-types — pitfall ARCH-04)
- `src/features/today/components/today-screen.tsx` — orchestrateur (213 lignes, sous R6)
- `src/features/today/components/workout-card.tsx` — card séance avec charges cibles par exercice
- `src/features/today/components/exercise-load-row.tsx` — ligne compacte "Exercice → NNkg [+/-]"
- `src/features/today/components/fatigue-card.tsx` — card si fatigueScore >= 4
- `src/features/today/components/plateau-card.tsx` — card compacte si exercice(s) en plateau
- `src/features/today/components/deload-card.tsx` — card proéminente deload
- `src/features/today/components/mini-summary.tsx` — résumé derniere séance + streak
- `src/features/today/components/rest-day-card.tsx` — card jour de repos
- `src/features/today/components/no-program-card.tsx` — card sans programme
- `src/features/today/index.ts` — public API R3

**Fichiers modifiés** :
- `app/(app)/index.tsx` — route thin (3 lignes)
- `src/components/ui/session-status-badge.tsx` — 6 statuts + `DisplaySessionStatus` exporté + `status: null` accepté (affiche `maintien`)
- `src/components/ui/index.ts` — export `DisplaySessionStatus`
- `src/hooks/use-today-workout.ts` — suppression du stub `computeSessionStatus`, utilise `DisplaySessionStatus` directement
- `src/screens/(app)/home-screen.test.tsx` — mock ajouté pour `useTodayRecommendations`

**Stratégie sessionStatus** : la Recommendation `load_change` persiste `metadata.sessionStatus` (string) lors du run rules engine (TA-109). L'UI lit ce champ en priorité. Fallback : `fatigueScore` de la session → mapping 0-3=progression, 4-6=maintien, 7-8=allegee, 9-10=deload.

**S'appuie sur** : TA-109 (persistance des Recommendation avec metadata.sessionStatus), TA-103 (getRecommendationsBySession), TA-98 (architecture Bulletproof React).

**Ouvre** : Phase 7 (IA) peut enrichir les Recommendation avec des messages naturels affichables dans les cards. La card deload affiche déjà le message brut du moteur.

**Bugs découverts** : aucun.

**Stubs laissés** :
- Le stub `computeSessionStatus` dans `src/utils/session-status.ts` est conservé (fichier existant, non supprimé) — plus utilisé dans le flow principal, peut être supprimé en cleanup Phase 6.
- La card deload affiche le message brut du moteur (ex: "Deload recommandé (fatigue_triggered) : ...") — formulation à polir en Phase 7 IA.

---

## TA-112 — Écran fin de séance : affichage des recommandations moteur
**Livré** : la page `end.tsx` affiche maintenant la section "Prochaine séance" après complétion, avec les recommandations du moteur de règles. State machine `idle → completing → completed` en React local. `reset()` + navigation vers home déplacés dans un bouton "Retour à l'accueil" explicite (n'est plus appelé dans `doFinish`).

**Fichiers créés** :
- `src/features/session/components/end-session-screen.tsx` — composant principal `EndSessionScreen` (315 lignes), state machine, orchestration.
- `src/features/session/components/session-recommendations.tsx` — section "Prochaine séance" : badge statut, liste load_change, cards plateau, section deload, loading state (282 lignes).
- `src/features/session/components/session-score-ring.tsx` — `ScoreRing`, `AchievementDot`, `StatPill`, `formatDuration` extraits de l'ancien `end.tsx` pour respecter R6.
- `src/features/session/hooks/use-session-recommendations.ts` — hook React Query `useSessionRecommendations(sessionId)`, staleTime Infinity.

**Fichiers modifiés** :
- `app/(app)/session/end.tsx` — réduit à 3 lignes (import + re-export thin, R1). Était un god-object de 397 lignes.
- `src/features/session/index.ts` — export `EndSessionScreen` + `useSessionRecommendations`.

**Flow** : 1. "Terminer" → `completing` (spinner "Calcul en cours…") → `runRulesEngine` → `completed`. 2. Section "Prochaine séance" révélée : badge statut, lignes `exercice Xkg → Ykg [↑/→/↓]`, cards plateau amber, section deload rouge. 3. Bouton "Retour à l'accueil" → `reset()` + `router.replace`. Le champ notes est masqué après complétion.

**Gestion de la liste load_change** : max 5 visible, "Voir plus (N exercices)" si plus. Noms d'exercice résolus via `exercisesById` (déjà chargé par `useSessionExercises`), fallback sur `metadata.exerciseName` puis `exerciseId`.

**S'appuie sur** : TA-109 (`runRulesEngine`, `RulesEngineResult`), TA-111 (patterns de composants recommandations), TA-83 (état initial de `end.tsx`), TA-98 (architecture Bulletproof React).

**Ouvre** : Phase 7 (IA) peut enrichir les messages des `Recommendation` pour les afficher dans les cards plateau/deload. `useSessionRecommendations` est disponible pour d'autres écrans.

**Bugs découverts** : aucun.

**Stubs laissés** :
- `metadata.currentLoad` non persisté par le rules engine (toujours `null` dans la row affichée) — les lignes affichent `—kg → Xkg`. À corriger quand le rules engine persistera la charge courante dans les métadonnées.

---

## TA-113 — Fiche détail exercice depuis workout-day-detail-screen
**Livré** : stub `handleExercisePress` dans `workout-day-detail-screen.tsx` branché sur la vraie navigation `/(app)/exercise/[id]`. L'écran `ExerciseDetailScreen` enrichi avec section Historique (5 dernières séances, meilleur set par session) et badges de recommandation (progression ↑↔↓, plateau rouge discret si < 14 jours).

**Fichiers créés** :
- `src/features/exercise/api/exercise-history.ts` — `getExerciseHistory`, `getLatestLoadRecommendation`, `getLatestPlateauRecommendation` (SQLite, lecture seule)
- `src/features/exercise/api/exercise-history.test.ts` — 10 tests, 100% verts
- `src/features/exercise/types/exercise-history.ts` — type `ExerciseSessionHistory` (dans `types/` pour respecter boundaries : `feature-components` ne peut pas importer `feature-api`)
- `src/features/exercise/hooks/use-exercise-history.ts` — hook TanStack Query (`staleTime: 30s`), charge history + 2 recommendations en parallèle
- `src/features/exercise/components/exercise-history-section.tsx` — section historique avec état vide "Pas encore logué"
- `src/features/exercise/components/exercise-recommendation-badges.tsx` — badge progression (action → icône ↑↔↓) + badge plateau (fenêtre 14 jours)
- `src/features/exercise/index.ts` — public API R3

**Fichiers modifiés** :
- `src/screens/(app)/exercise-detail-screen.tsx` — +1 hook `useExerciseHistory`, +badges dans l'en-tête, +section Historique (257 lignes, signal d'alerte justifié : orchestration de 3 hooks)
- `src/screens/(app)/programs/workout-day-detail-screen.tsx` — `handleExercisePress` branché sur `router.push` vers `/(app)/exercise/[id]`
- `docs/pitfalls.md` — stub `handleExercisePress` supprimé, ARCH-05 ajouté

**Route** : `app/(app)/exercise/[id].tsx` existait déjà (Phase 2, TA-12, 7 lignes — R1 ok). Non modifiée.

**S'appuie sur** : TA-12 (`ExerciseDetailScreen` Phase 2, route existante), TA-103 (table `recommendations` SQLite + types), TA-112 (pattern badges de recommandation dans end-session-screen)

**Ouvre** : les badges de recommandation utilisent `createdAt` de la Recommendation — quand `currentLoad` sera persisté (stub UX-01), les lignes `Xkg → Ykg` de l'écran fin de séance seront aussi utilisables ici. La fiche exercice pourrait afficher un graphe e1RM (Phase 7 IA).

**Bugs découverts** : aucun.

**Stubs laissés** : aucun nouveau.

---

## TA-115 — Fix header 'index' et back button fantôme post-séance
**Livré** : suppression du header par défaut (titre 'index') sur l'écran Aujourd'hui et du back button fantôme qui apparaissait après une séance terminée. Fix en une ligne : déclaration explicite de `Stack.Screen name="index"` avec `headerShown: false` dans `app/(app)/_layout.tsx`.

**Fichiers modifiés** :
- `app/(app)/_layout.tsx` — ajout de `<Stack.Screen name="index" options={{ headerShown: false }} />`

**S'appuie sur** : structure de navigation Expo Router déjà en place (groupe `(app)`). Toutes les navigations retour vers home utilisaient déjà `router.replace()` — aucun changement nécessaire côté appels de navigation.

**Ouvre** : TA-116 (tab bar) qui remplacera ce header désactivé par une navigation par onglets.

**Bugs découverts** : comportement Expo Router documenté dans pitfalls NAV-01 : screen non déclaré dans le Stack → titre = nom de fichier + back button potentiel.

**Stubs laissés** : aucun.

---

## TA-114 — Tests d'intégration moteur de progression end-to-end
**Livré** : 6 tests E2E qui valident la chaîne complète "séance loggée → runRulesEngine → recommandations persistées → SessionPlan correct" sur base SQLite in-memory. Helpers partagés extraits pour éviter la duplication avec les tests TA-109.

**Fichiers créés** :
- `src/features/progression/api/__tests__/rules-engine-integration.test.ts` — 6 tests E2E TA-114 (356 lignes)
- `src/features/progression/api/rules-engine-in-memory-db.ts` — mock SQLite in-memory (297 lignes), extrait depuis `rules-engine-service.test.ts` pour partage
- `src/features/progression/api/rules-engine-test-helpers.ts` — factory functions partagées : `makeSession`, `makeSetLog`, `makeBlock`, etc. (140 lignes)

**Fichiers modifiés** :
- `src/features/progression/api/rules-engine-service.test.ts` — refactorisé pour utiliser les helpers partagés (728 → 356 lignes), sémantique des 13 tests TA-109 préservée
- `eslint.config.mjs` — ARCH-06 : autorisation `feature-api → feature-api` intra-feature (même featureName capturé), pour permettre aux helpers d'être importés dans les tests du même module
- `docs/pitfalls.md` — ARCH-06 documenté
- `docs/decisions.md` — ADR-021 : helpers test hors `__tests__/` (jest-expo collecterait tout `__tests__/**` comme tests)

**Scénarios couverts** :
1. `strength_fixed` — 3 séances RIR ≥ 2 → `increase`, `next_load = charge + increment`
2. `fatigueScore ≥ 7` → statut `allegee`, charges -10%
3. Plateau — 3 séances identiques (charge + reps stables, RIR ≥ 2, fatigue < 6) → Recommendation type `plateau`
4. Deload `fatigue_triggered` — 2+ sessions consécutives fatigueScore ≥ 9 → type `deload`, `block.status = deloaded`
5. Deload `scheduled` — `deload_strategy = scheduled`, semaine ≥ 5 → deload indépendamment du fatigue
6. Première séance sans historique → recommandations de maintien, aucune erreur

**Note architecture** : helpers `rules-engine-test-helpers.ts` et `rules-engine-in-memory-db.ts` placés dans `api/` (pas `__tests__/`) pour éviter qu'ils soient collectés comme tests par jest-expo. Détail dans ADR-021.

**S'appuie sur** : TA-109 (`runRulesEngine`, `rules-engine-service.ts`), TA-103 (types `SetLog`, `Session`, `Block`, `Recommendation`), TA-104 à TA-108 (domain pur).

**Ouvre** : la suite de tests E2E peut être étendue pour les scénarios Phase 6 (sync Supabase) ou Phase 7 (IA) sans recréer l'infrastructure in-memory.

**Bugs découverts** : aucun.

**Stubs laissés** : aucun.

---

## TA-116 — Tab bar navigation (4 onglets : Aujourd'hui, Programme, Bibliothèque, Profil)
**Livré** : navigation par onglets avec groupe `(tabs)` imbriqué dans le Stack `(app)`. 4 onglets, tab bar sombre cohérente, tab active en bleu accent, sessions et modals restent dans le Stack parent sans tab bar.

**Fichiers créés** :
- `app/(app)/(tabs)/_layout.tsx` — layout Tabs (4 screens, icônes emoji Unicode, couleurs dark)
- `app/(app)/(tabs)/index.tsx` — re-export TodayScreen (déplacé depuis `/(app)/index.tsx`)
- `app/(app)/(tabs)/program.tsx` — re-export ProgramTabScreen
- `app/(app)/(tabs)/library.tsx` — re-export LibraryScreen depuis `src/screens/`
- `app/(app)/(tabs)/profile.tsx` — re-export ProfileScreen depuis `src/screens/`
- `src/features/program/components/program-tab-screen.tsx` — wrapper Programme : loading state + no-program state + ActiveBlockScreen
- `src/features/program/index.ts` — public API R3 de la feature program
- `src/screens/(app)/profile-screen.tsx` — ProfileScreen extrait de l'ancienne route `/(app)/profile.tsx`

**Fichiers modifiés** :
- `app/(app)/_layout.tsx` — Stack `(app)` : `name="index"` remplacé par `name="(tabs)"`, headerShown false
- `app/index.tsx` — `Redirect href="/(app)"` → `"/(app)/(tabs)"`
- `app/_layout.tsx` — AuthGuard : `router.replace('/(app)')` → `'/(app)/(tabs)'`
- `app/(app)/design-system.tsx` — `Redirect href="/(app)"` → `"/(app)/(tabs)"`
- `src/features/session/components/end-session-screen.tsx` — `router.replace('/(app)')` → `'/(app)/(tabs)'` (2 occurrences)
- `src/features/session/components/live-session-screen.tsx` — `router.replace('/(app)')` → `'/(app)/(tabs)'`
- `src/screens/(app)/generate/step-8-summary-screen.tsx` — `router.replace('/(app)')` → `'/(app)/(tabs)'`
- `src/screens/(app)/home-screen.test.tsx` — import mis à jour vers `app/(app)/(tabs)/index`
- `eslint.config.mjs` — ajout `feature-components → shared-screens` (migration vers features en cours)

**Fichiers supprimés** :
- `app/(app)/index.tsx` — déplacé dans `(tabs)/`
- `app/(app)/library.tsx` — déplacé dans `(tabs)/`
- `app/(app)/profile.tsx` — déplacé dans `(tabs)/`

**S'appuie sur** : TA-115 (structure Stack `(app)` fonctionnelle), architecture Bulletproof React (TA-97), `ActiveBlockScreen` dans `src/screens/(app)/programs/` (non migré).

**Ouvre** : les onglets sont en place — les futures features pourront y ajouter des écrans. `ProgramTabScreen` peut accueillir une migration complète de `ActiveBlockScreen` vers `src/features/program/components/`.

**Bugs découverts** : Expo Router génère des types stricts par structure de fichiers — toutes les navigations vers `/(app)` (route racine désormais remplacée par `(tabs)`) déclenchaient des erreurs TS. Correction systématique vers `/(app)/(tabs)`.

**Stubs laissés** : icônes tab bar en emoji Unicode (approche cohérente avec le reste du projet qui n'a pas `@expo/vector-icons`). À remplacer par des icônes SVG si la lib est installée plus tard.

---

## TA-84 — Abandon explicite, reprise automatique et tests d'intégration offline
**Livré** : abandon de séance (action dans `live.tsx`), reprise automatique (`start.tsx` redirige vers `live` si session en cours), tests d'intégration offline complets.  
**S'appuie sur** : `session-store`, `sessions` service, `start.tsx`, `live.tsx`, `end.tsx`.  
**Ouvre** : le flow session est complet. Phase 5 = progression cross-session + sync Supabase.  
**Bugs découverts post-livraison** :
- `crypto.randomUUID()` non disponible sur Hermes → remplacé par `generateUUID()` (voir pitfalls RN-01)
- `handleStartSession` dans `active-block-screen` et `workout-day-detail-screen` restait un stub `Alert.alert` non branché (voir pitfalls RN-03)

**Stubs laissés** : `handleExercisePress` dans `workout-day-detail-screen.tsx` (détail exercice, Phase 5).
