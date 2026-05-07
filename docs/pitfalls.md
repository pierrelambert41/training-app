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

### ARCH-04 — `feature-types` ne peut pas importer `shared-components`
**Symptôme** : ESLint `boundaries/dependencies` bloque `src/features/<feat>/types/*.ts` → `src/components/**/*` (shared-components). La règle implicite `default: 'disallow'` s'applique.
**Fix** : si un type feature a besoin d'un type défini dans shared-components (ex: `DisplaySessionStatus`), redéfinir localement l'union de strings dans le fichier de types feature. Éviter les imports ascendants (types → UI components).
**Détecté** : TA-111 / 2026-05-06

---

### UX-01 — `metadata.currentLoad` absent des Recommendation `load_change`
**Symptôme** : les lignes `exercice Xkg → Ykg` de l'écran fin de séance affichent `—kg → Ykg` car le rules engine ne persiste pas `currentLoad` dans `metadata` au moment de la sauvegarde. Le `nextLoad` est correct.
**Fix attendu** : dans `rules-engine-service.ts`, calculer `currentLoad` depuis les SetLogs de la séance courante (moyenne des charges loggées pour cet exercice) et l'ajouter à `metadata` lors de `saveRecommendation` (type `load_change`).
**Détecté** : TA-112 / 2026-05-06 — stub laissé ouvert.

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

## Stubs ouverts

Points d'entrée existants dans l'UI non encore branchés sur leur cible. À consommer dans la story concernée.

| Stub | Fichier | Fonction | Story cible |
|------|---------|----------|-------------|
| `currentLoad` dans metadata load_change | `src/features/progression/api/rules-engine-service.ts` | `saveRecommendation` (load_change) | Phase 6 ou cleanup |

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
