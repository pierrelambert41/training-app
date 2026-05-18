# Architecture Decision Records (ADR)

## ADR-001 : React Native + Expo comme plateforme principale

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
Le produit est principalement utilisé en salle, sur mobile. Il faut une UX native, un seul codebase, et une vitesse de développement élevée.

### Décision
React Native + Expo + TypeScript comme stack mobile unique. Pas de web app comme produit principal.

### Alternatives rejetées
- **Web app (Next.js)** : usage en salle trop dégradé, pas d'accès natif
- **Natif pur (Swift + Kotlin)** : deux codebases, vélocité réduite
- **Flutter** : écosystème moins mature pour les intégrations santé iOS

### Conséquences
- Un seul codebase pour iOS et Android
- Accès aux APIs natives via Expo modules
- Apple Watch reportée (nécessiterait du Swift natif)

---

## ADR-002 : Offline-first avec SQLite local

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
L'app est utilisée en salle où la connectivité est souvent mauvaise. Le logging de séance ne doit jamais échouer à cause du réseau.

### Décision
Toutes les données de séance sont d'abord stockées en SQLite local (expo-sqlite), puis synchronisées vers Supabase au retour réseau.

### Alternatives rejetées
- **Online-only** : inacceptable pour l'usage en salle
- **Cache TanStack Query seul** : pas assez robuste pour un vrai offline-first
- **WatermelonDB** : plus complexe que nécessaire au démarrage, envisageable si les besoins évoluent

### Conséquences
- Double source de données à gérer (locale + serveur)
- Logique de sync à implémenter et tester
- Gestion de conflits nécessaire
- L'IA et les features nécessitant le réseau sont découplées du logging

---

## ADR-003 : Supabase comme backend

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
Besoin d'aller vite avec auth, database, storage. Petite équipe (1 dev + Claude Code).

### Décision
Supabase (Auth + Postgres + Storage + Edge Functions) comme backend principal.

### Alternatives rejetées
- **Firebase** : Firestore moins adapté que Postgres pour les requêtes relationnelles complexes
- **Custom API (Express/Fastify)** : plus de travail d'infra pour le même résultat
- **PlanetScale** : pas d'auth intégrée, plus de plomberie

### Conséquences
- Auth prête rapidement
- Postgres avec RLS pour la sécurité
- Edge Functions pour la logique métier serveur
- Dépendance à Supabase (acceptable, Postgres est portable)

---

## ADR-004 : Moteur rules-based pour les charges, IA pour l'interprétation

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
L'IA est bonne pour expliquer mais mauvaise pour calculer des charges de façon fiable et répétable. Les décisions de progression doivent être déterministes.

### Décision
Architecture 3 couches : calculs (backend) → règles métier (déterministes) → IA (interprétation). L'IA ne décide jamais des charges.

### Conséquences
- Progression fiable et explicable
- L'app fonctionne sans IA (fallback)
- L'IA ajoute de la valeur sans risquer des recommandations aberrantes
- Les règles sont testables unitairement

---

## ADR-005 : Programmes générés, pas créés librement

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
La philosophie est "système coaché". L'utilisateur ne doit pas construire sa méthode librement, ce qui mène souvent à des programmes mal équilibrés.

### Décision
L'app génère les programmes à partir d'un questionnaire (objectif, fréquence, niveau, matériel, contraintes). Pas de création libre au MVP.

### Conséquences
- Besoin d'un moteur de génération de programmes (templates + logique)
- Les programmes sont toujours cohérents et bien structurés
- L'utilisateur a moins de contrôle mais plus de guidance
- Le dataset de templates d'exercices doit être solide dès le départ

---

## ADR-006 : Règles de progression par type, pas par exercice

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
Coder des règles pour chaque exercice ne scale pas. Les logiques de progression sont similaires par famille (force, volume, accessoires).

### Décision
6 types de progression prédéfinis (`strength_fixed`, `double_progression`, `accessory_linear`, `bodyweight_progression`, `duration_progression`, `distance_duration`). Chaque exercice planifié a un `progressionType` et un `progressionConfig` (JSON paramétrable).

### Conséquences
- Scalable : ajouter un exercice ne nécessite pas de nouvelle règle
- Testable : 6 types à tester exhaustivement
- Configurable : les paramètres (increment, seuils) sont ajustables sans changer le code

---

## ADR-008 : AppText plutôt que Text de React Native

**Statut** : Accepté
**Date** : 2026-04-23

### Contexte
Le composant `Text` de React Native crée une collision de nom avec les imports RN dans les fichiers qui utilisent aussi le design system. Le design system a besoin de variantes typographiques prédéfinies (heading, body, caption) appliquant les tokens NativeWind.

### Décision
Le composant de texte du design system s'appelle `AppText` et encapsule `Text` de RN. Il expose une prop `variant` et une prop `muted`.

### Conséquences
- Aucune collision de nom lors des imports mixtes RN + DS
- Les tokens typographiques sont centralisés dans `AppText`
- Les cas où une classe Tailwind ad-hoc est nécessaire (liens, boutons inline) peuvent encore utiliser `Text` de RN directement

---

## ADR-009 : Favoris sans user_id en Phase 2

**Statut** : Accepté
**Date** : 2026-04-23

### Contexte
La spec TA-15 précise que le statut favori est "spécifique à l'utilisateur". La Phase 2 est single-user local (pas de multi-compte avant Phase 6 — sync Supabase). La table `exercise_favorites` ne contient pas de `user_id`.

### Décision
Pas de `user_id` sur `exercise_favorites` en Phase 2. La migration sera ajoutée en Phase 6 au moment du sync, quand l'identité utilisateur sera disponible côté serveur.

### Conséquence
En Phase 6, une migration breaking devra ajouter `user_id NOT NULL` avec une valeur par défaut pour les lignes existantes (l'utilisateur local sera connu à ce stade).

---

## ADR-010 : Favoris via TanStack Query + SQLite, pas Zustand

**Statut** : Accepté
**Date** : 2026-04-23

### Contexte
CLAUDE.md liste Zustand pour le state global. Les favoris sont une donnée persistée en SQLite, pas un état UI éphémère.

### Décision
SQLite est la source de vérité pour les favoris. TanStack Query gère le cache et l'invalidation (`invalidateQueries`). Zustand n'est pas utilisé pour les favoris — il est réservé à l'état UI non-persisté (ex: état du logger de séance en cours).

### Conséquence
Ce pattern s'applique à toute donnée lue depuis SQLite : TanStack Query suffit, pas besoin de doubler avec Zustand.

---

## ADR-011 : Statut de bloc `deloaded` distinct de `active`

**Statut** : Accepté
**Date** : 2026-04-24

### Contexte
`docs/business-rules.md §3.4` décrit le deload comme un état transitoire d'un bloc actif (charges -30/40 %, volume réduit, 1 semaine). Le schéma initial ne distinguait pas un bloc `active` en deload d'un bloc `active` normal. Le moteur de statut de séance (Phase 5) a besoin de cette distinction pour appliquer les règles de deload sans lire toute la fatigue history.

### Décision
`block.status` accepte 4 valeurs : `planned | active | deloaded | completed`. `deloaded` est un état transitoire explicite : quand le moteur déclenche un deload (auto ou manuel), il bascule le bloc de `active` → `deloaded` le temps de la semaine, puis revient à `active`. `completed` reste réservé à la fin effective du bloc.

### Conséquence
- Migration Supabase additive (`ALTER TABLE ... DROP/ADD CONSTRAINT`) — safe en Phase 3 (pas de rows en prod).
- Le type TS `BlockStatus` inclut `deloaded`.
- Le moteur de Phase 5 lit `status === 'deloaded'` plutôt que de recalculer la fatigue à chaque lecture.
- Le ticket TA-19 (Phase 3) valide cet invariant dès la création des entités.

---

## ADR-012 : Config SyncQueue par repository — payload snake_case Supabase

**Statut** : Accepté
**Date** : 2026-04-24

### Contexte
TA-19 introduit 4 nouvelles entités synchronisables (Program/Block/WorkoutDay/PlannedExercise). Le pattern existant pour `exercises` (TA-17) enrichit `insert`/`update`/`delete` avec un appel `enqueueSyncRecord`. La question est : quel format de payload mettre dans la queue ?

### Décision
Chaque repository publie un payload **snake_case conforme au schéma Supabase** (pas au schéma SQLite local). Règles :
- Booléens → `true`/`false` (pas `0`/`1`).
- Arrays → JS arrays (pas JSON string).
- Objects (ex: `progression_config`) → objects JS (jsonb-ready côté serveur).
- L'échec de `enqueueSyncRecord` ne doit **jamais** rollback l'écriture locale : `try/catch` + log, l'op sera retentée par le sync engine (Phase 6).
- Action `delete` → payload minimal `{ id }` (le serveur n'a besoin que de la clé).

### Conséquence
- Le sync engine (Phase 6) peut `POST` le payload tel quel sans transformation.
- La divergence SQLite/Supabase (booleans, JSON) est confinée aux mappers de chaque repository.
- Idempotence : rejouer une op `insert` produira un conflit sur la PK → géré par `upsert` ou conflict resolution en Phase 6.

---

## ADR-013 : Moteur de génération purement déterministe, résultat in-memory

**Statut** : Accepté
**Date** : 2026-04-24

### Contexte
TA-21 introduit la fonction `generateProgram(input)`. Deux questions ont dû être arbitrées :
1. L'IA intervient-elle dans la génération ?
2. Le résultat est-il persisté immédiatement ou reste-t-il un draft que l'utilisateur valide ?

### Décision
1. **Zéro appel IA** dans le moteur de génération (conforme ADR-004, ADR-007 fallback). Toute la logique vit dans `src/services/program-generation.ts` sous forme de fonctions pures. Tri stable par id pour garantir la reproductibilité d'une même entrée.
2. **Résultat in-memory** (`GenerationResult` dans `GenerationState.result`), non persisté. La conversion `GenerationResult` → `insertProgram/insertBlock/insertWorkoutDay/insertPlannedExercise` arrive au moment où l'utilisateur confirme ("Save"). Les IDs UUID sont générés dès la génération et réutilisés tels quels au save, garantissant que le draft et la version persistée partagent les mêmes clés.
3. Catalogue filtré par équipement avec un mapping explicite `full_gym > home > minimal`. Les blessures sont traduites en `forbiddenMuscles` / `forbiddenMorphoTags` (pattern simple par regex FR). Les exercices avec `axial_fatigue_high` sont exclus dès qu'une douleur lombaire ou épaule est signalée — conservateur.
4. **Calibration** : `null` si pas d'historique récent (< 8 semaines sur l'exercice). Pas de valeur hardcodée. Epley avec recency weighting linéaire, puis -5% prudence, arrondi 0.5 kg.

### Conséquences
- Le moteur est entièrement testable sans infra (pas de SQLite, pas de Supabase).
- Le résultat peut être re-généré tant que l'utilisateur n'a pas validé : réouvrir le questionnaire et cliquer Générer produit un nouveau draft.
- Les warnings remontés dans `GenerationResult.warnings` sont exploitables par l'UI (catalogue trop restreint, slot manquant, sport non reconnu) sans bloquer la génération.
- Le pattern "draft en mémoire + save transactionnel" s'applique aussi à la future régénération de bloc (docs §9).

---

## ADR-014 : Templates de progression centralisés et scaling par niveau

**Statut** : Accepté
**Date** : 2026-04-24

### Contexte
TA-22 introduit `assignProgressionConfig(exercise, blockGoal, userLevel, role, repRange?)` — la fonction qui résout `progressionType` + `progressionConfig` à la création de chaque `PlannedExercise`. Avant, le moteur de génération embarquait des constantes inline dans `program-generation.ts` (un seul jeu de valeurs, indifférent au niveau). Question : où vivent les défauts ? comment varient-ils par niveau ?

### Décision
1. **Fichier unique** `src/constants/progression-defaults.ts` pour tous les défauts par type × niveau. Toute autre couche (UI override, régénération de bloc, recommandations IA) lit ces constantes — pas de duplication.
2. **Scaling par niveau** :
   - `beginner` : incréments agressifs (lower 5 kg, upper 2.5 kg) — progression linéaire rapide.
   - `intermediate` : valeurs canoniques de `business-rules.md §2` — référence.
   - `advanced` : incréments fins (lower 1.25 kg, upper 0.5 kg) + `failures_before_reset` augmenté (3 vs 2) — plus de tolérance à l'échec car les charges sont relativement plus proches du 1RM réel.
3. **Résolution du `progressionType`** : `Exercise.recommendedProgressionType` reste prioritaire (le catalogue est l'ontologie). Fallback déterministe par `logType` puis `category` puis `role + blockGoal`. Pas de heuristique stochastique.
4. **Fonction pure** : `assignProgressionConfig` ne lit aucune DB, ne dépend d'aucun temps. Testable en isolation, réutilisable au moment de la régénération de bloc, du dégradage manuel d'un exercice, ou du recalcul lors d'un changement de niveau utilisateur.

### Conséquences
- Le moteur de génération (TA-21) ne contient plus de constantes de progression — il délègue à `assignProgressionConfig`.
- Ajuster une progression (ex : `increment_kg` plus fin pour avancé) = modifier `progression-defaults.ts`, sans toucher au moteur.
- Tout futur "override manuel" se branchera après l'appel à `assignProgressionConfig` (priorité : override > recommended > fallback).
- Le moteur de progression (Phase 5, futur ticket) lit le `progressionConfig` tel qu'il a été assigné — pas de logique de scaling au runtime.

---

## ADR-015 : device_id local stocké en SQLite (table `app_meta`)

**Statut** : Accepté
**Date** : 2026-04-25

### Contexte
TA-72 (Phase 4) introduit `Session.device_id`, identifiant stable de l'appareil ayant créé la séance, utilisé pour le conflict resolution lors de la sync (Phase 6 — last-write-wins par `updated_at` + `device_id` comme tie-breaker). Il faut un endroit pour persister ce `device_id` localement.

### Décision
Le `device_id` (UUID v4) est stocké dans une table SQLite locale `app_meta(key TEXT PK, value TEXT)`. Helper unique : `getOrCreateDeviceId(db)` — idempotent, génère un UUID au premier appel et retourne le même ensuite. Pas d'usage d'AsyncStorage.

### Alternatives rejetées
- **AsyncStorage** : déjà utilisé pour la session Supabase Auth ; on évite de doubler les emplacements de persistance pour des données critiques de la couche data.
- **`Constants.installationId`** (expo-constants) : deprecated dans expo SDK 54.
- **`expo-application` `getAndroidId()` / `getIosIdForVendorAsync()`** : nouvelle dépendance pour un besoin couvert en 5 lignes de DDL.

### Conséquence
- Le `device_id` survit aux redémarrages de l'app et aux mises à jour, mais est régénéré si la DB locale est réinitialisée (réinstallation) — sémantiquement, c'est un nouvel appareil.
- Le pattern `app_meta` est extensible : tout futur scalaire singleton applicatif (ex: `last_sync_at`, `prompt_cache_version`) peut le réutiliser sans nouvelle migration.
- `INSERT OR IGNORE` + re-read protègent contre les races éventuelles.

---

## ADR-016 : Exercice non-prévu en séance — colonne `is_unplanned` sur `planned_exercises`

**Statut** : Accepté
**Date** : 2026-04-25

### Contexte
TA-80 introduit l'ajout à la volée d'exercices non-prévus pendant une séance live. Ces exercices sont représentés comme des `PlannedExercise` virtuels insérés localement. La spec proposait deux options : `is_unplanned BOOLEAN DEFAULT 0` (nouvelle colonne) ou `notes = 'ajouté en séance'` (marqueur dans un champ texte existant).

### Décision
Colonne `is_unplanned INTEGER NOT NULL DEFAULT 0` sur `planned_exercises` (migration v7, `ALTER TABLE ADD COLUMN`). Migration additive, 0 downtime, toutes les lignes existantes restent valides (DEFAULT 0).

### Alternatives rejetées
- **notes = 'ajouté en séance'** : couplage sémantique fragile sur un champ texte libre, impossible à indexer ou filtrer proprement, et `notes` peut légitimement être rempli sur un exercice planifié normal.

### Conséquences
- Le type `PlannedExercise` expose `isUnplanned: boolean`.
- `addUnplannedExercise(db, exercise)` persiste en SQLite (fire-and-forget) + enqueue sync — même pattern que `logSet`.
- Les `PlannedExercise` avec `is_unplanned = 1` ne doivent pas modifier le `WorkoutDay` d'origine (invariant vérifié dans le store).
- Phase 6 (sync Supabase) : le payload inclut `is_unplanned: boolean` — Supabase doit avoir cette colonne.

---

## ADR-017 : eslint-plugin-boundaries pour enforcer l'architecture Bulletproof React

**Statut** : Accepté
**Date** : 2026-04-25

### Contexte
`app/(app)/session/live.tsx` a atteint 2001 lignes et 14 composants colocalisés — violation flagrante de R1, R3, R6. On adopte Bulletproof React comme architecture frontend cible (docs/architecture.md §8). Les règles d'import (R2 hiérarchie, R3 public API via index.ts) doivent être enforçables mécaniquement pour éviter toute régression future.

### Décision
`eslint-plugin-boundaries@6` comme outil d'enforcement statique de R2 et R3. Config flat config ESLint v9 dans `eslint.config.mjs`. Zones définies : `app-route`, `feature-{api,components,hooks,stores,domain,types,index}`, `shared-{components,hooks,services,lib,config,types,stores,screens}`. Scope initial : feature pilote `auth/` (TA-97). Extension aux autres features dans leurs tickets dédiés.

### Alternatives rejetées
- **eslint-plugin-import** : no-cycle seulement, pas de hiérarchie entre zones.
- **Monorepo (Nx/Turborepo)** : trop lourd pour un projet solo mobile-first.

### Conséquences
- Les violations R2/R3 sont détectées au lint-time. Lancer `npx eslint src/features/` avant chaque PR.
- La config boundaries doit être mise à jour à chaque nouvelle feature ajoutée dans `src/features/`.
- Les tests (`*.test.ts`) sont exclus du scope boundaries pour éviter les faux positifs sur les mocks.
- Syntaxe objet v6 adoptée (mode `full`, captures `featureName`, templates Handlebars). Migration complète.

---

## ADR-018 : `feature-lib` comme zone boundaries et imports intra-feature autorisés

**Statut** : Accepté  
**Date** : 2026-04-26

### Contexte
En migrant `live.tsx` (TA-98), deux lacunes de la config ESLint boundaries (ADR-017) ont émergé : (1) les helpers purs d'une feature (`lib/`) n'avaient pas de zone dédiée — ils auraient pu aller dans `domain/`, mais la sémantique est différente (`domain/` = règles métier, `lib/` = transformations techniques sans règle métier) ; (2) les imports entre composants d'une même feature (`feature-components → feature-components`) n'étaient pas autorisés, rendant impossible la décomposition en sous-composants.

### Décision
Ajouter `feature-lib` (`src/features/*/lib/**/*`) comme zone boundaries distincte. Autoriser `feature-components → feature-components` (même featureName), `feature-components → feature-domain`, `feature-components → feature-lib`. Autoriser `feature-hooks → feature-lib` et `feature-index → feature-lib`.

### Conséquences
- `lib/` d'une feature contient les transformations pures sans règle métier (ex: `build-virtual-rows`, `reps-color`). `domain/` reste réservé aux règles métier (ex: `defaults-for-category`).
- Les imports intra-`components/` restent contraints à la même feature (pas de cross-feature).
- Cette distinction `lib` vs `domain` doit être respectée dans toutes les features à migrer.

---

## ADR-007 : Claude API comme provider IA initial

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
L'IA doit être bonne rapidement. Claude est performant sur le raisonnement et le contexte long.

### Décision
Claude API derrière une abstraction `AIProvider` pour pouvoir changer de provider plus tard.

### Conséquences
- Coût par appel à monitorer
- Abstraction permet de migrer sans refactor
- Prompt caching pour optimiser les coûts
- Fallback obligatoire (l'app fonctionne sans IA)

---

## ADR-019 : Seuil FATIGUE_THRESHOLD = 6 pour la détection de plateau

**Statut** : Accepté  
**Date** : 2026-04-29

### Contexte
`business-rules.md` §6 précise "pas de facteur fatigue évident" comme condition de plateau, sans chiffrer le seuil. `computeFatigueScore` (TA-105) produit un score 0–10.

### Décision
Seuil `fatigueScore < 6` : une session avec score 5.x est compatible avec la détection de plateau ; score 6+ la bloque. Aligné sur le découpage TA-105 où 6–7 = "fatigue modérée" (statut `maintien`).

### Conséquences
- La constante `FATIGUE_THRESHOLD = 6` dans `plateau-detection.ts` est la source de vérité.
- Si le découpage des tranches de fatigue change dans TA-105, ce seuil doit être réévalué.

---

## ADR-020 : Idempotence du moteur de règles via clear + recreate

**Statut** : Accepté  
**Date** : 2026-05-06

### Contexte
TA-109 introduit `runRulesEngine(sessionId)` qui persiste des `Recommendation` post-séance. La séance peut être complétée plusieurs fois (re-run manuel, sync conflit, reprise après crash). Le moteur doit converger vers le même état sémantique sans dupliquer.

### Décision
Chaque appel commence par `clearRecommendationsForSession(sessionId)` (suppression locale + enqueue delete sync), puis recrée toutes les recommandations en s'appuyant sur les setLogs réels. La mutation `block.status active → deloaded` est gardée idempotente : on ne flippe que depuis `active`, jamais depuis `deloaded` / `completed` / `planned`. `deloadTriggered=true` reflète la décision du moteur, pas l'écriture (idempotente).

### Conséquences
- Le rejeu offline → online ne corrompt pas les recommandations : à chaque re-run, le contenu sémantique converge.
- Coût : la `sync_queue` enregistre N delete + N insert par re-run. Acceptable car re-run reste explicite (déclenché à completion).
- Les IDs de `Recommendation` ne sont pas stables entre runs (UUID frais à chaque insert) — l'identité repose sur (session_id, exercise_id, type), pas sur l'id.
- `block.status` n'est jamais régressé : si le user a manuellement changé le statut, le moteur ne le ré-écrase pas (sauf si `active` puis condition deload toujours vraie).

---

## ADR-021 : Infrastructure de tests partagée colocalisée à la feature (suffixe `*-test-helpers.ts`)

**Statut** : Accepté  
**Date** : 2026-05-06

### Contexte
TA-114 ajoute des tests d'intégration E2E du rules engine, qui réutilisent le mock SQLite in-memory et les factories de seeds déjà présents dans `rules-engine-service.test.ts` (TA-109). Sans extraction, chaque fichier de test redéploie ~300 lignes d'infrastructure (violation R6 : `> 400 lignes`). Avec ≥ 2 callers réels, l'extraction est justifiée.

Deux contraintes :
- Jest-expo collecte tout fichier `.ts` placé dans `__tests__/` comme suite de tests → un helper dans ce dossier échoue avec "Test suite must contain at least one test".
- ESLint `boundaries/dependencies` interdisait par défaut `feature-api → feature-api` intra-feature, ce qui bloquait `helpers.ts → in-memory-db.ts` dans `src/features/<feat>/api/`.

### Décision
- L'infrastructure de tests partagée est colocalisée **dans le dossier de la couche concernée** (ex: `src/features/<feat>/api/`), avec un suffixe explicite `*-test-helpers.ts` ou `*-in-memory-db.ts` (pas dans `__tests__/`).
- Les fichiers de test (`*.test.ts`) eux-mêmes peuvent être dans `__tests__/` (cas E2E TA-114) ou colocalisés (cas TA-109) — au choix.
- ESLint boundaries autorise désormais `feature-api → feature-api` intra-feature pour permettre l'auto-référence (`helpers.ts → in-memory-db.ts`). Même pattern que ARCH-02 (`feature-domain → feature-domain`) et TA-98 (`feature-components → feature-components`).

### Conséquences
- Un fichier `*-test-helpers.ts` est linté comme un fichier de production (pas exclu via `**/*.test.ts`) : il doit respecter les règles boundaries. Bénéfice : impossible d'introduire un import horizontal interdit caché derrière un helper de test.
- Le helper dépend de `jest` (typage global via `@types/jest`) — il ne sera jamais bundlé en prod car non importé depuis du code non-test.
- Si une 3e feature a besoin de mutualiser une infra de tests (rare), on déplacera vers `src/lib/test/` (shared-lib) — point de bascule explicite, pas par défaut.
- Pitfall ARCH-06 documenté pour la règle ESLint étendue.

---

## ADR-022 : SyncService.push() — upsert idempotent + non fail-fast + snapshot

**Statut** : Accepté
**Date** : 2026-05-09

### Contexte
TA-120 implémente le push SQLite → Supabase. La SyncQueue contient des entrées `insert`/`update`/`delete` créées via `safeEnqueue` (ADR-012). Trois questions à arbitrer :
1. Comment garantir l'idempotence côté serveur (rejouer une op ne corrompt pas l'état) ?
2. Que faire quand une entrée échoue au milieu d'un batch (fail-fast vs continuer) ?
3. Comment éviter les races entre `push()` et `safeEnqueue` exécutés en parallèle ?

### Décision
1. **Insert et update sont traités identiquement via `upsert(payload, { onConflict: 'id' })`**. Le verbe Postgres `upsert` est idempotent : rejouer = même résultat sémantique. Cela neutralise aussi les violations d'ordre causal côté serveur (un `update` qui passe avant son `insert` créera la ligne).
2. **Delete utilise `.delete().eq('id', recordId)`** où `recordId` vient de la SyncQueue (pas du payload). Si la ligne est absente côté serveur, `delete` est silencieux (count=0, pas d'erreur).
3. **Non fail-fast** : une erreur sur l'entrée N (réseau, RLS, payload corrompu) ne bloque pas les entrées N+1. `push()` retourne un `PushResult` avec un récap par entrée (`pushed` ou `failed` + message). L'idempotence d'`upsert` rend la stratégie sûre : les FK qui échouent reviendront en queue et seront rejouées au prochain cycle.
4. **Snapshot au début** : `push()` lit la queue une seule fois (`getPendingSyncRecords`) et boucle sur ce snapshot. Toute entrée enfilée pendant l'exécution sera traitée au prochain `push()`. Borne la durée d'un push et évite les boucles infinies si un caller enqueue en parallèle.
5. **`synced_at` source** patché localement uniquement pour `sessions` (seule table avec la colonne, côté SQLite et Supabase). Pour les autres tables, seul le flag `sync_queue.synced=1` est mis à jour.
6. **Client Supabase injecté** : la factory `createSyncService({ supabase })` accepte une interface minimale (`SupabasePushClient`), pas le `SupabaseClient` typé. Permet le mock complet en tests sans dépendre du module global.

### Conséquences
- Aucune perte de donnée : une entrée n'est marquée `synced=1` qu'après confirmation Supabase. Erreur réseau totale → toutes les entrées restent en queue.
- Pas de retry intégré (hors scope TA-120) : un caller (hook au boot/au retour réseau, futur TA-121) décide quand relancer `push()`.
- L'usage d'`upsert` masque la distinction `insert`/`update` côté serveur — c'est voulu : la SyncQueue est une optimisation, l'état local SQLite reste la source de vérité tant que le pull n'est pas implémenté.
- Le snapshot au début de `push()` exclut les entrées tardives, mais les inclut au prochain cycle. Pas de famine si `push()` est appelé régulièrement.

---

## ADR-023 : Règle ESLint feature-types → feature-types intra-feature

**Statut** : Accepté
**Date** : 2026-05-09

### Contexte
TA-120 introduit `src/features/sync/types/sync-service.ts` qui réutilise `SyncAction` et `SyncTableName` définis dans `src/features/sync/types/sync-queue.ts` (même feature). ESLint `boundaries/dependencies` bloquait avec "There is no rule allowing dependencies from elements of type feature-types to feature-types". Les autres `feature-*` (api, domain, components) avaient déjà cette permission auto-référencée (cf. ARCH-02, ARCH-03, ARCH-06) — `feature-types` était l'oublié.

### Décision
Ajouter dans `eslint.config.mjs` la règle :
```js
{ from: { type: 'feature-types' },
  allow: [
    { to: { type: 'feature-types', captured: { featureName: '{{ from.captured.featureName }}' } } },
    { to: { type: 'shared-types' } },
    { to: { type: 'shared-config' } },
  ] }
```
Reste interdit : `feature-types → feature-api/components/hooks/stores/lib` (imports ascendants), `feature-types → autre feature` (cf. ARCH-04 / TA-111).

### Conséquences
- Les types d'une feature peuvent se composer entre eux (ex: `PushEntryOutcome` réutilise `SyncTableName` et `SyncAction` du même module). Évite la duplication.
- L'invariant "types ne dépendent pas de l'UI" reste préservé.
- Pattern régulier maintenant complet : tous les segments `feature-*` peuvent s'auto-référencer intra-feature.

---

## ADR-024 : Résolution de conflits last-write-wins client-side, fetch avant upsert

**Statut** : Accepté
**Date** : 2026-05-09

### Contexte
TA-122 (Phase 6) introduit la résolution de conflits multi-device. Quand deux appareils écrivent offline puis synchronisent, l'ordre d'arrivée n'est pas l'ordre logique. La spec retenue est last-write-wins (LWW) basée sur `updated_at`. Trois questions à arbitrer :
1. Où vit la résolution : client (avant push) ou serveur (stored proc / trigger) ?
2. Quelles tables sont concernées et comment gérer l'absence d'`updated_at` côté `recommendations` ?
3. Comment loguer les conflits sans persistance lourde ?

### Décision
1. **Résolution côté client, AVANT chaque upsert** : pour chaque entrée de la SyncQueue sur une table conflict-checked, le SyncService fetch d'abord la ligne remote (`select(*).eq('id', recordId).maybeSingle()`), puis applique `resolveConflict({local, remote})` (fonction pure). Si remote gagne, on copie remote→local et on marque `synced=1` SANS faire d'upsert. Si local gagne ou ligne remote absente, upsert classique. Coût : 1 round-trip réseau supplémentaire par entrée — acceptable Phase 6 (pas de batch fetch).
2. **Tables checkées** : `sessions`, `set_logs`, `recommendations`. Les tables programme (programs, blocks, workout_days, planned_exercises) sont exclues car le workflow de génération est séquentiel (pas de mutation parallèle multi-device attendue).
3. **`recommendations` sans `updated_at`** : fallback sur `created_at` (la table est append-only via ADR-020 — collision improbable mais on reste conservateur).
4. **`device_id`** : déjà persisté en SQLite via `getOrCreateDeviceId` (ADR-015) et déjà inclus dans le payload `sessions` côté repo (`toSupabasePayload`). Le SyncService ne mute pas le payload — il forward tel quel. Pour `set_logs` et `recommendations`, la colonne `device_id` n'existe PAS côté Supabase ; le payload n'inclut donc pas ce champ (cohérent avec le schéma).
5. **Logs in-memory** : un `ConflictLogStore` (factory `createConflictLogStore()`) accumule les logs à la durée de vie du SyncService, accessibles via `getConflictLogs()`. Buffer FIFO de 200 entrées max. Pas de persistance DB — ces logs sont une aide au debug, pas une donnée canonique.
6. **Outcome enrichi** : `PushEntryOutcome` expose `conflictResolved?: 'local' | 'remote'` quand un conflit a été détecté. `PushResult.conflicts` contient le snapshot des conflits du cycle courant.

### Alternatives rejetées
- **Stored procedure Supabase** (résolution côté serveur) : couple la logique au backend, nuit à l'offline-first (impossible à dry-run en local), nécessite une migration SQL.
- **Vector clocks / version vectors** : surdimensionné pour Phase 6 mono-utilisateur ; LWW suffit.
- **AsyncStorage pour `device_id`** (proposé dans le ticket) : déjà résolu en SQLite (ADR-015) — pas de duplication.

### Conséquences
- Le coût réseau du push est x2 sur les tables conflict-checked. Optimisable plus tard (batch fetch via `select.in('id', [...])`).
- Quand remote gagne, le local "saute" un état intermédiaire — c'est l'invariant LWW : l'écriture la plus récente prime, même si elle vient d'un autre appareil.
- Les logs de conflits ne survivent pas au redémarrage de l'app — c'est volontaire (debug uniquement). Si un besoin de persistance émerge, créer une table `conflict_logs` dédiée.
- La fenêtre de race entre fetch et upsert reste — un autre device peut écrire entre les deux. Postgres résoudra l'upsert final (idempotent), mais l'ordre exact n'est pas garanti. Acceptable Phase 6.
- Pattern de fetch-before-write extensible : si une autre table rejoint `CONFLICT_CHECKED_TABLES`, ajouter (a) une colonne `updated_at` côté local + remote, (b) un mapping dans `TIMESTAMP_COLUMN_BY_TABLE`, (c) un handler dans `copyRemoteRowToLocal`.

---

## ADR-025 : Appels Claude API via Edge Function Supabase (clé serveur)

**Statut** : Accepté
**Date** : 2026-05-17

### Contexte
Phase 7 introduit les appels IA depuis l'app mobile. Deux options : (a) appel direct `api.anthropic.com` depuis le client avec clé Anthropic embarquée, (b) relay via Edge Function Supabase qui détient la clé. L'option (a) expose la clé (extractible du bundle RN), interdit tout rate-limit côté serveur et expose à du surcoût/abus.

### Décision
Tous les appels Claude API passent par une **Edge Function Supabase** (`ai-proxy`) qui :
- détient la clé `ANTHROPIC_API_KEY` (secret Supabase, jamais côté client),
- relaie la requête `messages` (incl. `cache_control`, `anthropic-beta` headers) sans transformer la sémantique,
- applique un rate-limit par `user_id` (RLS / auth token),
- log les coûts (`input_tokens`, `output_tokens`, `cache_read_input_tokens`) pour observabilité.

Le `ClaudeProvider` (TA-131) appelle l'Edge Function via `supabase.functions.invoke('ai-proxy', { body })` — pas de fetch direct vers Anthropic.

### Alternatives rejetées
- **Appel direct client** : clé exposée, pas de rate-limit serveur, risque de surcoût non maîtrisé.
- **Direct en dev / Edge Function en prod** : double code path, divergence du comportement (rate-limit, logs) entre environnements — sourcing de bugs.

### Conséquences
- Hop réseau supplémentaire (~100-300ms) — acceptable car les appels IA sont async/non bloquants pour le logging.
- L'Edge Function `ai-proxy` doit exister avant de coder TA-131 — la créer dans TA-131 ou en pré-requis.
- Aucune clé Anthropic ne doit apparaître dans `process.env.EXPO_PUBLIC_*` (variable publique du bundle). Le `ClaudeProvider` ne lit jamais de clé locale.
- Le rate-limit Edge Function rend le fallback obligatoire (cf. ADR-007) encore plus nécessaire : un quota dépassé renvoie HTTP 429 → `FallbackProvider`.

---

## ADR-026 : Génération IA post-complétion locale, retry async via queue

**Statut** : Accepté
**Date** : 2026-05-17

### Contexte
`docs/ai-strategy.md §2 Déclenchement` indiquait "fin de séance (après sync)" comme trigger du résumé IA. Mais l'architecture offline-first (ADR-002) permet à une séance d'être complétée localement sans sync immédiate (pas de réseau). Attendre la sync Supabase ferait apparaître le résumé avec un retard arbitraire (parfois plusieurs heures) — UX dégradée pour la feature à plus haute priorité.

### Décision
Le résumé IA (et plus généralement chaque appel IA "automatique") est déclenché **dès la complétion locale** de la séance (`session.status = 'completed'` en SQLite), pas après sync.

Flow :
1. Séance complétée localement → `generateAndStoreSessionSummary` est appelé en fire-and-forget.
2. Si online + `ClaudeProvider` disponible → appel via Edge Function (ADR-025). Résultat persisté comme `Recommendation { source: 'ai', type: 'summary' }`.
3. Si offline OU erreur Edge Function/Claude → `FallbackProvider` immédiat, persisté avec `metadata.fallback: true`.
4. Si fallback déclenché à cause de l'offline, une entrée est ajoutée à une queue de retry IA (TA-141) qui retentera l'appel Claude au retour réseau et remplacera la `Recommendation` fallback par la version IA.

### Alternatives rejetées
- **Post-sync Supabase strict** : viole l'offline-first ; le résumé peut attendre des heures en mode dégradé.
- **Bloquer l'UI sur la réponse IA** : ajoute une latence visible (1-5s) à un moment où l'utilisateur veut fermer l'écran ; va à l'encontre du principe "le logger doit être plus rapide qu'un carnet".

### Conséquences
- Le résumé est toujours présent à l'ouverture de l'écran fin de séance — soit IA, soit fallback template.
- La queue de retry IA (TA-141) est nécessaire pour upgrade un fallback en résumé IA quand le réseau revient.
- L'AIContextProfile (ADR-027) doit être lisible offline pour que le `ClaudeProvider` puisse construire le prompt sans attendre Supabase.
- Doc `ai-strategy.md §2` mise à jour en conséquence (tableau de déclenchement).

---

## ADR-027 : AIContextProfile cache SQLite local + push Supabase

**Statut** : Accepté
**Date** : 2026-05-17

### Contexte
TA-132 doit construire et persister l'`AIContextProfile`. Le schéma Supabase prévoit la table `ai_context_profiles` (cf. `data-model.md`). Question : faut-il une table SQLite locale miroir, recalculer à la volée à chaque appel IA, ou ne vivre que côté Supabase ?

Contraintes :
- ADR-026 impose que les appels IA puissent partir offline (donc le profil doit être lisible offline).
- Recalculer le profil à chaque prompt coûte des reads SQLite (sessions, baselines, recovery) non triviaux.
- Le profil change peu (post-séance, post-mensurations, fin de bloc).

### Décision
Le profil vit comme **cache SQLite local** miroir de la table Supabase, mis à jour explicitement par `refreshAIContextProfile(db, userId)` aux 3 déclencheurs : (1) post-complétion séance (local, pas post-sync), (2) post-update mensurations/profil, (3) fin de bloc.

Migration SQLite (nouvelle, à inclure dans TA-132) :
```sql
CREATE TABLE ai_context_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  profile_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_ai_context_profiles_user ON ai_context_profiles(user_id);
```

`refreshAIContextProfile` :
- lit le profil courant (`SELECT ... WHERE user_id`), prend `version` + 1,
- réécrit le row entier (`INSERT OR REPLACE`),
- `safeEnqueue` une entrée sync pour push vers `ai_context_profiles` Supabase (mêmes règles ADR-012).

Lecture : `getAIContextProfile(db, userId)` lit le row local, jamais Supabase au runtime. Si le row est absent, le caller décline (le `ClaudeProvider` peut retourner un fallback ou demander un refresh explicite).

### Alternatives rejetées
- **Calcul à la volée à chaque prompt** : reads SQLite multiples à chaque appel IA, latence ajoutée à un chemin déjà sensible (résumé fin de séance).
- **Supabase seulement** : viole l'offline-first pour les features IA — pas de profil offline → fallback systématique sans contexte personnalisé.

### Conséquences
- Une migration SQLite supplémentaire (v8 ou suivante) est nécessaire dans TA-132.
- Le `version` est local-monotone par device — il n'est pas garanti d'être cohérent multi-device avant la résolution de conflits (Phase 6 LWW sur `updated_at` couvre ce cas).
- Le profil peut être stale entre deux déclencheurs explicites — acceptable : il représente l'état "à date du dernier refresh", pas l'état temps réel.
- Pas de conflict resolution actif sur `ai_context_profiles` (table dérivée recalculable, pas une source canonique) — exclue de `CONFLICT_CHECKED_TABLES` (ADR-024).
