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
