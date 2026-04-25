# Pièges & Stubs ouverts

Mis à jour par le dev à chaque fin de story. Lu par le dev avant de coder et par le reviewer avant de valider.

---

## Pièges techniques connus

### RN-01 — `crypto.randomUUID()` non disponible sur Hermes
**Symptôme** : `TypeError: crypto.randomUUID is not a function` au runtime.  
**Fix** : utiliser `generateUUID()` depuis `@/utils/uuid`.  
**Détecté** : TA-84 / 2026-04-25

### RN-02 — Fichiers `*.test.*` dans `app/` crashent Expo Router
**Symptôme** : crash runtime, Expo Router enregistre le test comme une route.  
**Fix** : placer les tests d'écrans dans `src/screens/<groupe>/` en miroir de `app/`.  
**Détecté** : CLAUDE.md (convention établie)

### RN-03 — `Alert.alert('Phase X', ...)` comme stub de navigation
**Pattern à bannir** : utiliser une alerte comme placeholder pour une route non implémentée.  
**Fix** : router.push vers la vraie route, ou laisser le bouton disabled avec un commentaire `// TODO TA-XX`.  
**Détecté** : TA-84 / 2026-04-25

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
