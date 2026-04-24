# Modèle de données

## 1. Diagramme des relations

```
User
 ├── Profile
 ├── RecoveryLog[]
 ├── BodyMetric[]
 ├── CardioSession[]
 ├── AIContextProfile
 └── Program[]
      └── Block[]
           └── WorkoutDay[]
                └── PlannedExercise[]
                     └── progressionType + progressionConfig

Exercise (bibliothèque globale)

Session
 ├── SetLog[]
 └── Recommendation[]
```

## 2. Entités détaillées

### User
```sql
id              UUID PRIMARY KEY
email           TEXT NOT NULL UNIQUE
created_at      TIMESTAMPTZ DEFAULT now()
```

### UserProfile
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
display_name    TEXT
height_cm       NUMERIC
preferred_unit  TEXT CHECK (preferred_unit IN ('kg', 'lb'))
training_level  TEXT CHECK (training_level IN ('beginner', 'intermediate', 'advanced'))
goals           JSONB          -- { primary: 'hypertrophy', secondary: 'strength' }
constraints     JSONB          -- { injuries: [...], avoid_exercises: [...] }
equipment       JSONB          -- { type: 'full_gym' | 'home' | 'minimal', items: [...] }
sports_parallel JSONB          -- activités parallèles (course, etc.)
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### Exercise (bibliothèque globale)
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
name_fr         TEXT
category        TEXT NOT NULL   -- 'compound' | 'isolation' | 'bodyweight' | 'machine' | 'cable'
movement_pattern TEXT NOT NULL  -- 'horizontal_push' | 'vertical_push' | 'horizontal_pull' | 'vertical_pull' | 'hinge' | 'squat' | 'unilateral_quad' | 'unilateral_hinge' | 'isolation_upper' | 'isolation_lower' | 'core' | 'carry'
primary_muscles TEXT[] NOT NULL -- ['chest', 'triceps']
secondary_muscles TEXT[]
equipment       TEXT[]         -- ['barbell', 'bench']
log_type        TEXT NOT NULL  -- 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance_duration'
is_unilateral   BOOLEAN DEFAULT false
systemic_fatigue TEXT NOT NULL DEFAULT 'moderate' -- 'low' | 'moderate' | 'high' (fatigue systémique induite)
movement_stability TEXT NOT NULL DEFAULT 'stable' -- 'stable' | 'moderate' | 'variable' (facilité à standardiser et piloter)
morpho_tags     TEXT[]         -- ['long_femur_friendly', 'shoulder_friendly', 'short_arm_push_friendly', 'stable_progression', 'low_fatigue', 'axial_fatigue_high', 'hinge_dominant', 'quad_dominant', 'lat_bias', 'chest_bias']
recommended_progression_type TEXT -- 'strength_fixed' | 'double_progression' | 'accessory_linear' | 'bodyweight_progression' | 'duration_progression'
alternatives    UUID[]         -- IDs d'exercices alternatifs
coaching_notes  TEXT
tags            TEXT[]
is_custom       BOOLEAN DEFAULT false
created_by      UUID REFERENCES users(id) -- NULL si exercice standard
created_at      TIMESTAMPTZ DEFAULT now()
```

#### Notes sur les champs Exercise enrichis

- **movement_pattern** : classifie l'exercice par pattern biomécanique, pas par muscle. Permet au moteur de génération de construire des séances équilibrées par pattern plutôt que par liste d'exercices.
- **systemic_fatigue** : indique la fatigue globale induite (un squat lourd = high, un curl = low). Utilisé pour doser le volume total d'une séance et limiter les conflits fatigue.
- **movement_stability** : indique si l'exercice est facile à standardiser et piloter. Un mouvement "stable" (machine, poulie) est plus pilotable qu'un mouvement "variable" (kettlebell snatch). Le moteur privilégie les exercices stables pour les principaux.
- **morpho_tags** : tags de compatibilité morphologique. Le moteur de génération les utilise pour personnaliser la sélection d'exercices selon le profil de l'utilisateur.
- **recommended_progression_type** : le type de progression naturel de cet exercice. Le moteur l'utilise comme valeur par défaut lors de la génération d'un programme.

### Program
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
title           TEXT NOT NULL
goal            TEXT NOT NULL   -- 'hypertrophy' | 'strength' | 'mixed'
frequency       INTEGER        -- jours par semaine
level           TEXT           -- 'beginner' | 'intermediate' | 'advanced'
is_active       BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### Block
```sql
id              UUID PRIMARY KEY
program_id      UUID REFERENCES programs(id)
title           TEXT NOT NULL
goal            TEXT NOT NULL   -- 'hypertrophy' | 'strength' | 'peaking' | 'deload'
duration_weeks  INTEGER NOT NULL
week_number     INTEGER DEFAULT 1  -- semaine courante dans le bloc
start_date      DATE
end_date        DATE
status          TEXT DEFAULT 'planned' -- 'planned' | 'active' | 'deloaded' | 'completed'
deload_strategy TEXT NOT NULL DEFAULT 'fatigue_triggered' -- 'scheduled' | 'fatigue_triggered' | 'none'
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### WorkoutDay
```sql
id              UUID PRIMARY KEY
block_id        UUID REFERENCES blocks(id)
title           TEXT NOT NULL   -- ex: 'Push A', 'Upper 1'
day_order       INTEGER NOT NULL
split_type      TEXT           -- 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full'
estimated_duration_min INTEGER
created_at      TIMESTAMPTZ DEFAULT now()
```

### PlannedExercise
```sql
id              UUID PRIMARY KEY
workout_day_id  UUID REFERENCES workout_days(id)
exercise_id     UUID REFERENCES exercises(id)
exercise_order  INTEGER NOT NULL
role            TEXT NOT NULL   -- 'main' | 'secondary' | 'accessory'
sets            INTEGER NOT NULL
rep_range_min   INTEGER NOT NULL
rep_range_max   INTEGER NOT NULL
target_rir      INTEGER        -- RIR cible (ex: 2)
rest_seconds    INTEGER        -- temps de repos en secondes
tempo           TEXT           -- ex: '3-1-1-0'
progression_type TEXT NOT NULL  -- voir section 3
progression_config JSONB NOT NULL -- voir section 3
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### Session
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
workout_day_id  UUID REFERENCES workout_days(id)
block_id        UUID REFERENCES blocks(id)
date            DATE NOT NULL
started_at      TIMESTAMPTZ
ended_at        TIMESTAMPTZ
status          TEXT DEFAULT 'in_progress' -- 'in_progress' | 'completed' | 'abandoned'
readiness       INTEGER        -- /10
energy          INTEGER        -- /10
motivation      INTEGER        -- /10
sleep_quality   INTEGER        -- /10
pre_session_notes TEXT
completion_score NUMERIC       -- calculé post-séance
performance_score NUMERIC      -- calculé post-séance
fatigue_score   NUMERIC        -- calculé post-séance
post_session_notes TEXT
device_id       TEXT           -- pour sync/conflict resolution
synced_at       TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### SetLog
```sql
id              UUID PRIMARY KEY
session_id      UUID REFERENCES sessions(id)
exercise_id     UUID REFERENCES exercises(id)
planned_exercise_id UUID REFERENCES planned_exercises(id)
set_number      INTEGER NOT NULL
-- Données prévues
target_load     NUMERIC
target_reps     INTEGER
target_rir      INTEGER
-- Données réalisées
load            NUMERIC        -- poids en unité utilisateur
reps            INTEGER
rir             INTEGER        -- RIR réel
duration_seconds INTEGER       -- pour exercices en durée
distance_meters  NUMERIC       -- pour exercices en distance
-- Méta
completed       BOOLEAN DEFAULT true
side            TEXT           -- 'left' | 'right' | NULL
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### RecoveryLog
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
date            DATE NOT NULL
sleep_hours     NUMERIC
sleep_quality   INTEGER        -- /10
energy          INTEGER        -- /10
stress          INTEGER        -- /10
motivation      INTEGER        -- /10
soreness        INTEGER        -- /10 (courbatures)
joint_pain      INTEGER        -- /10 (douleur articulaire)
resting_hr      INTEGER        -- fréquence cardiaque au repos
hrv             NUMERIC        -- variabilité cardiaque
weight_kg       NUMERIC
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### BodyMetric
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
date            DATE NOT NULL
weight_kg       NUMERIC
chest_high_cm   NUMERIC
chest_low_cm    NUMERIC
shoulders_cm    NUMERIC
arm_relaxed_cm  NUMERIC
arm_flexed_cm   NUMERIC
waist_cm        NUMERIC
thigh_cm        NUMERIC
calf_cm         NUMERIC
photo_urls      TEXT[]
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### CardioSession
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
date            DATE NOT NULL
type            TEXT NOT NULL   -- 'easy' | 'tempo' | 'interval' | 'other'
distance_km     NUMERIC
duration_minutes NUMERIC
avg_pace        TEXT           -- ex: '5:30'
avg_hr          INTEGER
max_hr          INTEGER
rpe             INTEGER        -- /10
leg_impact      INTEGER        -- /10 (impact sur les jambes pour ajustement muscu)
fatigue_post    INTEGER        -- /10
source          TEXT           -- 'manual' | 'strava' | 'apple_health'
external_id     TEXT           -- ID Strava ou autre
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### Recommendation
```sql
id              UUID PRIMARY KEY
session_id      UUID REFERENCES sessions(id)
exercise_id     UUID REFERENCES exercises(id) -- NULL si recommandation globale
source          TEXT NOT NULL   -- 'rules_engine' | 'ai'
type            TEXT NOT NULL   -- 'load_change' | 'deload' | 'plateau' | 'fatigue_alert' | 'summary'
message         TEXT NOT NULL
next_load       NUMERIC
next_rep_target INTEGER
next_rir_target INTEGER
action          TEXT           -- 'increase' | 'maintain' | 'decrease' | 'deload' | 'replace'
confidence      NUMERIC        -- 0-1
metadata        JSONB          -- données supplémentaires
created_at      TIMESTAMPTZ DEFAULT now()
```

### AIContextProfile
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id) UNIQUE
profile_json    JSONB NOT NULL  -- voir docs/ai-strategy.md pour le format
version         INTEGER DEFAULT 1
updated_at      TIMESTAMPTZ DEFAULT now()
```

### SyncQueue (locale uniquement — SQLite)
```sql
id              INTEGER PRIMARY KEY AUTOINCREMENT
table_name      TEXT NOT NULL
record_id       TEXT NOT NULL
action          TEXT NOT NULL   -- 'insert' | 'update' | 'delete'
payload         TEXT NOT NULL   -- JSON
created_at      TEXT NOT NULL
synced          INTEGER DEFAULT 0
```

## 3. Types de progression

### Catalogue des types

| Type | Usage | Logique |
|---|---|---|
| `strength_fixed` | Composés force (5x3, 5x5) | +incr si toutes séries réussies + RIR >= 2 |
| `double_progression` | Composés volume (4x6-8) | Monter reps puis charge quand haut de fourchette atteint |
| `accessory_linear` | Accessoires | +incr quand haut de fourchette sur toutes séries |
| `bodyweight_progression` | Dips, tractions, etc. | Augmenter reps, puis ajouter lest |
| `duration_progression` | Planches, iso holds | Augmenter durée |
| `distance_duration` | Cardio structuré | Augmenter distance ou réduire temps |

### Format de progressionConfig

#### strength_fixed
```json
{
  "increment_upper_kg": 1.25,
  "increment_lower_kg": 2.5,
  "rir_threshold_increase": 2,
  "failures_before_reset": 2,
  "reset_delta_kg": -2.5
}
```

#### double_progression
```json
{
  "increment_kg": 2.5,
  "min_reps": 6,
  "max_reps": 8,
  "all_sets_at_max_to_increase": true,
  "regressions_before_alert": 2
}
```

#### accessory_linear
```json
{
  "increment_kg": 1.25,
  "min_reps": 10,
  "max_reps": 15,
  "all_sets_at_max_to_increase": true
}
```

## 4. Index recommandés

```sql
-- Performance requêtes fréquentes
CREATE INDEX idx_sessions_user_date ON sessions(user_id, date DESC);
CREATE INDEX idx_set_logs_session ON set_logs(session_id);
CREATE INDEX idx_set_logs_exercise ON set_logs(exercise_id);
CREATE INDEX idx_recovery_logs_user_date ON recovery_logs(user_id, date DESC);
CREATE INDEX idx_blocks_program ON blocks(program_id);
CREATE INDEX idx_workout_days_block ON workout_days(block_id);
CREATE INDEX idx_planned_exercises_workout_day ON planned_exercises(workout_day_id);
CREATE INDEX idx_recommendations_session ON recommendations(session_id);
```
