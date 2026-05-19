# Pièges & Stubs ouverts

Mis à jour par le dev à chaque fin de story. Lu par le dev avant de coder et par le reviewer avant de valider.

---

## Pièges techniques connus

### ARCH-01 — Fichier de route god-object (anti-pattern `live.tsx`)
**Symptôme** : `app/(app)/session/live.tsx` avait atteint 2001 lignes et contenait 14 composants colocalisés dans un seul fichier de route. Violait R1 (route non-thin), R3 (pas de public API par feature), R6 (> 400 lignes = refacto obligatoire).  
**Résolu dans TA-98** : `app/(app)/session/live.tsx` réduit à 3 lignes (import + re-export). 14 composants extraits dans `src/features/session/components/`, 2 hooks dans `hooks/`, 2 helpers dans `lib/`, 1 fonction domaine dans `domain/`, types partagés dans `types/`, public API dans `index.ts`. Tous les fichiers ≤ 250 lignes. ESLint 0 erreur.  
**Pattern de refacto documenté** : pour un god-object similaire, extraire dans l'ordre : types → helpers purs → domain → hooks → composants feuilles → composants composites → orchestrateur → route thin → index.ts. La config ESLint boundaries a nécessité l'ajout du type `feature-lib` (non prévu en TA-97) et des permissions `feature-components → feature-components` (intra-feature).  
**Détecté** : TA-97 / 2026-04-25 — **Résolu** : TA-98 / 2026-04-26

### RN-01 — `crypto.randomUUID()` non disponible sur Hermes
**Symptôme** : `TypeError: crypto.randomUUID is not a function` au runtime.  
**Fix** : utiliser `generateUUID()` depuis `@/utils/uuid`.  
**Détecté** : TA-84 / 2026-04-25

### RN-02 — Fichiers `*.test.*` dans `app/` crashent Expo Router
**Symptôme** : crash runtime, Expo Router enregistre le test comme une route.  
**Fix** : placer les tests d'écrans dans `src/screens/<groupe>/` en miroir de `app/`.  
**Détecté** : CLAUDE.md (convention établie)

### RN-04 — `defaultValue` vs `value` pour tester les prefills dans RNTL
**Symptôme** : un `TextInput` avec `defaultValue` ne reporte pas `props.value` dans le test RNTL — `screen.getByTestId('input').props.value` retourne `undefined`.  
**Fix** : utiliser `value` + `useState` dans le composant pour que la valeur soit accessible dans les tests. Le coût de re-render est négligeable pour les inputs de set.  
**Détecté** : TA-99 / 2026-04-26

---

### RN-03 — `Alert.alert('Phase X', ...)` comme stub de navigation
**Pattern à bannir** : utiliser une alerte comme placeholder pour une route non implémentée.  
**Fix** : router.push vers la vraie route, ou laisser le bouton disabled avec un commentaire `// TODO TA-XX`.  
**Détecté** : TA-84 / 2026-04-25

---

### ARCH-02 — `feature-domain` ne peut pas importer ses propres sous-modules par défaut
**Symptôme** : ESLint `boundaries/dependencies` bloque les imports entre fichiers du même dossier `domain/` d'une feature (ex: `compute-progression-decision.ts` → `./progression-types/strength-fixed.ts`). La règle `feature-domain` dans `eslint.config.mjs` n'autorisait que les imports vers `feature-types` et `shared-types`.  
**Fix** : ajouter `{ to: { type: 'feature-domain', captured: { featureName: '{{ from.captured.featureName }}' } } }` dans la section `from: { type: 'feature-domain' }` de `eslint.config.mjs`. Même pattern que pour `feature-components → feature-components` (TA-98).  
**Détecté** : TA-104 / 2026-04-29

---

### GEN-01 — `preferredDays` obsolète si l'utilisateur change la fréquence après la sélection des jours
**Symptôme** : l'utilisateur choisit 4 jours en step-2b, retourne en step-2 et sélectionne 3 jours. `preferredDays` contient encore 4 entrées. `spreadDayOrders` ignore silencieusement la préférence (fallback sur le pattern hardcodé) mais l'UI de step-2b affiche 4 jours pré-sélectionnés alors que `required = 3`.  
**Fix** : `setFrequency` dans le store remet `preferredDays: null` à chaque appel. Ajout du `useEffect` guard dans step-2b-days-screen (router.back() si `frequencyDays` null).  
**Détecté** : TA-96 / 2026-05-07

---

### ARCH-03 — `feature-api` ne peut pas importer son propre `feature-domain` par défaut
**Symptôme** : ESLint `boundaries/dependencies` bloquait `src/features/<feat>/api/*.ts` → `../domain/*.ts` (même feature). Or un service api d'orchestration a besoin d'appeler les fonctions pures de son domain.
**Fix** : ajouter `{ to: { type: 'feature-domain', captured: { featureName: '{{ from.captured.featureName }}' } } }` dans la section `from: { type: 'feature-api' }` de `eslint.config.mjs`. Reste interdit : api → autre feature, api → components/hooks/stores.
**Détecté** : TA-109 / 2026-05-06

---

### DB-01 — Migration remote orpheline bloque `supabase db push`
**Symptôme** : `supabase db push` échoue avec "Remote migration versions not found in local migrations directory". Une migration existe sur remote mais pas en local (appliée manuellement ou via MCP sur l'UI Supabase).  
**Fix** : `supabase migration repair --status reverted <version>` pour marquer la migration remote comme révoquée côté historique, puis `supabase db push` fonctionne normalement.  
**Détecté** : TA-103 / 2026-04-29

---

### PROG-01 — `increment_upper_kg` sans discrimination upper/lower dans `strength_fixed`
**Symptôme** : `computeStrengthFixed` utilise toujours `increment_upper_kg` pour calculer l'augmentation, sans tenir compte de si l'exercice est upper ou lower body. `SetLog` ne contient pas `bodyPart`.
**Fix attendu** : quand `bodyPart` sera disponible dans `SetLog` (ou via contexte exercice), choisir entre `increment_upper_kg` et `increment_lower_kg` selon la valeur.
**Détecté** : TA-104 / 2026-04-29 — stub dans `strength-fixed.ts` ligne increment.

---

### PROG-02 — `RecoveryLog` et `CardioSession` sans type TS ni saisie UI (Phase 4 incomplète)
**Symptôme** : `computeFatigueScore` utilise des types locaux `RecoveryLogSnapshot` et `CardioSessionSnapshot` définis dans `fatigue-score.ts` car la saisie UI et les types globaux de ces entités n'ont pas été implémentés en Phase 4.
**Fix attendu** : quand les types globaux `RecoveryLog` et `CardioSession` seront définis dans `src/types/`, migrer `RecoveryLogSnapshot` et `CardioSessionSnapshot` vers ces types (ou les aligner). La dégradation gracieuse existante (champs optionnels) reste valide.
**Détecté** : TA-105 / 2026-04-29 — stub dans `fatigue-score.ts` (types locaux).

---

### PROG-03 — Clés de `setLogsByExercise` et `progressionHistoryByExercise` par ID de PlannedExercise
**Symptôme** : les dictionnaires d'inputs de `computeNextSessionPlan` sont indexés par `PlannedExercise.id` (ex: `pe-1`), pas par `Exercise.id` (`ex-1`). Le code fait `setLogsByExercise[exercise.id]` où `exercise` est un `PlannedExercise`.  
**Fix** : toujours indexer ces dictionnaires par l'ID du PlannedExercise lors de l'appel (le même exercice peut apparaître plusieurs fois dans un programme avec des configs différentes).  
**Détecté** : TA-106 / 2026-04-29

---

### PROG-04 — Apostrophes typographiques dans les strings TS/TSX (encoding macOS)
**Symptôme** : Babel parser échoue avec `SyntaxError: Unexpected token, expected ","` quand un string de test contient une apostrophe typographique (`'` au lieu de `'`). macOS convertit parfois `'` en `'` dans les strings copiés depuis des outils externes.  
**Fix** : utiliser des guillemets doubles `"..."` pour tout string de test contenant une apostrophe, ou vérifier avec `grep -P "[\x{2018}\x{2019}]"` avant commit.  
**Détecté** : TA-107 / 2026-04-29

---

### TEST-01 — Mock de hook TanStack Query dans les tests d'écrans
**Symptôme** : un nouveau hook `useQuery` ajouté dans un composant d'écran fait crasher les tests existants avec `No QueryClient set, use QueryClientProvider to set one`.
**Fix** : mocker le hook au niveau du fichier qui le contient (chemin absolu `@/features/<feat>/hooks/use-<hook>`) — pas au niveau de l'index de la feature. Le mock de l'index n'est pas résolu si le composant importe directement le hook interne.
**Détecté** : TA-111 / 2026-05-06

---

### TEST-02 — Tests d'intégration moteur de progression dépendant de l'horloge système
**Symptôme** : les tests E2E de `rules-engine-integration.test.ts` deviennent rouges quand la date d'exécution réelle s'éloigne des fixtures statiques (> 14 jours). `computeNextSessionPlan` utilise `today = new Date()` pour détecter une longue pause (`longPause`), ce qui bascule le statut en `prudente` au lieu d'`allegee` ou du comportement attendu.
**Fix** : mocker l'horloge dans toute suite E2E qui touche au moteur de progression via `jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout'] })` + `jest.setSystemTime(new Date('<date-proche-des-fixtures>'))` dans `beforeAll`, restaurer avec `jest.useRealTimers()` dans `afterAll`.
**Note** : à terme, exposer `today` via `RunRulesEngineOptions` permettrait une injection propre sans mock système — signalé pour future story.
**Détecté** : Fix post-TA-114 / 2026-05-18

---

### ARCH-04 — `feature-types` ne peut pas importer `shared-components`
**Symptôme** : ESLint `boundaries/dependencies` bloque `src/features/<feat>/types/*.ts` → `src/components/**/*` (shared-components). La règle implicite `default: 'disallow'` s'applique.
**Fix** : si un type feature a besoin d'un type défini dans shared-components (ex: `DisplaySessionStatus`), redéfinir localement l'union de strings dans le fichier de types feature. Éviter les imports ascendants (types → UI components).
**Détecté** : TA-111 / 2026-05-06

---

### ARCH-05 — `feature-components` ne peut pas importer un type depuis `feature-api` (même feature)
**Symptôme** : ESLint `boundaries/dependencies` bloque `src/features/<feat>/components/*.tsx` → `../api/*.ts` même pour un simple `import type`. La règle `feature-components` n'autorise pas `feature-api` comme dépendance.
**Fix** : déplacer le type partagé dans `src/features/<feat>/types/` et l'importer depuis là. La couche `feature-api` peut ensuite ré-exporter via `export type { ... } from '../types/...'`. Les composants importent depuis `types/`, les APIs importent depuis `types/`, tout le monde est satisfait.
**Détecté** : TA-113 / 2026-05-06

---

### ARCH-06 — `feature-api` ne peut pas importer ses propres sous-modules api par défaut
**Symptôme** : ESLint `boundaries/dependencies` bloque les imports entre fichiers du même dossier `api/` d'une feature (ex: `rules-engine-test-helpers.ts` → `./rules-engine-in-memory-db.ts`). La règle `feature-api` autorisait `feature-domain`, `feature-types` et infra partagée mais pas l'auto-référence.
**Fix** : ajouter `{ to: { type: 'feature-api', captured: { featureName: '{{ from.captured.featureName }}' } } }` dans la section `from: { type: 'feature-api' }` de `eslint.config.mjs`. Même pattern que `feature-components → feature-components` (TA-98) et `feature-domain → feature-domain` (TA-104). Reste interdit : feature-api → autre feature, feature-api → components/hooks/stores.
**Détecté** : TA-114 / 2026-05-06

---

### ARCH-07 — `feature-types` ne pouvait pas importer ses propres sous-modules types
**Symptôme** : ESLint `boundaries/dependencies` bloquait les imports entre fichiers du dossier `types/` d'une feature (ex: `sync-service.ts` → `./sync-queue` pour réutiliser `SyncAction` et `SyncTableName`). Aucune section `from: { type: 'feature-types' }` n'existait dans `eslint.config.mjs`, donc `default: 'disallow'` s'appliquait — seul segment `feature-*` sans permission auto-référence.
**Fix** : ajouter la section `from: { type: 'feature-types' }` avec auto-référence intra-feature (`captured: { featureName: '{{ from.captured.featureName }}' }`) + accès `shared-types` / `shared-config`. Reste interdit : import vers feature-api/components/hooks/stores/lib (ascendant) et vers les types d'une autre feature (cf. ARCH-04). Cf. ADR-023.
**Détecté** : TA-120 / 2026-05-09

---

### ARCH-08 — `feature-hooks` ne pouvait pas importer ses propres sous-modules hooks
**Symptôme** : ESLint `boundaries/dependencies` bloquait les imports entre fichiers du dossier `hooks/` d'une feature (ex: `use-sync-status.ts` → `./use-network-sync`). La section `from: { type: 'feature-hooks' }` n'incluait pas d'auto-référence intra-feature.
**Fix** : ajouter `{ to: { type: 'feature-hooks', captured: { featureName: '{{ from.captured.featureName }}' } } }` dans la section `from: { type: 'feature-hooks' }` de `eslint.config.mjs`. Reste interdit : hooks → hooks d'une autre feature.
**Détecté** : TA-121 / 2026-05-09

---

### SYNC-01 — `SyncBridge` ne doit pas importer `@/services/supabase` directement
**Symptôme** : `sync-bridge.tsx` importait `supabase` depuis `@/services/supabase`. Ce service importe `react-native-url-polyfill/auto` non mocké dans Jest. Résultat : 18 suites de tests échouaient à l'import de la feature sync (via `index.ts` → `sync-bridge.tsx` → `supabase.ts`).
**Fix** : passer le client Supabase en prop depuis `app/_layout.tsx` (qui est déjà hors scope des tests Jest car dans `app/`). Le cast `as unknown as SupabasePushClient` est fait dans `app/_layout.tsx`. La feature sync reste testable sans dépendance réseau.
**Détecté** : TA-121 / 2026-05-09

---

### SYNC-02 — `recommendations` sans `updated_at` : fallback `created_at` pour le LWW
**Symptôme** : `recommendations` n'a pas de colonne `updated_at`, ni en SQLite ni en Supabase (cf. `data-model.md` §Recommendation). Le LWW basé sur `updated_at` (TA-122) ne pouvait donc pas s'appliquer tel quel.
**Fix** : `TIMESTAMP_COLUMN_BY_TABLE` dans `src/features/sync/api/conflict-check.ts` mappe `recommendations → 'created_at'`. La table est de toute façon append-only via ADR-020 (clear+recreate avec UUID frais à chaque rerun du moteur), donc une collision sur `id` est virtuellement impossible.
**Si une mutation in-place devient un cas d'usage** : ajouter `ALTER TABLE recommendations ADD COLUMN updated_at` (locale + remote) + bascule du mapping. Le `copyRecommendationRow` dans `copy-remote-row-to-local.ts` ne gère actuellement pas `updated_at` (à étendre).
**Détecté** : TA-122 / 2026-05-09

---

### SYNC-03 — `set_logs` et `recommendations` sans `device_id` côté Supabase
**Symptôme** : seule la table `sessions` a une colonne `device_id` côté Supabase (cf. `data-model.md` §Session). Inclure `device_id` dans le payload `set_logs.upsert` ou `recommendations.upsert` ferait crasher Supabase (colonne inconnue).
**Fix** : le `device_id` est ajouté dans le payload uniquement par `toSupabasePayload` côté repo `sessions` (TA-72). Les payloads `set_logs` et `recommendations` ne contiennent jamais `device_id`. Le SyncService forward le payload tel quel sans le muter.
**Si on veut tracer le device sur set_logs ou recommendations** : migration additive `ALTER TABLE ... ADD COLUMN device_id TEXT` côté Supabase + côté SQLite + extension du `toSupabasePayload` du repo concerné. Le SyncService n'a rien à changer.
**Détecté** : TA-122 / 2026-05-09

---

### NAV-01 — Screen non déclaré dans le Stack → header fantôme avec nom de route comme titre
**Symptôme** : un écran Expo Router non enregistré explicitement dans le `<Stack>` du layout reçoit un header par défaut dont le titre est le nom du fichier (ex : `index`). En bonus, si d'autres écrans ont été empilés avant lui, un back button peut apparaître même si l'écran est la racine logique du groupe.
**Fix** : toujours déclarer `<Stack.Screen name="index" options={{ headerShown: false }} />` (ou un titre explicite) dans `app/(app)/_layout.tsx` pour chaque écran racine. Ne pas compter sur le comportement par défaut d'Expo Router pour les routes racine.
**Détecté** : TA-115 / 2026-05-06

---

### NAV-02 — `router.replace('/(app)')` casse TypeScript après ajout d'un groupe `(tabs)`
**Symptôme** : quand `app/(app)/index.tsx` est déplacé dans `app/(app)/(tabs)/index.tsx`, Expo Router régénère ses types et `/(app)` n'est plus une route feuille valide. Toutes les navigations `router.replace('/(app)')` / `<Redirect href="/(app)" />` lèvent TS2345.
**Fix** : remplacer `/(app)` par `/(app)/(tabs)` dans tous les `router.replace`, `router.push` et `<Redirect href>`. Grep sur `/(app)'` et `/(app)"` avant de shipper. Aussi mettre à jour le `AuthGuard` dans `app/_layout.tsx`.
**Détecté** : TA-116 / 2026-05-06

---

---

### QUERY-01 — Invalidation `today-workout` manquante après complétion de séance
**Symptôme** : après retour depuis `end-session-screen`, l'écran Aujourd'hui affichait encore l'état `workout` (ou `in_progress`) au lieu de `completed_today`. La query `today-workout` avait un `staleTime: 60s` et n'était pas invalidée.
**Fix** : dans `use-complete-session.ts`, invalider `today-workout` et `today-recommendations` en plus de `session-recommendations` après `runRulesEngine`. L'invalidation en parallèle via `Promise.all` évite un délai additionnel.
**Détecté** : TA-117 / 2026-05-06

---

### PROG-05 — `dayOrder` consécutif dans `generateProgram` (0,1,2,3 au lieu de slots hebdomadaires)
**Symptôme** : pour un programme 4 jours, `generateProgram` assignait `dayOrder` = index de boucle (0,1,2,3), plaçant les séances lundi–mardi–mercredi–jeudi sans repos intercalé. Le calendrier hebdomadaire (`week-calendar`) et le hook `use-today-workout` interprètent `dayOrder` comme jour de semaine (1=Lun…7=Dim).  
**Fix** : `spreadDayOrders(frequency)` retourne des slots pré-définis avec repos intercalés (3j→[1,3,5], 4j→[1,2,4,5], 5j→[1,2,3,5,6], 6j→[1,2,3,4,5,6]). Appelé dans `generateProgram` pour remplacer `dayIdx` raw.  
**Détecté** : test utilisateur Phase 4 — **Résolu** : TA-91 / 2026-05-07

---

### PROG-06 — Boucle de troncage `maxSessionDurationMin` : `break` prématuré bloque l'élaguage secondary
**Symptôme** : la boucle while qui élimine les accessoires s'arrêtait dès que le dernier élément de `plannedExercises` n'était pas un `accessory`. Si tous les accessoires étaient supprimés mais `estimatedMin` restait > `maxSessionDurationMin`, la contrainte n'était pas respectée (ex: 72 min pour un max de 60 après `volumeTolerance: 'high'`).  
**Fix** : deux passes séquentielles avec `for (const roleToTrim of ['accessory', 'secondary'])` — d'abord supprimer tous les accessoires, puis, si encore au-dessus, supprimer les secondary. Les exercices main ne sont jamais retirés.  
**Détecté** : TA-92 / 2026-05-07

---

### PROG-07 — Boucle de troncage sans plancher minimum : séances trop courtes violent les règles métier
**Symptôme** : avec `maxSessionDurationMin: 75` (valeur par défaut), la boucle de troncage pouvait supprimer tous les accessoires et tous les secondaires, laissant seulement 2-3 exercices par séance. `docs/program-generation.md §5.2` impose 2-4 accessoires et 1-3 secondaires par séance (minimum 4 exercices au total).  
**Fix** : introduire `MIN_ACCESSORY = 2` et `MIN_SECONDARY = 1` dans la boucle while. La condition de sortie teste maintenant `countOfRole <= minCount` avant de supprimer. La contrainte de durée est donc "best effort" : elle ne peut pas violer le plancher métier. Si la durée cible est irréalisable avec le plancher, elle est dépassée silencieusement.  
**Détecté** : TA-93 / 2026-05-07

---

### CAL-01 — `week-calendar` affiche N-1 séances pour les programmes pré-TA-91 (dayOrder 0-based)
**Symptôme** : avant TA-91, `generateProgram` assignait `dayOrder = dayIdx` (0-based : 0,1,2,3 pour 4 jours). Le composant `WeekCalendar`/`buildWeekCells` mappe les 7 cellules avec `dayOrder = i + 1` (1-based, 1..7), donc `dayOrder=0` ne match jamais. Résultat : la première séance est invisible dans le calendrier (3 séances affichées pour un programme à 4 jours).  
**Fix** : dans `buildWeekCells`, calculer le minimum des dayOrders. Si le minimum est 0 (programme legacy), appliquer un offset de +1 avant d'insérer dans la map. Les nouveaux programmes (dayOrders ≥ 1) ne sont pas affectés (offset=0).  
**Détecté** : TA-94 / 2026-05-07

---

### ARCH-09 — Fonction pure d'import placée dans `features/sync` : violation R4 + R2
**Symptôme** : `parseHevyCsv` (fonction pure, aucun I/O) avait été placée dans `src/features/sync/domain/` parce que la story TA-124 la livrait avant l'écran d'import. La story suivante (TA-125) l'importait via `@/features/sync` — import horizontal entre features bloqué par `boundaries/dependencies`.
**Fix** : déplacer la fonction pure dans `src/features/import/domain/` (R4 : logique sans I/O dans domain/) et les types associés dans `src/features/import/types/` (R4). Nettoyer `features/sync/index.ts`. Règle : le placement d'une fonction ne dépend pas de qui la livre, mais de qui la consomme logiquement. Un parser CSV d'import appartient à la feature import.
**Détecté** : TA-125 review / 2026-05-09

---

### IMPORT-01 — `expo-file-system` v2 : `EncodingType` n'est plus sur l'export principal
**Symptôme** : `import * as FileSystem from 'expo-file-system'` puis `FileSystem.EncodingType` → TS2339 "Property 'EncodingType' does not exist". L'API principale d'expo-file-system v2 a migré vers une API différente ; l'ancienne API est dans le namespace `legacy`.  
**Fix** : utiliser `import * as FileSystem from 'expo-file-system/legacy'` pour accéder à `readAsStringAsync` et `EncodingType`. Valide aussi pour SDK 54.  
**Détecté** : TA-125 / 2026-05-09

---

### IMPORT-02 — Route Expo Router non incluse dans `.expo/types/router.d.ts` jusqu'au premier `expo start`
**Symptôme** : TS2345 sur `router.push('/(app)/import/hevy')` — la route n'est pas reconnue par le système de types Expo Router parce que le fichier `.expo/types/router.d.ts` est auto-généré au démarrage du dev server et n'inclut pas encore la nouvelle route.  
**Fix** : ajouter manuellement la route dans `.expo/types/router.d.ts` pour que le type check CI passe. Ce fichier est dans `.gitignore` et sera écrasé au prochain `expo start` — la route sera incluse automatiquement. Pas de hack `as any` nécessaire.  
**Détecté** : TA-125 / 2026-05-09

---

### IMPORT-03 — `importHevySessions` spécifiée dans `features/sync` par la spec mais appartient à `features/import`
**Symptôme** : La spec TA-126 plaçait `importHevySessions` dans `src/features/sync/api/`. Mais `feature-hooks` (import) ne peut pas importer d'un `feature-index` d'une autre feature, ce qui rendait impossible d'appeler le service depuis `use-hevy-import.ts` sans violer boundaries.  
**Fix** : placer le service dans `src/features/import/api/import-service.ts`. Les types associés (`ImportResult`, `HevyExerciseMapping`, etc.) dans `src/features/import/types/import-result.ts`. La SyncQueue est alimentée implicitement via `insertSession`/`insertSetLog` qui appellent `safeEnqueue` en interne — pas besoin d'importer `safeEnqueue` directement.  
**Règle** : le placement d'un service suit la feature qui le consomme logiquement, pas la spec de ticket (cf. ARCH-09).  
**Détecté** : TA-126 / 2026-05-12

---

### CALIB-01 — `computeE1rm` dupliquée entre `features/import` et `features/progression`
**Symptôme** : la formule Epley (`load * (1 + reps / 30)`) est déjà implémentée dans `src/features/progression/domain/progression-vs-previous.ts`. ESLint boundaries (`feature-domain` → seul `feature-domain` de la même feature autorisé) interdit un import cross-feature, même pour une fonction pure sans état.
**Fix TA-127** : dupliquer la fonction dans `src/features/import/domain/calibration.ts`. 3 lignes, coût minimal.
**Fix TA-132** : 4e usage détecté (feature `ai`). Migré vers `src/lib/epley.ts` (shared-lib). La feature `ai` importe depuis `@/lib/epley`. Les features `import` et `progression` conservent leur copie locale (coût de migration faible, formule stable).
**Règle** : si on migre un jour les copies restantes, supprimer la copie inline et pointer vers `@/lib/epley`.
**Détecté** : TA-127 / 2026-05-12 — **Partiellement résolu** : TA-132 / 2026-05-18

---

### AI-02 — Edge Function `ai-proxy` : `timeout_ms` non enforced côté serveur
**Symptôme** : l'Edge Function reçoit un champ `timeout_ms` dans le payload mais n'utilise pas d'`AbortSignal` sur le `fetch` vers Anthropic. En cas de réponse lente, le timeout effectif est celui de Supabase Edge Functions (~60 s). Le client (`ClaudeProvider`) coupe via son propre timeout et reçoit une erreur, mais la requête Anthropic peut continuer côté serveur après le retour client, consommant des tokens inutilement.
**Fix** : fonctionnellement acceptable pour le MVP. Si le coût devient un problème, brancher un `AbortSignal` : `const ac = new AbortController(); setTimeout(() => ac.abort(), body.timeout_ms); fetch(url, { signal: ac.signal })`.
**Détecté** : TA-131 / 2026-05-17

---

### AI-01 — Edge Function Deno exclue du tsconfig Expo/Node
**Symptôme** : `npx tsc --noEmit` échoue avec TS2307 (`jsr:@supabase/supabase-js@2`) et TS2304 (`Deno`) sur `supabase/functions/ai-proxy/index.ts`. Le tsconfig projet pointe vers le runtime Expo/Node — incompatible avec les imports JSR et les globals Deno.
**Fix** : ajouter `"supabase/functions/**/*"` dans `"exclude"` du `tsconfig.json` racine. Créer `supabase/functions/ai-proxy/deno.json` pour la configuration Deno locale. Le typecheck Deno se fait avec `deno check` (pas `tsc`).
**Règle** : les Edge Functions Supabase ne font jamais partie du scope `tsc` du projet Expo. Le lint/typecheck Deno est optionnel et séparé.
**Détecté** : TA-131 / 2026-05-17

---

### SYNC-04 — `useSyncStatus` retourne un snapshot du store, pas une vue réactive
**Symptôme** : `useSyncStatus` retourne `useSyncStore.getState()` en fin de fonction (snapshot one-shot) au lieu de `useSyncStore(s => s)`. Les composants qui appellent `useSyncStatus` directement ne se re-renderent pas quand le store change.
**Fix** : `SyncBridge` monte `useSyncStatus` (racine, pas pour le rendu). Les composants UI (`SyncStatusSection`) consomment directement `useSyncStore((s) => s.field)` — ce qui est réactif. Ne jamais appeler `useSyncStatus` depuis un composant UI.
**Règle** : `useSyncStatus` = hook d'orchestration (root layout uniquement). `useSyncStore` = source de vérité réactive pour les composants.
**Détecté** : TA-128 / 2026-05-12

---

---

### SYNC-05 — `safeEnqueue` + SyncService face à une table Supabase inexistante
**Symptôme** : si la migration Supabase `ai_context_profiles` n'est pas encore déployée et que le client appelle `refreshAIContextProfile`, `safeEnqueue` enfile l'upsert dans `sync_queue`. Lors du prochain `push()`, Supabase retourne une erreur `relation "ai_context_profiles" does not exist` (code `42P01`). `pushEntry` capture l'erreur (bloc `catch`), retourne `{ status: 'failed', error: message }`, et laisse l'entrée avec `synced=0` dans la queue.
**Comportement** : retry permanent à chaque `push()` jusqu'à ce que la migration soit déployée côté serveur. Pas de dead-letter, pas de TTL, pas d'expiration. L'entrée s'accumule (une par refresh) mais ne bloque pas les autres entrées de la queue (non fail-fast).
**Impact déploiement** : la migration Supabase `ai_context_profiles` DOIT être déployée avant le premier refresh client en production. Autrement, la queue grossit indéfiniment pour chaque utilisateur qui refresh son profil. Une fois la migration appliquée, les entrées accumulées seront poussées normalement au prochain sync (upsert idempotent via `onConflict: 'id'`).
**Détecté** : TA-132 review / 2026-05-18

---

### AI-03 — `user_profiles` table non créée en SQLite
**Symptôme** : `ai-context-service.ts` fait un SELECT sur `user_profiles WHERE user_id = ?` mais cette table n'existe pas encore en SQLite (pas de migration). Le service gère la dégradation gracieuse (null row → fallback values), mais le profil retourné sera toujours avec les defaults (`intermediate`, `hypertrophy`, `kg`).
**Fix attendu** : quand la saisie du profil utilisateur sera implémentée (écran onboarding/profil), créer la migration SQLite `user_profiles` et alimenter les champs. La signature `readUserProfile` dans `ai-context-service.ts` est déjà prête.
**Détecté** : TA-132 / 2026-05-18

---

### AI-04 — Signature `buildExplainAdjustmentPrompt` ne correspond pas à `AIProvider.explainAdjustment`
**Symptôme** : `buildExplainAdjustmentPrompt(ctx, recommendation: Recommendation)` attend deux paramètres, mais `AIProvider.explainAdjustment(context: AIContext)` dans `src/features/ai/api/ai-provider.ts:19` n'en accepte qu'un. Brancher le builder dans `ClaudeProvider.explainAdjustment` sans modifier l'interface lèvera une erreur TS (argument supplémentaire non déclaré).
**Fix attendu (TA-134)** : étendre la signature de `AIProvider.explainAdjustment` pour accepter `recommendation: Recommendation` en second paramètre. Mettre à jour `NullAIProvider` et `ClaudeProvider` en conséquence.
**Détecté** : TA-133 review / 2026-05-18

---

### AI-05 — Import transitif `@/features/auth` → `supabase.ts` dans les tests session
**Symptôme** : après ajout de `useAuthStore` dans `use-complete-session.ts` (ou tout composant session importé via `session/index.ts`), les suites de tests `session-live-screen.test.tsx` et `set-row-log-type-unilateral.test.tsx` échouent avec `SyntaxError: Cannot use import statement outside a module` sur `react-native-url-polyfill/auto`. La chaîne est `session/index.ts → end-session-screen.tsx → features/auth → api/auth.ts → services/supabase.ts`.
**Fix** : ne jamais importer `@/features/auth` depuis les hooks internes de la feature session (`feature-hooks`). Passer `userId` en paramètre du hook depuis l'appelant (composant ou écran) qui détient déjà la valeur via `useAuthStore`. Ajouter `jest.mock('@/features/auth', ...)` et `jest.mock('@/hooks/use-ai-context-refresh', ...)` dans les tests de composants session qui importent via `live.tsx`.
**Règle** : si un hook feature-session a besoin du userId, le recevoir en paramètre plutôt que d'importer `useAuthStore`. Cf. pitfall SYNC-01 (même catégorie de problème).
**Détecté** : TA-134 / 2026-05-19

---

### AI-06 — (supprimé) stub useCompleteBlock retiré (YAGNI)
`use-complete-block.ts` supprimé lors du patch TA-134 : aucun écran de fin de bloc n'existe. La story qui implémentera la transition Block → completed branchera `triggerAIContextRefresh` directement (pattern identique à `use-complete-session.ts`).
**Détecté** : TA-134 / 2026-05-19 — **Résolu** : patch TA-134

---

### AI-07 — throw synchrone avant retour de Promise non rattrapé par `.catch()` seul
**Symptôme** : si `refreshAIContextProfile` lève une exception synchrone (avant de retourner une Promise), le `.catch().finally()` n'est jamais attaché → `isRefreshing.current` reste bloqué à `true` indéfiniment, le hook devient mort.
**Fix** : wrapper l'appel dans un `try/catch` synchrone. En cas de throw, logger et reset le flag immédiatement. Si la Promise est bien retournée, attacher `.catch().finally()` comme d'habitude.
**Pattern** : `try { const p = fn(); p.catch(...).finally(...); } catch(e) { log(e); resetFlag(); }`
**Détecté** : TA-134 (review) / 2026-05-19

---

### AI-08 — `AIProvider.generateSessionSummary` ne throw jamais : fallback invisible
**Symptôme** : `ClaudeProvider.generateSessionSummary` catche toutes les erreurs (réseau, 429, parse) et délègue silencieusement au `FallbackProvider`. Depuis l'extérieur, l'appelant ne peut pas distinguer un résumé Claude réel d'un résumé fallback sans inspecter le contenu.
**Fix** : pour les cas d'usage qui ont besoin de savoir si Claude a été utilisé (ex: décider d'enqueuer un retry IA), appeler directement `supabase.functions.invoke('ai-proxy', ...)` sans passer par `AIProvider`. Le résultat est une erreur explicite si l'appel échoue, permettant d'appeler `FallbackProvider` et d'enqueuer le retry dans le `catch`.
**Règle** : `AIProvider.generateSessionSummary` convient pour les cas d'usage "je veux juste un résumé, peu importe la source". Pour les cas avec retry queue, contourner l'abstraction et appeler l'Edge Function directement.
**Détecté** : TA-135 / 2026-05-19

---

## Stubs ouverts

Points d'entrée existants dans l'UI non encore branchés sur leur cible. À consommer dans la story concernée.

| Stub | Fichier | Fonction | Story cible |
|------|---------|----------|-------------|
| `user_profiles` SQLite | `src/features/ai/api/ai-context-service.ts` | `readUserProfile` | Onboarding/profil utilisateur |
| Prompts inline `ClaudeProvider` | `src/features/ai/api/claude-provider.ts` | `generateBlockSummary`, `analyzePlateau` | TA-137+ (brancher les builders de TA-133 dans les prochains services) |
| Fin de bloc → refresh IA | _(stub supprimé — YAGNI)_ | brancher `triggerAIContextRefresh` depuis le futur écran de fin de bloc | Écran fin de bloc (non implémenté) |
| Queue de retry IA | `src/features/ai/api/retry-queue.ts` | `enqueueAIRetry` (INSERT seul) | TA-141 : orchestration retry, UPDATE Recommendation existante, status→done/failed |
| UI "Pourquoi ?" | _(ticket UI dédié)_ | `useExplainAdjustment` depuis `src/features/ai/hooks/use-explain-adjustment.ts` | Écran fin de séance / écran Aujourd'hui |

---

## Checklist reviewer (patterns à grepper avant ✅)

```bash
# Stubs de navigation non branchés
grep -r "Alert.alert('Phase" src/ app/

# API Web non compatible Hermes
grep -r "crypto\.randomUUID" src/ app/

# TODOs avec ticket référencé (à vérifier si le ticket est dans le scope)
grep -r "TODO TA-" src/ app/
```
