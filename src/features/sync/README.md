# Feature : sync

Gère la synchronisation offline → Supabase : queue, replay, résolution de conflits.

## Structure cible (migration Phase 6)

```
api/
  sync-queue.ts        # CRUD sync_queue SQLite
  sync-helpers.ts      # Helpers de sérialisation payload
domain/
  sync-engine.ts       # Logique de replay + conflict resolution (fonctions pures)
index.ts
```

## Statut

Migration planifiée en Phase 6 (sync Supabase). Les fichiers sont actuellement dans `src/services/`.

## Règles critiques

- Idempotence obligatoire : rejouer une op ne corrompt pas l'état.
- L'échec de `enqueueSyncRecord` ne rollback JAMAIS l'écriture locale (try/catch + log).
- Voir ADR-012 pour le format payload snake_case Supabase.
