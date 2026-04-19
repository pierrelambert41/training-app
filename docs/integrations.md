# Intégrations tierces

## 1. Vue d'ensemble

| Intégration | Priorité | Phase | Type |
|---|---|---|---|
| Import CSV / Hevy | Très haute | MVP-core | Import de données |
| Apple Health | Haute | V2 | Lecture de données |
| Strava | Haute | V2 | Lecture de données |
| Apple Watch | Moyenne | V2+ | Companion app |
| Polar H9 | Moyenne | V2+ | Via Apple Health |
| Garmin | Basse | Future | Lecture de données |
| Health Connect Android | Basse | Future | Lecture de données |

## 2. Import CSV / Hevy (MVP-core)

### Objectif
Importer l'historique existant pour ne pas repartir à zéro et calibrer les charges initiales.

### Fonctionnement
1. L'utilisateur exporte ses données depuis Hevy (ou autre app) en CSV
2. L'app parse le fichier
3. Mapping des exercices : correspondance entre noms Hevy et bibliothèque interne
4. L'utilisateur valide/corrige les mappings ambigus
5. Import des séances, sets, charges, reps
6. Calcul des baselines (e1RM, charges de référence)

### Format Hevy CSV attendu
```csv
Date,Exercise Name,Set Order,Weight,Reps,RPE,Notes
```

### Gestion des cas edge
- Exercice Hevy sans correspondance → l'utilisateur mappe manuellement ou crée l'exercice
- Unités différentes → conversion automatique kg/lb selon les préférences
- Données incomplètes (pas de RPE, pas de notes) → import partiel accepté
- Doublons → détection par date + exercice + set order

### Données extraites pour calibration
- e1RM par exercice (basé sur les meilleures séries)
- Charge moyenne récente (4 dernières semaines)
- Volume habituel
- Fréquence d'entraînement

## 3. Apple Health (V2)

### Objectif
Enrichir la lecture de readiness et fatigue avec des données physiologiques.

### Données à lire
| Donnée | Usage | Priorité |
|---|---|---|
| Fréquence cardiaque au repos | Indicateur fatigue | Haute |
| HRV | Indicateur readiness | Haute |
| Sommeil (durée + qualité) | RecoveryLog | Haute |
| Poids | BodyMetric | Haute |
| Calories actives | Contexte | Moyenne |
| Séances cardio | CardioSession | Moyenne |

### Implémentation
- Package : `react-native-health` (iOS) ou équivalent Expo
- Permissions : lecture seule, demandées au setup
- Sync : pull quotidien automatique ou à la demande
- Les données Apple Health alimentent directement le RecoveryLog et le fatigue score

### Contraintes
- iOS uniquement
- Permissions granulaires à demander
- Pas d'écriture dans Apple Health (lecture seule)

## 4. Strava (V2)

### Objectif
Récupérer les séances cardio pour alimenter le score fatigue et centraliser l'historique.

### Données à lire
| Donnée | Mapping |
|---|---|
| Type d'activité | CardioSession.type |
| Distance | CardioSession.distance_km |
| Durée | CardioSession.duration_minutes |
| Allure moyenne | CardioSession.avg_pace |
| FC moyenne | CardioSession.avg_hr |
| FC max | CardioSession.max_hr |

### Implémentation
- OAuth 2.0 pour l'authentification
- Webhook Strava pour les nouvelles activités
- Fallback : pull périodique via API
- Mapping automatique des activités en CardioSession
- L'utilisateur peut annoter l'impact jambes (leg_impact) et la fatigue post

### Contraintes
- Rate limits Strava API (100 requêtes / 15 min)
- Webhook nécessite un endpoint public (Edge Function Supabase)
- Ne pas dupliquer avec Apple Health (déduplication par date + type + durée)

## 5. Polar H9

### Réalité produit
Le Polar H9 se connecte via Bluetooth aux apps compatibles (Polar Beat, Strava, Apple Watch). Il n'y a pas d'API directe utile.

### Stratégie
Ne pas se connecter au H9 directement. Récupérer les données via :
- Apple Health (si le H9 est connecté à Apple Watch ou Polar Beat)
- Strava (si l'activité est enregistrée via Strava)

### Donc
Pas de développement spécifique H9. La couverture vient des intégrations Apple Health et Strava.

## 6. Apple Watch (V2+)

### Objectif potentiel
- Logging simplifié depuis le poignet (start/stop séance, log rapide)
- Affichage du prochain set
- Timer repos sur la montre

### Réalité
- Nécessite une companion app WatchOS
- Expo ne supporte pas nativement WatchOS
- Requiert du développement Swift natif
- Complexité significative

### Décision
Reporté. Ne sera envisagé que si le besoin est confirmé après plusieurs mois d'utilisation de l'app mobile.

## 7. Architecture d'intégration

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Apple      │     │  Strava     │     │  CSV File   │
│  Health     │     │  API        │     │  (Hevy)     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────┐
│              Integration Layer                        │
│                                                       │
│  HealthAdapter    StravaAdapter    CSVImporter        │
│                                                       │
│  - normalize()    - normalize()   - parse()          │
│  - deduplicate()  - deduplicate() - mapExercises()   │
│  - sync()         - sync()        - import()         │
└──────────────────────────┬───────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   App Data   │
                    │   Layer      │
                    └──────────────┘
```

Chaque adaptateur normalise les données dans le format interne de l'app. La déduplication est systématique (par date + type + source).
