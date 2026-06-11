-- Phase 4 (TA-84/logger) : exercices ajoutés à la volée pendant une séance.
-- Colonne présente en SQLite local depuis des semaines mais jamais migrée côté
-- Supabase → tous les upserts planned_exercises étaient rejetés en 400 (PGRST204),
-- bloquant la file de sync. Appliquée sur le projet distant le 2026-06-10.
alter table public.planned_exercises
  add column if not exists is_unplanned boolean not null default false;
