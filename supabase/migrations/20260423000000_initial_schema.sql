-- ============================================================
-- TA-8: Schéma initial Training App
-- Source de vérité : docs/data-model.md
-- ============================================================
-- Note: auth.users est géré par Supabase Auth.
-- Toutes les tables user-scoped referencent auth.users(id).
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: user_profiles
-- ============================================================
CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  height_cm       NUMERIC,
  preferred_unit  TEXT NOT NULL DEFAULT 'kg'
                  CHECK (preferred_unit IN ('kg', 'lb')),
  training_level  TEXT NOT NULL DEFAULT 'beginner'
                  CHECK (training_level IN ('beginner', 'intermediate', 'advanced')),
  goals           JSONB NOT NULL DEFAULT '{"primary": "hypertrophy"}'::jsonb,
  constraints     JSONB NOT NULL DEFAULT '{"injuries": [], "avoid_exercises": []}'::jsonb,
  equipment       JSONB NOT NULL DEFAULT '{"type": "full_gym", "items": []}'::jsonb,
  sports_parallel JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ============================================================
-- TABLE: exercises (bibliothèque globale — pas de user_id)
-- ============================================================
CREATE TABLE exercises (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                        TEXT NOT NULL,
  name_fr                     TEXT,
  category                    TEXT NOT NULL
                              CHECK (category IN ('compound', 'isolation', 'bodyweight', 'machine', 'cable')),
  movement_pattern            TEXT NOT NULL
                              CHECK (movement_pattern IN (
                                'horizontal_push', 'vertical_push',
                                'horizontal_pull', 'vertical_pull',
                                'hinge', 'squat',
                                'unilateral_quad', 'unilateral_hinge',
                                'isolation_upper', 'isolation_lower',
                                'core', 'carry'
                              )),
  primary_muscles             TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles           TEXT[] NOT NULL DEFAULT '{}',
  equipment                   TEXT[] NOT NULL DEFAULT '{}',
  log_type                    TEXT NOT NULL
                              CHECK (log_type IN ('weight_reps', 'bodyweight_reps', 'duration', 'distance_duration')),
  is_unilateral               BOOLEAN NOT NULL DEFAULT false,
  systemic_fatigue            TEXT NOT NULL DEFAULT 'moderate'
                              CHECK (systemic_fatigue IN ('low', 'moderate', 'high')),
  movement_stability          TEXT NOT NULL DEFAULT 'stable'
                              CHECK (movement_stability IN ('stable', 'moderate', 'variable')),
  morpho_tags                 TEXT[] NOT NULL DEFAULT '{}',
  recommended_progression_type TEXT
                              CHECK (recommended_progression_type IN (
                                'strength_fixed', 'double_progression', 'accessory_linear',
                                'bodyweight_progression', 'duration_progression', 'distance_duration'
                              )),
  alternatives                UUID[] NOT NULL DEFAULT '{}',
  coaching_notes              TEXT,
  tags                        TEXT[] NOT NULL DEFAULT '{}',
  is_custom                   BOOLEAN NOT NULL DEFAULT false,
  created_by                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: programs
-- ============================================================
CREATE TABLE programs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  goal        TEXT NOT NULL CHECK (goal IN ('hypertrophy', 'strength', 'mixed')),
  frequency   INTEGER CHECK (frequency BETWEEN 1 AND 7),
  level       TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  is_active   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: blocks
-- ============================================================
CREATE TABLE blocks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id       UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  goal             TEXT NOT NULL CHECK (goal IN ('hypertrophy', 'strength', 'peaking', 'deload')),
  duration_weeks   INTEGER NOT NULL CHECK (duration_weeks > 0),
  week_number      INTEGER NOT NULL DEFAULT 1 CHECK (week_number > 0),
  start_date       DATE,
  end_date         DATE,
  status           TEXT NOT NULL DEFAULT 'planned'
                   CHECK (status IN ('planned', 'active', 'completed')),
  deload_strategy  TEXT NOT NULL DEFAULT 'fatigue_triggered'
                   CHECK (deload_strategy IN ('scheduled', 'fatigue_triggered', 'none')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: workout_days
-- ============================================================
CREATE TABLE workout_days (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id               UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  day_order              INTEGER NOT NULL CHECK (day_order >= 0),
  split_type             TEXT CHECK (split_type IN ('push', 'pull', 'legs', 'upper', 'lower', 'full')),
  estimated_duration_min INTEGER CHECK (estimated_duration_min > 0),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: planned_exercises
-- ============================================================
CREATE TABLE planned_exercises (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_day_id     UUID NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id        UUID NOT NULL REFERENCES exercises(id),
  exercise_order     INTEGER NOT NULL CHECK (exercise_order >= 0),
  role               TEXT NOT NULL CHECK (role IN ('main', 'secondary', 'accessory')),
  sets               INTEGER NOT NULL CHECK (sets > 0),
  rep_range_min      INTEGER NOT NULL CHECK (rep_range_min > 0),
  rep_range_max      INTEGER NOT NULL CHECK (rep_range_max >= rep_range_min),
  target_rir         INTEGER CHECK (target_rir BETWEEN 0 AND 5),
  rest_seconds       INTEGER CHECK (rest_seconds > 0),
  tempo              TEXT,
  progression_type   TEXT NOT NULL
                     CHECK (progression_type IN (
                       'strength_fixed', 'double_progression', 'accessory_linear',
                       'bodyweight_progression', 'duration_progression', 'distance_duration'
                     )),
  progression_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: sessions
-- ============================================================
CREATE TABLE sessions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_day_id     UUID REFERENCES workout_days(id) ON DELETE SET NULL,
  block_id           UUID REFERENCES blocks(id) ON DELETE SET NULL,
  date               DATE NOT NULL,
  started_at         TIMESTAMPTZ,
  ended_at           TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'in_progress'
                     CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  readiness          INTEGER CHECK (readiness BETWEEN 1 AND 10),
  energy             INTEGER CHECK (energy BETWEEN 1 AND 10),
  motivation         INTEGER CHECK (motivation BETWEEN 1 AND 10),
  sleep_quality      INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  pre_session_notes  TEXT,
  completion_score   NUMERIC CHECK (completion_score BETWEEN 0 AND 100),
  performance_score  NUMERIC CHECK (performance_score BETWEEN 0 AND 100),
  fatigue_score      NUMERIC CHECK (fatigue_score BETWEEN 0 AND 100),
  post_session_notes TEXT,
  device_id          TEXT,
  synced_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: set_logs
-- ============================================================
CREATE TABLE set_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id          UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id         UUID NOT NULL REFERENCES exercises(id),
  planned_exercise_id UUID REFERENCES planned_exercises(id) ON DELETE SET NULL,
  set_number          INTEGER NOT NULL CHECK (set_number > 0),
  target_load         NUMERIC CHECK (target_load >= 0),
  target_reps         INTEGER CHECK (target_reps > 0),
  target_rir          INTEGER CHECK (target_rir BETWEEN 0 AND 5),
  load                NUMERIC CHECK (load >= 0),
  reps                INTEGER CHECK (reps >= 0),
  rir                 INTEGER CHECK (rir BETWEEN 0 AND 10),
  duration_seconds    INTEGER CHECK (duration_seconds > 0),
  distance_meters     NUMERIC CHECK (distance_meters > 0),
  completed           BOOLEAN NOT NULL DEFAULT true,
  side                TEXT CHECK (side IN ('left', 'right')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: recommendations
-- ============================================================
CREATE TABLE recommendations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id     UUID REFERENCES exercises(id) ON DELETE SET NULL,
  source          TEXT NOT NULL CHECK (source IN ('rules_engine', 'ai')),
  type            TEXT NOT NULL CHECK (type IN ('load_change', 'deload', 'plateau', 'fatigue_alert', 'summary')),
  message         TEXT NOT NULL,
  next_load       NUMERIC CHECK (next_load >= 0),
  next_rep_target INTEGER CHECK (next_rep_target > 0),
  next_rir_target INTEGER CHECK (next_rir_target BETWEEN 0 AND 5),
  action          TEXT CHECK (action IN ('increase', 'maintain', 'decrease', 'deload', 'replace')),
  confidence      NUMERIC CHECK (confidence BETWEEN 0 AND 1),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: recovery_logs
-- ============================================================
CREATE TABLE recovery_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  sleep_hours   NUMERIC CHECK (sleep_hours BETWEEN 0 AND 24),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  energy        INTEGER CHECK (energy BETWEEN 1 AND 10),
  stress        INTEGER CHECK (stress BETWEEN 1 AND 10),
  motivation    INTEGER CHECK (motivation BETWEEN 1 AND 10),
  soreness      INTEGER CHECK (soreness BETWEEN 1 AND 10),
  joint_pain    INTEGER CHECK (joint_pain BETWEEN 1 AND 10),
  resting_hr    INTEGER CHECK (resting_hr > 0),
  hrv           NUMERIC CHECK (hrv > 0),
  weight_kg     NUMERIC CHECK (weight_kg > 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- ============================================================
-- TABLE: body_metrics
-- ============================================================
CREATE TABLE body_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  weight_kg       NUMERIC CHECK (weight_kg > 0),
  chest_high_cm   NUMERIC CHECK (chest_high_cm > 0),
  chest_low_cm    NUMERIC CHECK (chest_low_cm > 0),
  shoulders_cm    NUMERIC CHECK (shoulders_cm > 0),
  arm_relaxed_cm  NUMERIC CHECK (arm_relaxed_cm > 0),
  arm_flexed_cm   NUMERIC CHECK (arm_flexed_cm > 0),
  waist_cm        NUMERIC CHECK (waist_cm > 0),
  thigh_cm        NUMERIC CHECK (thigh_cm > 0),
  calf_cm         NUMERIC CHECK (calf_cm > 0),
  photo_urls      TEXT[] NOT NULL DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: cardio_sessions
-- ============================================================
CREATE TABLE cardio_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('easy', 'tempo', 'interval', 'other')),
  distance_km      NUMERIC CHECK (distance_km > 0),
  duration_minutes NUMERIC CHECK (duration_minutes > 0),
  avg_pace         TEXT,
  avg_hr           INTEGER CHECK (avg_hr > 0),
  max_hr           INTEGER CHECK (max_hr > 0),
  rpe              INTEGER CHECK (rpe BETWEEN 1 AND 10),
  leg_impact       INTEGER CHECK (leg_impact BETWEEN 1 AND 10),
  fatigue_post     INTEGER CHECK (fatigue_post BETWEEN 1 AND 10),
  source           TEXT NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('manual', 'strava', 'apple_health')),
  external_id      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: ai_context_profiles
-- ============================================================
CREATE TABLE ai_context_profiles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version      INTEGER NOT NULL DEFAULT 1,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_sessions_user_date ON sessions(user_id, date DESC);
CREATE INDEX idx_set_logs_session ON set_logs(session_id);
CREATE INDEX idx_set_logs_exercise ON set_logs(exercise_id);
CREATE INDEX idx_recovery_logs_user_date ON recovery_logs(user_id, date DESC);
CREATE INDEX idx_blocks_program ON blocks(program_id);
CREATE INDEX idx_workout_days_block ON workout_days(block_id);
CREATE INDEX idx_planned_exercises_workout_day ON planned_exercises(workout_day_id);
CREATE INDEX idx_recommendations_session ON recommendations(session_id);
CREATE INDEX idx_programs_user ON programs(user_id);
CREATE INDEX idx_body_metrics_user_date ON body_metrics(user_id, date DESC);
CREATE INDEX idx_cardio_sessions_user_date ON cardio_sessions(user_id, date DESC);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_movement_pattern ON exercises(movement_pattern);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_insert_own" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_delete_own" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- exercises (lecture publique, écriture restreinte aux exercices custom)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_select_all" ON exercises
  FOR SELECT USING (is_custom = false OR auth.uid() = created_by);

CREATE POLICY "exercises_insert_custom" ON exercises
  FOR INSERT WITH CHECK (is_custom = true AND auth.uid() = created_by);

CREATE POLICY "exercises_update_custom_own" ON exercises
  FOR UPDATE USING (is_custom = true AND auth.uid() = created_by)
  WITH CHECK (is_custom = true AND auth.uid() = created_by);

CREATE POLICY "exercises_delete_custom_own" ON exercises
  FOR DELETE USING (is_custom = true AND auth.uid() = created_by);

-- programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programs_select_own" ON programs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "programs_insert_own" ON programs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "programs_update_own" ON programs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "programs_delete_own" ON programs
  FOR DELETE USING (auth.uid() = user_id);

-- blocks
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_select_own" ON blocks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM programs WHERE programs.id = blocks.program_id AND programs.user_id = auth.uid())
  );

CREATE POLICY "blocks_insert_own" ON blocks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM programs WHERE programs.id = blocks.program_id AND programs.user_id = auth.uid())
  );

CREATE POLICY "blocks_update_own" ON blocks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM programs WHERE programs.id = blocks.program_id AND programs.user_id = auth.uid())
  );

CREATE POLICY "blocks_delete_own" ON blocks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM programs WHERE programs.id = blocks.program_id AND programs.user_id = auth.uid())
  );

-- workout_days
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_days_select_own" ON workout_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN programs ON programs.id = blocks.program_id
      WHERE blocks.id = workout_days.block_id AND programs.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_days_insert_own" ON workout_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN programs ON programs.id = blocks.program_id
      WHERE blocks.id = workout_days.block_id AND programs.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_days_update_own" ON workout_days
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN programs ON programs.id = blocks.program_id
      WHERE blocks.id = workout_days.block_id AND programs.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_days_delete_own" ON workout_days
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN programs ON programs.id = blocks.program_id
      WHERE blocks.id = workout_days.block_id AND programs.user_id = auth.uid()
    )
  );

-- planned_exercises
ALTER TABLE planned_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planned_exercises_select_own" ON planned_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_days
      JOIN blocks ON blocks.id = workout_days.block_id
      JOIN programs ON programs.id = blocks.program_id
      WHERE workout_days.id = planned_exercises.workout_day_id AND programs.user_id = auth.uid()
    )
  );

CREATE POLICY "planned_exercises_insert_own" ON planned_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_days
      JOIN blocks ON blocks.id = workout_days.block_id
      JOIN programs ON programs.id = blocks.program_id
      WHERE workout_days.id = planned_exercises.workout_day_id AND programs.user_id = auth.uid()
    )
  );

CREATE POLICY "planned_exercises_update_own" ON planned_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workout_days
      JOIN blocks ON blocks.id = workout_days.block_id
      JOIN programs ON programs.id = blocks.program_id
      WHERE workout_days.id = planned_exercises.workout_day_id AND programs.user_id = auth.uid()
    )
  );

CREATE POLICY "planned_exercises_delete_own" ON planned_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workout_days
      JOIN blocks ON blocks.id = workout_days.block_id
      JOIN programs ON programs.id = blocks.program_id
      WHERE workout_days.id = planned_exercises.workout_day_id AND programs.user_id = auth.uid()
    )
  );

-- sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_own" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_delete_own" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- set_logs
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "set_logs_select_own" ON set_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = set_logs.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "set_logs_insert_own" ON set_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = set_logs.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "set_logs_update_own" ON set_logs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = set_logs.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "set_logs_delete_own" ON set_logs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = set_logs.session_id AND sessions.user_id = auth.uid())
  );

-- recommendations
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommendations_select_own" ON recommendations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = recommendations.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "recommendations_insert_own" ON recommendations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = recommendations.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "recommendations_update_own" ON recommendations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = recommendations.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "recommendations_delete_own" ON recommendations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = recommendations.session_id AND sessions.user_id = auth.uid())
  );

-- recovery_logs
ALTER TABLE recovery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recovery_logs_select_own" ON recovery_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "recovery_logs_insert_own" ON recovery_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recovery_logs_update_own" ON recovery_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recovery_logs_delete_own" ON recovery_logs
  FOR DELETE USING (auth.uid() = user_id);

-- body_metrics
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "body_metrics_select_own" ON body_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "body_metrics_insert_own" ON body_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "body_metrics_update_own" ON body_metrics
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "body_metrics_delete_own" ON body_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- cardio_sessions
ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cardio_sessions_select_own" ON cardio_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cardio_sessions_insert_own" ON cardio_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cardio_sessions_update_own" ON cardio_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cardio_sessions_delete_own" ON cardio_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ai_context_profiles
ALTER TABLE ai_context_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_context_profiles_select_own" ON ai_context_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_context_profiles_insert_own" ON ai_context_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_context_profiles_update_own" ON ai_context_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_context_profiles_delete_own" ON ai_context_profiles
  FOR DELETE USING (auth.uid() = user_id);
