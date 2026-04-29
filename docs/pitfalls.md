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

## Stubs ouverts

Points d'entrée existants dans l'UI non encore branchés sur leur cible. À consommer dans la story concernée.

| Stub | Fichier | Fonction | Story cible |
|------|---------|----------|-------------|
| Détail exercice | `src/screens/(app)/programs/workout-day-detail-screen.tsx` | `handleExercisePress` | Phase 5 |

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
