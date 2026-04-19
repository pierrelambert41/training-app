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
