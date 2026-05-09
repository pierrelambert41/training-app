# Feature : sync

Gère la synchronisation offline → Supabase : queue, replay, résolution de conflits.

## Structure

```
api/
  sync-queue.ts        # CRUD sync_queue SQLite (enqueueSyncRecord, getPendingSyncRecords)
  safe-enqueue.ts      # Wrapper try/catch qui ne rollback jamais l'écriture locale
types/
  sync-queue.ts        # SyncAction, SyncTableName, SyncQueueRecord
index.ts               # Public API
```

À ajouter en Phase 6 :
- `domain/sync-engine.ts` — logique de replay + conflict resolution (fonctions pures)
- `hooks/` — hooks React pour déclencher la sync (au retour réseau, etc.)

## Statut

Migration Bulletproof React effectuée en **TA-119** (le code venait de `src/services/sync-helpers.ts` et `src/services/sync-queue.ts`). Implémentation du sync engine en Phase 6.

## Règles critiques

- Idempotence obligatoire : rejouer une op ne corrompt pas l'état.
- L'échec de `enqueueSyncRecord` ne rollback JAMAIS l'écriture locale (try/catch + log dans `safeEnqueue`).
- Voir ADR-012 pour le format payload snake_case Supabase.
