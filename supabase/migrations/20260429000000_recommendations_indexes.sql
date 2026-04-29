-- ============================================================
-- TA-103: Phase 5 — Indexes manquants sur recommendations
-- Source de vérité : docs/data-model.md §Recommendation, §4
-- ============================================================
-- La table recommendations, ses CHECK constraints, ses FK et ses
-- RLS policies sont déjà en place dans :
--   20260423000000_initial_schema.sql
-- L'index idx_recommendations_session est également déjà créé.
--
-- Ce fichier ajoute les deux indexes manquants requis par le
-- moteur de progression pour les requêtes cross-session :
-- ============================================================

-- recommendations(exercise_id) : permet de retrouver toutes les
-- recommandations concernant un exercice donné, cross-sessions.
-- Utilisé par le moteur de progression pour détecter les plateaux
-- et tendances sur un exercice.
CREATE INDEX IF NOT EXISTS idx_recommendations_exercise
  ON recommendations(exercise_id);

-- recommendations(type) : filtre par type de recommandation
-- (load_change, deload, plateau, fatigue_alert, summary).
-- Utilisé pour agréger les recommandations par type sur une période.
CREATE INDEX IF NOT EXISTS idx_recommendations_type
  ON recommendations(type);
