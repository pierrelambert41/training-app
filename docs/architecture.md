# Architecture technique

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────┐
│                  App Mobile                      │
│           React Native + Expo + TS               │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  UI/UX   │  │  State   │  │  Local DB     │  │
│  │  Screens │  │  Zustand │  │  SQLite       │  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │                │          │
│       └──────────────┼────────────────┘          │
│                      │                           │
│            ┌─────────┴──────────┐                │
│            │   Sync Engine      │                │
│            │   (offline-first)  │                │
│            └─────────┬──────────┘                │
└──────────────────────┼───────────────────────────┘
                       │
                       │ HTTPS
                       │
┌──────────────────────┼───────────────────────────┐
│                  Supabase                         │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │   Auth   │  │ Postgres │  │   Storage      │  │
│  └──────────┘  └────┬─────┘  └────────────────┘  │
│                     │                             │
│           ┌─────────┴──────────┐                  │
│           │  Edge Functions    │                  │
│           │  (moteur métier)   │                  │
│           └─────────┬──────────┘                  │
│                     │                             │
│           ┌─────────┴──────────┐                  │
│           │   AI Service       │                  │
│           │   (Claude API)     │                  │
│           └────────────────────┘                  │
└───────────────────────────────────────────────────┘
```

## 2. Architecture en 3 couches métier

### Couche 1 — Calculs (backend)
Le backend est la source de vérité pour tous les calculs :
- Volume total / par exercice / par groupe musculaire
- e1RM estimé
- Meilleure série
- Score de performance de séance
- Taux de complétion
- Évolution vs séance précédente / moyenne 4 semaines
- Fatigue score
- Strain score
- Progression score

### Couche 2 — Règles métier (backend)
Décisions automatisées basées sur les calculs :
- Hausse de charge
- Maintien
- Baisse
- Deload
- Adaptation séance suivante
- Remplacement exercice si nécessaire

Les règles sont **prédéfinies** par `progressionType` + `progressionConfig`. Pas de rule builder utilisateur.

### Couche 3 — IA (service séparé)
L'IA interprète et explique, elle ne calcule pas :
- Résumé de séance
- Explication humaine des ajustements
- Insights haut niveau
- Analyse de plateau
- Synthèse de bloc
- Cohérence avec le profil utilisateur

## 3. Offline-first

### Principe
L'app fonctionne sans réseau. Le logging en séance ne dépend jamais du backend ni de l'IA.

### Implémentation
- **SQLite local** (expo-sqlite) pour toutes les données de séance
- **Sync engine** : push des données locales vers Supabase au retour réseau
- **Conflict resolution** : last-write-wins avec timestamps + device ID
- **Queue de sync** : les mutations offline sont mises en queue et rejouées

### Ce qui fonctionne offline
- Logging de séance complet
- Timer repos
- Consultation du programme du jour
- Consultation des charges cibles
- Historique récent (cache local)

### Ce qui nécessite le réseau
- Sync des données
- Appels IA
- Import CSV / Hevy
- Auth initiale

## 4. Moteur de génération de programmes

### Flow utilisateur
1. L'utilisateur répond à un questionnaire :
   - Objectif (hypertrophie / force / mixte)
   - Fréquence (3-6 jours/semaine)
   - Niveau (débutant / intermédiaire / avancé)
   - Matériel disponible (salle complète / home gym / minimal)
   - Contraintes physiques
   - Exercices à éviter
2. Le moteur génère un programme structuré :
   - Bloc avec durée et objectif
   - Split adapté
   - Exercices sélectionnés depuis la bibliothèque standard
   - Rep ranges, RIR cibles, temps de repos
   - Règles de progression par exercice

### Architecture du moteur
- Templates de programmes par objectif/fréquence/niveau
- Sélection d'exercices basée sur les contraintes matériel/morpho
- Assignation automatique des `progressionType` + `progressionConfig`
- Détermination des charges initiales (si historique disponible)

## 5. Service IA

### Abstraction
```
AIProvider (interface)
├── ClaudeProvider (implémentation Claude API)
└── FallbackProvider (règles seules, pas d'appel LLM)
```

### Déclenchement
- **Automatique** : fin de séance, après sync, après mise à jour contexte
- **À la demande** : analyse de séance, explication, résumé de bloc

### Contexte fourni à l'IA
- Profil utilisateur structuré (JSON)
- 4-8 dernières séances
- Règles métier actives
- État du bloc courant
- Readiness / fatigue récente
- Dernières recommandations

### Fallback
Si l'IA ne répond pas, l'app continue avec les règles seules. Les recommandations de base fonctionnent sans IA.

## 6. Sécurité et auth

- Supabase Auth (email/password, éventuellement OAuth)
- Row Level Security (RLS) sur toutes les tables
- Les Edge Functions vérifient le JWT
- Pas de données sensibles en SQLite non chiffré (acceptable pour données d'entraînement)

## 7. Sync et cohérence

### Stratégie
- Chaque entité a un `updatedAt` timestamp
- Chaque mutation offline génère un enregistrement dans une queue locale
- Au retour réseau, la queue est rejouée séquentiellement
- Le serveur est la source de vérité finale après sync

### Gestion des conflits
- Last-write-wins basé sur `updatedAt`
- Les suppressions sont des soft deletes (`deletedAt`)
- Log de sync pour debugging

---

## 8. Architecture frontend (Bulletproof React)

L'architecture frontend suit le pattern **Bulletproof React** adapté à Expo Router. Le principe central : chaque fichier a une responsabilité unique et une place précise dans la hiérarchie.

### Layout cible

```
app/                          # Routes Expo Router (THIN, ≤ 30 lignes)
src/
  app/                        # Providers et init globaux (DBProvider, SessionHydrator, AuthGuard)
  features/<feature>/
    api/                      # I/O : repositories SQLite, fetchers Supabase, appels AI
    components/               # UI propre à la feature (screens, modals, widgets)
    hooks/                    # Hooks propres à la feature
    stores/                   # Zustand slices de la feature
    domain/                   # Logique métier pure (fonctions sans I/O, testables en isolation)
    types/                    # Types propres à la feature
    index.ts                  # Public API — seul point d'entrée autorisé de l'extérieur
  components/                 # UI réutilisable cross-features (design system, presentational)
  hooks/                      # Hooks transverses (use-db, use-debounce)
  lib/                        # Helpers techniques (uuid, supabase client, AI provider)
  config/                     # Constantes applicatives, tokens de thème
  types/                      # Types partagés entre features
```

Features identifiées : `auth`, `session`, `program`, `exercise`, `sync`, `ai`.

### Les 6 règles (R1–R6)

**R1 — Routes thin**
Chaque fichier `app/**/*.tsx` fait au maximum 30 lignes. Il importe une page depuis `src/features/<feat>/components/` (ou `src/app/`) et la ré-exporte comme default. Pas de JSX de business logic dans les routes.

**R2 — Hiérarchie d'imports stricte**
Le sens des imports est toujours descendant :
`app/route → src/app → src/features/<feat>/<segment> → src/components|hooks|lib|config`
Jamais l'inverse. Jamais horizontal entre features (un fichier de `features/session` n'importe pas directement dans `features/program`). Les dépendances cross-features transitent par `src/components` (UI partagée) ou `src/lib` (utilitaires).

**R3 — Public API via index.ts**
Chaque feature expose un `index.ts` qui liste explicitement ce qui est public. Tout import depuis l'extérieur de la feature passe par ce fichier. Les chemins profonds (`features/auth/stores/auth-store`) sont interdits depuis l'extérieur.

**R4 — Logique métier dans domain/**
Calculs, règles, scoring, progression, validations métier → `src/features/<feat>/domain/`. Ces fonctions sont pures (pas de I/O), testables sans React ni SQLite. Interdites dans `components/` ou `hooks/` UI.

**R5 — I/O dans api/**
Accès SQLite, appels Supabase, appels AI, notifications → `src/features/<feat>/api/`. Interdit dans `components/`. Consommé via `hooks/` (TanStack Query) ou `stores/` (Zustand actions).

**R6 — Taille des fichiers**
- Composant > 150 lignes → signal de split (non-bloquant, à examiner)
- Fichier > 250 lignes → alerte, justification requise dans la PR
- Fichier > 400 lignes → refacto obligatoire avant merge (bloquant strict)

### Anti-pattern de référence

`app/(app)/session/live.tsx` a atteint 2001 lignes avec 14 composants colocalisés. Voir `docs/pitfalls.md` §ARCH-01 pour le plan de migration (TA-98).
