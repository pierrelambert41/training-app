# Règles métier — Moteur de progression et d'ajustement

## 1. Philosophie

Le moteur principal est **rules-based**. Les décisions de charges sont pilotées par des règles robustes et déterministes. L'IA intervient uniquement pour expliquer, résumer et détecter des patterns de haut niveau.

Le backend calcule. L'IA interprète.

## 2. Types de progression

### 2.1 strength_fixed

**Usage** : exercices composés en force (bench 5x3, squat 5x5, etc.)

| Condition | Décision |
|---|---|
| Toutes séries réussies + dernier set RIR >= 2 | Augmenter charge (+increment) |
| Toutes séries réussies + RIR 0-1 | Maintenir charge |
| 1 série échouée | Maintenir charge |
| 2 séances consécutives échouées | Reset charge (-reset_delta) |

**Paramètres** : `increment_upper_kg`, `increment_lower_kg`, `rir_threshold_increase`, `failures_before_reset`, `reset_delta_kg`

### 2.2 double_progression

**Usage** : exercices composés en volume (4x6-8, 3x8-12, etc.)

| Condition | Décision |
|---|---|
| Toutes séries au max de la fourchette | Augmenter charge (+increment), reset reps au min |
| Progression partielle (certaines séries montent) | Maintenir charge, continuer à monter les reps |
| Régression 2x consécutives | Alerte fatigue, maintenir ou alléger |

**Paramètres** : `increment_kg`, `min_reps`, `max_reps`, `all_sets_at_max_to_increase`, `regressions_before_alert`

### 2.3 accessory_linear

**Usage** : exercices accessoires (curls, extensions, etc.)

| Condition | Décision |
|---|---|
| Haut de fourchette atteint sur toutes les séries | Augmenter charge (+increment minimum) |
| Progression partielle | Maintenir |
| Douleur ou technique dégradée (noté par l'utilisateur) | Maintien ou remplacement suggéré |

**Paramètres** : `increment_kg`, `min_reps`, `max_reps`, `all_sets_at_max_to_increase`

### 2.4 bodyweight_progression

**Usage** : dips, tractions, pompes, etc.

| Condition | Décision |
|---|---|
| Haut de fourchette atteint | Ajouter du lest (+increment) |
| Reps insuffisantes | Maintenir |
| Lest ajouté + reps trop basses | Revenir au poids de corps |

### 2.5 duration_progression

**Usage** : planches, isométriques, etc.

| Condition | Décision |
|---|---|
| Durée cible atteinte | Augmenter durée (+increment) |
| En dessous de la cible | Maintenir |

### 2.6 distance_duration

**Usage** : cardio structuré intégré au programme

| Condition | Décision |
|---|---|
| Distance/temps cible atteints | Augmenter distance ou réduire temps |
| En dessous | Maintenir |

## 3. Règles de fatigue

### 3.1 Indicateurs de fatigue

| Indicateur | Source | Poids |
|---|---|---|
| Performance en baisse sur 2+ séances | SetLog | Fort |
| RIR systématiquement 0-1 sans progression | SetLog | Fort |
| RecoveryLog : sommeil < 6h, énergie < 4/10 | RecoveryLog | Moyen |
| RecoveryLog : courbatures > 7/10 | RecoveryLog | Moyen |
| Readiness pré-séance < 4/10 | Session | Moyen |
| Cardio à impact élevé la veille | CardioSession | Faible-Moyen |
| Assiduité irrégulière (< 75% du plan) | Session | Faible |

### 3.2 Fatigue score

Score composite calculé à partir des indicateurs ci-dessus :
- **0-3** : fraîcheur, progression normale
- **4-6** : vigilance, progression prudente
- **7-8** : fatigue significative, séance allégée recommandée
- **9-10** : deload recommandé

### 3.3 Décisions fatigue

| Fatigue score | Action |
|---|---|
| 0-3 | Progression normale |
| 4-6 | Progression maintenue, monitoring accru |
| 7-8 | Séance allégée : -10% charge, -1 série par exercice |
| 9-10 | Deload : -30-40% charge, volume réduit, 1 semaine |

### 3.4 Deload — 3 modes

Le bloc définit sa `deload_strategy` parmi 3 modes :

#### Mode `scheduled`
- Deload programmé à une semaine fixe du bloc (typiquement semaine 5 ou 7)
- Se déclenche indépendamment de la fatigue
- Adapté aux blocs avancés avec volume élevé planifié

#### Mode `fatigue_triggered` (défaut)
- Pas de deload programmé à l'avance
- Le moteur déclenche un deload quand les conditions sont réunies :
  - Fatigue score >= 9 pendant 2+ jours
  - 3+ séances consécutives avec performance en baisse
  - Fatigue score >= 7 + assiduité en baisse
- Adapté à la majorité des utilisateurs et des blocs
- Permet de ne pas deload inutilement si l'utilisateur récupère bien

#### Mode `none`
- Pas de deload automatique
- L'utilisateur peut toujours en demander un manuellement
- Réservé aux blocs courts (3-4 semaines) ou aux deloads entre blocs

#### Déclenchement commun à tous les modes
- L'utilisateur peut toujours demander un deload explicitement
- Le moteur peut recommander un deload même en mode `none` (recommandation sans forçage)

#### Format du deload
- 1 semaine
- Charges réduites de 30-40%
- Volume réduit (moins de séries, typiquement -1 à -2 par exercice)
- Même structure d'exercices (pas de changement)
- RIR cible 4+
- Objectif : récupération, pas stimulation

#### Choix du mode par défaut selon le contexte

| Niveau | Durée bloc | Mode par défaut |
|---|---|---|
| Débutant | 4-6 sem | `fatigue_triggered` |
| Intermédiaire | 6 sem | `fatigue_triggered` |
| Avancé | 6-8 sem | `scheduled` (semaine 5 ou 7) |
| Tout niveau | 3-4 sem | `none` (deload entre blocs si nécessaire) |

## 4. Statut de séance

Avant chaque séance, le moteur détermine un statut :

| Statut | Condition | Impact |
|---|---|---|
| `progression` | Fatigue basse, dernière séance réussie | Charges cibles augmentées selon les règles |
| `maintien` | Fatigue moyenne ou dernière séance mitigée | Charges identiques à la dernière séance |
| `allegee` | Fatigue haute | Charges réduites de 10% |
| `prudente` | Retour de blessure ou longue pause | Charges réduites de 20% |
| `aggressive` | Fraîcheur élevée + progression constante | Possibilité de push supplémentaire |
| `deload` | Deload programmé ou déclenché | Charges réduites de 30-40% |

## 5. Score de performance de séance

Calculé à la fin de chaque séance :

```
performance_score = (
  completion_rate * 0.3 +          -- % séries complétées
  target_achievement * 0.3 +       -- % charge/reps atteints vs cible
  rir_accuracy * 0.2 +             -- écart entre RIR cible et réel
  progression_vs_previous * 0.2    -- amélioration vs dernière séance
) * 10
```

| Score | Interprétation |
|---|---|
| 8-10 | Séance excellente |
| 6-8 | Séance réussie |
| 4-6 | Séance moyenne |
| 2-4 | Séance difficile |
| 0-2 | Séance ratée |

## 6. Détection de plateau

Un exercice est en plateau si :
- Charge identique depuis 3+ séances
- Reps identiques depuis 3+ séances
- Pas de progression malgré RIR >= 2
- Pas de facteur fatigue évident

Actions recommandées :
1. Vérifier la technique (note pour l'utilisateur)
2. Proposer une variante de l'exercice
3. Ajuster le rep range
4. Modifier le tempo
5. Si plateau persistant (6+ séances) : remplacement d'exercice

## 7. Calculs standards

### e1RM (Estimated 1 Rep Max)
Formule Epley : `e1RM = load * (1 + reps / 30)`

### Volume par groupe musculaire
`volume = Σ (sets * reps * load)` par groupe musculaire par semaine

### Strain score
Impact cumulé de la séance tenant compte du volume, de l'intensité relative, et de la proximité de l'échec.
