-- ============================================================
-- TA-72: Phase 4 — Session / SetLog / SyncQueue
-- Source de vérité : docs/data-model.md §Session/SetLog
-- ============================================================
-- Les tables `sessions` et `set_logs`, leurs CHECK constraints
-- (status ∈ {in_progress, completed, abandoned}, side ∈ {left, right}),
-- les FK et les RLS policies sont déjà en place dans :
--   20260423000000_initial_schema.sql
--
-- Ce ticket complète uniquement les indexes manquants nécessaires
-- aux requêtes de la Phase 4 (logger de séance).
-- ============================================================

-- sessions(workout_day_id) : permet de retrouver toutes les séances
-- réalisées sur un même workout_day donné (utilisé pour les pré-remplissages
-- "dernière séance sur ce jour" et le compteur completion par bloc).
CREATE INDEX IF NOT EXISTS idx_sessions_workout_day
  ON sessions(workout_day_id);

-- set_logs(planned_exercise_id) : permet de retrouver l'historique des
-- sets effectués sur un planned_exercise donné — base pour la
-- progression (Phase 5) et l'affichage "dernière performance" (Phase 4).
CREATE INDEX IF NOT EXISTS idx_set_logs_planned_exercise
  ON set_logs(planned_exercise_id);
