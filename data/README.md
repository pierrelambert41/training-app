# data/exercises.json — Format

Dataset de 265 exercices standards. Généré par `scripts/generate-exercises.ts`.

## Champs

| Champ | Type | Valeurs |
|---|---|---|
| `id` | UUID string | uuid v4 |
| `name` | string | Nom anglais unique |
| `name_fr` | string | Nom français |
| `category` | enum | `compound` \| `isolation` \| `bodyweight` \| `machine` \| `cable` |
| `movement_pattern` | enum | voir data-model.md §Exercise |
| `primary_muscles` | string[] | muscles principaux |
| `secondary_muscles` | string[] | muscles secondaires |
| `equipment` | string[] | matériel requis |
| `log_type` | enum | `weight_reps` \| `bodyweight_reps` \| `duration` \| `distance_duration` |
| `is_unilateral` | boolean | exercice unilatéral |
| `systemic_fatigue` | enum | `low` \| `moderate` \| `high` |
| `movement_stability` | enum | `stable` \| `moderate` \| `variable` |
| `morpho_tags` | string[] | tags compatibilité morpho |
| `recommended_progression_type` | enum | voir data-model.md §3 |
| `alternatives` | UUID[] | toujours `[]` à la génération |
| `coaching_notes` | string \| null | — |
| `tags` | string[] | tags libres |
| `is_custom` | boolean | toujours `false` |
| `created_by` | null | toujours `null` |
| `created_at` | ISO timestamp | date de génération |

## Seed

- **Supabase** : `supabase/migrations/20260423000001_seed_exercises.sql`
- **SQLite** : migration version 2 dans `src/services/db.ts` (via `src/db/migrations/seed-exercises.ts`)

## Régénération

```bash
cd scripts && npx ts-node generate-exercises.ts
```

Le fichier `exercises.json` doit être commité — il est la source de vérité pour les deux seeds.
