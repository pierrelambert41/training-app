# Training App — Instructions Claude Code

## Projet

App de pilotage d'entraînement personnalisée (hypertrophie / force / progression intelligente).
Mobile-first, offline-first, système coaché.

## Stack

- **App** : React Native + Expo + TypeScript
- **UI** : NativeWind (Tailwind pour RN), dark mode par défaut
- **State** : Zustand
- **Data fetching** : TanStack Query
- **Navigation** : expo-router
- **Local DB** : expo-sqlite (offline-first)
- **Backend** : Supabase (Auth + Postgres + Storage + Edge Functions)
- **IA** : Claude API derrière abstraction AIProvider

## Documentation

Toute la documentation projet est dans `docs/` :
- `prd.md` — Product Requirements Document
- `architecture.md` — Architecture technique
- `tech-stack.md` — Stack et justifications
- `data-model.md` — Modèle de données complet
- `business-rules.md` — Règles métier / moteur de progression
- `ai-strategy.md` — Stratégie IA
- `ux-requirements.md` — Exigences UX/UI
- `mvp-scope.md` — Scope MVP et phasage
- `integrations.md` — Intégrations tierces
- `program-generation.md` — Moteur de génération de programmes
- `decisions.md` — Architecture Decision Records
- `pitfalls.md` — Pièges techniques connus + stubs ouverts (mis à jour chaque story)
- `story-log.md` — Journal des stories livrées, contexte et imbrications

**Consulter ces fichiers avant de prendre une décision d'architecture ou de design.**

## Principes

- Le logger doit être plus rapide qu'un carnet
- Le backend calcule, l'IA interprète (jamais l'inverse)
- L'app fonctionne sans réseau (offline-first)
- L'app fonctionne sans IA (fallback obligatoire)
- Pas de création libre par l'utilisateur (système coaché)
- Règles de progression par type (progressionType + progressionConfig), pas par exercice

## Conventions

- TypeScript strict
- Composants fonctionnels React
- Nommage : camelCase pour variables/fonctions, PascalCase pour composants/types
- Fichiers : kebab-case
- Tests : colocalisés avec le code (`*.test.ts`)
- Tests d'écrans routés : **ne jamais mettre de `*.test.*` dans `app/`** — Expo Router file-based routing les enregistre comme routes, causant un crash runtime. Placer ces tests dans `src/screens/<groupe>/` en miroir de la structure `app/` (ex: `app/(app)/index.tsx` → `src/screens/(app)/home-screen.test.tsx`).

## Architecture frontend

Pattern : **Bulletproof React** adapté Expo Router. Voir `docs/architecture.md` §8 pour le détail complet.

Règles non-négociables :
- **R1** `app/**/*.tsx` ≤ 30 lignes — import + ré-export d'une page depuis `src/features/<feat>/components/`
- **R2** Imports toujours descendants : `app/ → src/app/ → src/features/<feat>/ → src/components|hooks|lib`. Jamais horizontal entre features.
- **R3** Chaque feature expose un `index.ts`. Les imports externes passent exclusivement par lui.
- **R4** Logique métier → `src/features/<feat>/domain/` (fonctions pures, sans I/O).
- **R5** I/O (SQLite, Supabase, AI) → `src/features/<feat>/api/`. Jamais dans `components/`.
- **R6** Composant > 150 lignes : signal de split. Fichier > 250 lignes : signal d'alerte (justification requise dans la PR si dépassement assumé). Fichier > 400 lignes : refacto obligatoire avant merge.

`eslint-plugin-boundaries` enforce R2 et R3 automatiquement. Lancer `npx eslint src/features/` avant chaque PR.
