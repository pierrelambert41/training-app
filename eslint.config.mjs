import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import boundariesPlugin from 'eslint-plugin-boundaries';

/**
 * Zones d'architecture Bulletproof React (R2, R3).
 * Voir docs/architecture.md §8 pour la spec complète.
 *
 * Les éléments feature-* utilisent mode: 'full' + capture: ['featureName'] pour
 * différencier les features entre elles et bloquer les imports horizontaux (R2).
 * mode: 'full' est requis pour que les patterns avec wildcards internes
 * (ex: src/features/ * /api/**\/*) soient évalués correctement.
 */
const boundariesElements = [
  // Routes Expo Router — R1 : thin orchestrators ≤ 30 lignes
  { type: 'app-route', pattern: 'app/**/*', mode: 'full' },
  // Providers / init globaux (DBProvider, SessionHydrator, etc.)
  { type: 'app-provider', pattern: 'src/app/**/*', mode: 'full' },
  // Couche I/O d'une feature — R5 : seul endroit pour SQLite/Supabase/AI
  {
    type: 'feature-api',
    pattern: 'src/features/*/api/**/*',
    mode: 'full',
    capture: ['featureName'],
  },
  // Composants UI propres à une feature
  {
    type: 'feature-components',
    pattern: 'src/features/*/components/**/*',
    mode: 'full',
    capture: ['featureName'],
  },
  // Hooks propres à une feature
  {
    type: 'feature-hooks',
    pattern: 'src/features/*/hooks/**/*',
    mode: 'full',
    capture: ['featureName'],
  },
  // Stores Zustand propres à une feature
  {
    type: 'feature-stores',
    pattern: 'src/features/*/stores/**/*',
    mode: 'full',
    capture: ['featureName'],
  },
  // Logique métier pure — R4 : fonctions sans I/O
  {
    type: 'feature-domain',
    pattern: 'src/features/*/domain/**/*',
    mode: 'full',
    capture: ['featureName'],
  },
  // Helpers/utilitaires propres à une feature (transformations pures, sans métier)
  {
    type: 'feature-lib',
    pattern: 'src/features/*/lib/**/*',
    mode: 'full',
    capture: ['featureName'],
  },
  // Types propres à une feature
  {
    type: 'feature-types',
    pattern: 'src/features/*/types/**/*',
    mode: 'full',
    capture: ['featureName'],
  },
  // Public API d'une feature — R3 : seul point d'entrée autorisé depuis l'extérieur
  {
    type: 'feature-index',
    pattern: 'src/features/*/index.*',
    mode: 'full',
    capture: ['featureName'],
  },
  // UI réutilisable cross-features
  { type: 'shared-components', pattern: 'src/components/**/*', mode: 'full' },
  // Hooks transverses (non encore migrés dans features/)
  { type: 'shared-hooks', pattern: 'src/hooks/**/*', mode: 'full' },
  // Services (ancienne couche infra, en cours de migration vers features/)
  { type: 'shared-services', pattern: 'src/services/**/*', mode: 'full' },
  // Helpers techniques (uuid, etc.)
  { type: 'shared-lib', pattern: ['src/lib/**/*', 'src/utils/**/*', 'src/db/**/*'], mode: 'full' },
  // Constantes, config, thème
  { type: 'shared-config', pattern: ['src/config/**/*', 'src/constants/**/*', 'src/theme/**/*'], mode: 'full' },
  // Types partagés entre features
  { type: 'shared-types', pattern: ['src/types/**/*'], mode: 'full' },
  // Stores non encore migrés dans une feature
  { type: 'shared-stores', pattern: ['src/stores/**/*'], mode: 'full' },
  // Screens non encore migrés dans features/ (pendant migration)
  { type: 'shared-screens', pattern: ['src/screens/**/*'], mode: 'full' },
];

/**
 * Règles d'imports entre zones (R2 — hiérarchie, R3 — via index.ts).
 *
 * Syntaxe v6 complète :
 * - from : objet { type } ou { type, captured } pour les features
 * - allow : DependencySelector { to: { type } } ou { to: { type, captured } }
 *   avec template Handlebars {{ from.captured.featureName }} pour les captures
 * default: 'disallow' → tout est interdit sauf ce qui est listé.
 */
const dependenciesRules = [
  // R3 : les routes app/ n'accèdent aux features que via leur index.ts
  {
    from: { type: 'app-route' },
    allow: [
      { to: { type: 'feature-index' } },
      { to: { type: 'app-provider' } },
      { to: { type: 'shared-components' } },
      { to: { type: 'shared-hooks' } },
      { to: { type: 'shared-services' } },
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-types' } },
      { to: { type: 'shared-stores' } },
      { to: { type: 'shared-screens' } },
    ],
  },
  // Les providers accèdent aux features via leur index
  {
    from: { type: 'app-provider' },
    allow: [
      { to: { type: 'feature-index' } },
      { to: { type: 'shared-components' } },
      { to: { type: 'shared-hooks' } },
      { to: { type: 'shared-services' } },
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-types' } },
      { to: { type: 'shared-stores' } },
    ],
  },
  // R2 + R3 : composants d'une feature n'importent que leurs propres segments (même featureName)
  {
    from: { type: 'feature-components' },
    allow: [
      { to: { type: 'feature-components', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-hooks', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-stores', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-domain', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-lib', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-types', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-index', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'shared-components' } },
      { to: { type: 'shared-hooks' } },
      { to: { type: 'shared-services' } },
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-types' } },
      { to: { type: 'shared-stores' } },
    ],
  },
  // R2 : hooks d'une feature → uniquement ses propres api/domain/lib/stores
  {
    from: { type: 'feature-hooks' },
    allow: [
      { to: { type: 'feature-api', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-stores', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-domain', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-lib', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-types', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-index', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'shared-hooks' } },
      { to: { type: 'shared-services' } },
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-types' } },
      { to: { type: 'shared-stores' } },
    ],
  },
  // R2 : stores d'une feature → uniquement ses propres api/domain
  {
    from: { type: 'feature-stores' },
    allow: [
      { to: { type: 'feature-api', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-domain', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-types', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'shared-services' } },
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-types' } },
    ],
  },
  // R5 : feature-api → uniquement infra partagée et ses propres types
  {
    from: { type: 'feature-api' },
    allow: [
      { to: { type: 'feature-types', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'shared-services' } },
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-types' } },
    ],
  },
  // R4 : feature-domain est pur — pas d'I/O, uniquement types + config
  {
    from: { type: 'feature-domain' },
    allow: [
      { to: { type: 'feature-types', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'shared-types' } },
      { to: { type: 'shared-config' } },
    ],
  },
  // feature-lib : helpers/transformations pures d'une feature
  {
    from: { type: 'feature-lib' },
    allow: [
      { to: { type: 'feature-types', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'shared-types' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-lib' } },
    ],
  },
  // feature-index ré-exporte depuis les internals de la même feature uniquement
  {
    from: { type: 'feature-index' },
    allow: [
      { to: { type: 'feature-api', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-components', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-hooks', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-stores', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-domain', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-lib', captured: { featureName: '{{ from.captured.featureName }}' } } },
      { to: { type: 'feature-types', captured: { featureName: '{{ from.captured.featureName }}' } } },
    ],
  },
  // shared-hooks peuvent accéder aux features via leur index
  {
    from: { type: 'shared-hooks' },
    allow: [
      { to: { type: 'shared-hooks' } },
      { to: { type: 'feature-index' } },
      { to: { type: 'shared-services' } },
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-types' } },
      { to: { type: 'shared-stores' } },
    ],
  },
  // shared-components : composants du même dossier partagé + infra
  {
    from: { type: 'shared-components' },
    allow: [
      { to: { type: 'shared-components' } },
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-types' } },
    ],
  },
  // shared-stores : pendant la migration, accès aux types
  {
    from: { type: 'shared-stores' },
    allow: [
      { to: { type: 'shared-stores' } },
      { to: { type: 'shared-types' } },
      { to: { type: 'shared-config' } },
    ],
  },
  // shared-types : un type peut importer d'autres types partagés
  {
    from: { type: 'shared-types' },
    allow: [
      { to: { type: 'shared-types' } },
    ],
  },
  // shared-lib : helpers peuvent s'importer entre eux
  {
    from: { type: 'shared-lib' },
    allow: [
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-types' } },
      { to: { type: 'shared-config' } },
    ],
  },
  // shared-services : peuvent s'importer entre eux
  {
    from: { type: 'shared-services' },
    allow: [
      { to: { type: 'shared-services' } },
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-types' } },
    ],
  },
  // shared-screens : accès large pendant la migration (self-allow)
  {
    from: { type: 'shared-screens' },
    allow: [
      { to: { type: 'shared-screens' } },
      { to: { type: 'feature-index' } },
      { to: { type: 'shared-components' } },
      { to: { type: 'shared-hooks' } },
      { to: { type: 'shared-services' } },
      { to: { type: 'shared-lib' } },
      { to: { type: 'shared-config' } },
      { to: { type: 'shared-types' } },
      { to: { type: 'shared-stores' } },
    ],
  },
];

export default [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      // Les tests sont exclus du lint boundaries pour éviter les faux positifs sur les mocks
      '**/*.test.ts',
      '**/*.test.tsx',
      'src/dev/**',
    ],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'app/**/*.ts', 'app/**/*.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      boundaries: boundariesPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    settings: {
      'boundaries/elements': boundariesElements,
      // Résolveur d'imports pour eslint-plugin-boundaries — nécessaire pour résoudre .ts/.tsx
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: dependenciesRules,
        },
      ],
    },
  },
];
