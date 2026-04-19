# Stack technique

## 1. App mobile

| Technologie | Rôle | Justification |
|---|---|---|
| **React Native** | Framework mobile | Cross-platform, un seul codebase iOS/Android |
| **Expo** | Tooling & runtime | DX rapide, OTA updates, accès natif simplifié |
| **TypeScript** | Langage | Typage fort, maintenabilité, cohérence full-stack |
| **Zustand** | State management | Léger, simple, performant, bon support TS |
| **TanStack Query** | Data fetching & cache | Cache intelligent, sync, retry, mutations |
| **NativeWind** | UI styling | Tailwind sur React Native, rapidité de développement |
| **expo-sqlite** | Base locale | Offline-first, données de séance persistantes |
| **expo-router** | Navigation | File-based routing, cohérent avec Expo |
| **React Hook Form** | Formulaires | Performance, validation, UX formulaires complexes |

## 2. Backend / données

| Technologie | Rôle | Justification |
|---|---|---|
| **Supabase** | Backend-as-a-Service | Auth + Postgres + Storage + Edge Functions, gain de temps énorme |
| **PostgreSQL** | Base de données | Via Supabase, robuste, requêtes complexes, RLS |
| **Edge Functions** | Logique serveur | Moteur métier, calculs, appels IA |

### Pourquoi Supabase
- Auth prête en quelques minutes
- Postgres managé avec RLS
- Storage pour photos/exports
- Edge Functions pour la logique métier
- Excellent fit pour une petite équipe rapide
- SDK TypeScript natif

## 3. IA

| Technologie | Rôle | Justification |
|---|---|---|
| **Claude API** | LLM principal | Qualité de raisonnement, bon sur le contexte long |
| **Abstraction AIProvider** | Interface | Permet de changer de provider sans refactor |

## 4. Outils de développement

| Outil | Rôle |
|---|---|
| **Claude Code** | Assistant développement |
| **EAS Build** | Build iOS/Android |
| **EAS Submit** | Publication stores |
| **Expo Dev Client** | Debug natif |

## 5. Intégrations futures (V2)

| Technologie | Rôle | Priorité |
|---|---|---|
| **react-native-health** | Apple Health | Haute |
| **Strava API** | Import cardio | Haute |
| **CSV parser** | Import Hevy/Fitbod | Très haute (MVP) |

## 6. Ce qu'on ne fait PAS

- **Pas de web app** comme produit principal
- **Pas de Next.js** — le produit est mobile
- **Pas de natif pur** (Swift/Kotlin) — sauf si des limites RN bloquent plus tard
- **Pas de Firebase** — Supabase est plus adapté (Postgres > Firestore pour ce cas)
- **Pas de Redux** — Zustand suffit largement
- **Pas de GraphQL** — Supabase SDK + REST suffisent

## 7. Contraintes techniques à garder en tête

- **Performance du logger** : le rendu de l'écran de séance doit être instantané, pas de lag sur la saisie
- **Taille de la DB locale** : surveiller la croissance SQLite sur des mois d'utilisation
- **Sync conflicts** : tester les cas edge (même séance modifiée sur 2 devices)
- **Cold start Edge Functions** : peut impacter la latence des appels IA fin de séance
- **Expo SDK upgrades** : planifier les mises à jour régulièrement
