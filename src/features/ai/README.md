# Feature : ai

Abstraction AIProvider et intégrations IA : résumé de séance, insights, analyse de plateau.

## Structure cible (migration à planifier)

```
api/
  ai-provider.ts        # Interface AIProvider + ClaudeProvider + FallbackProvider
  session-insights.ts   # Appels IA pour résumé/insights de séance
domain/
  prompt-builder.ts     # Construction des prompts (fonctions pures)
index.ts
```

## Statut

Migration planifiée. Voir `docs/ai-strategy.md` pour la stratégie complète.

## Règles critiques

- Fallback obligatoire : toute feature IA fonctionne sans Claude API (FallbackProvider).
- L'IA interprète, elle ne calcule pas (ADR-004).
- Prompt caching pour optimiser les coûts.
