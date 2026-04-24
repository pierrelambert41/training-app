-- ============================================================
-- TA-19: Phase 3 — Program / Block / WorkoutDay / PlannedExercise
-- Source de vérité : docs/data-model.md, docs/business-rules.md §2
-- ============================================================
-- Ce fichier complète la migration initiale :
--   * ajoute le statut bloc 'deloaded' (bloc en phase de deload actif)
--   * ajoute les indexes spécifiques Phase 3 (filtrage par status/ordre)
-- Les tables, RLS et indexes de base sont déjà en place dans
-- 20260423000000_initial_schema.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Élargissement du CHECK status sur blocks : ajout de 'deloaded'
-- ------------------------------------------------------------
-- Un bloc peut être :
--   planned   — défini mais pas démarré
--   active    — en cours, progression normale
--   deloaded  — en cours, mais semaine de deload déclenchée (cf business-rules.md §3.4)
--   completed — terminé
-- 'deloaded' est un état transitoire d'un bloc actif, distinct pour
-- permettre au moteur de statut de séance d'appliquer les règles de deload.
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_status_check;
ALTER TABLE blocks ADD CONSTRAINT blocks_status_check
  CHECK (status IN ('planned', 'active', 'deloaded', 'completed'));

-- ------------------------------------------------------------
-- Indexes Phase 3
-- ------------------------------------------------------------
-- programs(user_id, is_active) : récupérer rapidement le programme actif d'un user
CREATE INDEX IF NOT EXISTS idx_programs_user_is_active
  ON programs(user_id, is_active);

-- blocks(program_id, status) : lister les blocs d'un programme filtrés par statut
CREATE INDEX IF NOT EXISTS idx_blocks_program_status
  ON blocks(program_id, status);

-- workout_days(block_id, day_order) : ordonner les jours d'un bloc
CREATE INDEX IF NOT EXISTS idx_workout_days_block_day_order
  ON workout_days(block_id, day_order);

-- planned_exercises(workout_day_id, exercise_order) : ordonner les exercices d'un jour
CREATE INDEX IF NOT EXISTS idx_planned_exercises_workout_day_order
  ON planned_exercises(workout_day_id, exercise_order);
