# Architecture Decision Records (ADR)

## ADR-001 : React Native + Expo comme plateforme principale

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
Le produit est principalement utilisé en salle, sur mobile. Il faut une UX native, un seul codebase, et une vitesse de développement élevée.

### Décision
React Native + Expo + TypeScript comme stack mobile unique. Pas de web app comme produit principal.

### Alternatives rejetées
- **Web app (Next.js)** : usage en salle trop dégradé, pas d'accès natif
- **Natif pur (Swift + Kotlin)** : deux codebases, vélocité réduite
- **Flutter** : écosystème moins mature pour les intégrations santé iOS

### Conséquences
- Un seul codebase pour iOS et Android
- Accès aux APIs natives via Expo modules
- Apple Watch reportée (nécessiterait du Swift natif)

---

## ADR-002 : Offline-first avec SQLite local

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
L'app est utilisée en salle où la connectivité est souvent mauvaise. Le logging de séance ne doit jamais échouer à cause du réseau.

### Décision
Toutes les données de séance sont d'abord stockées en SQLite local (expo-sqlite), puis synchronisées vers Supabase au retour réseau.

### Alternatives rejetées
- **Online-only** : inacceptable pour l'usage en salle
- **Cache TanStack Query seul** : pas assez robuste pour un vrai offline-first
- **WatermelonDB** : plus complexe que nécessaire au démarrage, envisageable si les besoins évoluent

### Conséquences
- Double source de données à gérer (locale + serveur)
- Logique de sync à implémenter et tester
- Gestion de conflits nécessaire
- L'IA et les features nécessitant le réseau sont découplées du logging

---

## ADR-003 : Supabase comme backend

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
Besoin d'aller vite avec auth, database, storage. Petite équipe (1 dev + Claude Code).

### Décision
Supabase (Auth + Postgres + Storage + Edge Functions) comme backend principal.

### Alternatives rejetées
- **Firebase** : Firestore moins adapté que Postgres pour les requêtes relationnelles complexes
- **Custom API (Express/Fastify)** : plus de travail d'infra pour le même résultat
- **PlanetScale** : pas d'auth intégrée, plus de plomberie

### Conséquences
- Auth prête rapidement
- Postgres avec RLS pour la sécurité
- Edge Functions pour la logique métier serveur
- Dépendance à Supabase (acceptable, Postgres est portable)

---

## ADR-004 : Moteur rules-based pour les charges, IA pour l'interprétation

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
L'IA est bonne pour expliquer mais mauvaise pour calculer des charges de façon fiable et répétable. Les décisions de progression doivent être déterministes.

### Décision
Architecture 3 couches : calculs (backend) → règles métier (déterministes) → IA (interprétation). L'IA ne décide jamais des charges.

### Conséquences
- Progression fiable et explicable
- L'app fonctionne sans IA (fallback)
- L'IA ajoute de la valeur sans risquer des recommandations aberrantes
- Les règles sont testables unitairement

---

## ADR-005 : Programmes générés, pas créés librement

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
La philosophie est "système coaché". L'utilisateur ne doit pas construire sa méthode librement, ce qui mène souvent à des programmes mal équilibrés.

### Décision
L'app génère les programmes à partir d'un questionnaire (objectif, fréquence, niveau, matériel, contraintes). Pas de création libre au MVP.

### Conséquences
- Besoin d'un moteur de génération de programmes (templates + logique)
- Les programmes sont toujours cohérents et bien structurés
- L'utilisateur a moins de contrôle mais plus de guidance
- Le dataset de templates d'exercices doit être solide dès le départ

---

## ADR-006 : Règles de progression par type, pas par exercice

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
Coder des règles pour chaque exercice ne scale pas. Les logiques de progression sont similaires par famille (force, volume, accessoires).

### Décision
6 types de progression prédéfinis (`strength_fixed`, `double_progression`, `accessory_linear`, `bodyweight_progression`, `duration_progression`, `distance_duration`). Chaque exercice planifié a un `progressionType` et un `progressionConfig` (JSON paramétrable).

### Conséquences
- Scalable : ajouter un exercice ne nécessite pas de nouvelle règle
- Testable : 6 types à tester exhaustivement
- Configurable : les paramètres (increment, seuils) sont ajustables sans changer le code

---

## ADR-008 : AppText plutôt que Text de React Native

**Statut** : Accepté
**Date** : 2026-04-23

### Contexte
Le composant `Text` de React Native crée une collision de nom avec les imports RN dans les fichiers qui utilisent aussi le design system. Le design system a besoin de variantes typographiques prédéfinies (heading, body, caption) appliquant les tokens NativeWind.

### Décision
Le composant de texte du design system s'appelle `AppText` et encapsule `Text` de RN. Il expose une prop `variant` et une prop `muted`.

### Conséquences
- Aucune collision de nom lors des imports mixtes RN + DS
- Les tokens typographiques sont centralisés dans `AppText`
- Les cas où une classe Tailwind ad-hoc est nécessaire (liens, boutons inline) peuvent encore utiliser `Text` de RN directement

---

## ADR-009 : Favoris sans user_id en Phase 2

**Statut** : Accepté
**Date** : 2026-04-23

### Contexte
La spec TA-15 précise que le statut favori est "spécifique à l'utilisateur". La Phase 2 est single-user local (pas de multi-compte avant Phase 6 — sync Supabase). La table `exercise_favorites` ne contient pas de `user_id`.

### Décision
Pas de `user_id` sur `exercise_favorites` en Phase 2. La migration sera ajoutée en Phase 6 au moment du sync, quand l'identité utilisateur sera disponible côté serveur.

### Conséquence
En Phase 6, une migration breaking devra ajouter `user_id NOT NULL` avec une valeur par défaut pour les lignes existantes (l'utilisateur local sera connu à ce stade).

---

## ADR-010 : Favoris via TanStack Query + SQLite, pas Zustand

**Statut** : Accepté
**Date** : 2026-04-23

### Contexte
CLAUDE.md liste Zustand pour le state global. Les favoris sont une donnée persistée en SQLite, pas un état UI éphémère.

### Décision
SQLite est la source de vérité pour les favoris. TanStack Query gère le cache et l'invalidation (`invalidateQueries`). Zustand n'est pas utilisé pour les favoris — il est réservé à l'état UI non-persisté (ex: état du logger de séance en cours).

### Conséquence
Ce pattern s'applique à toute donnée lue depuis SQLite : TanStack Query suffit, pas besoin de doubler avec Zustand.

---

## ADR-007 : Claude API comme provider IA initial

**Statut** : Accepté  
**Date** : 2026-04-19

### Contexte
L'IA doit être bonne rapidement. Claude est performant sur le raisonnement et le contexte long.

### Décision
Claude API derrière une abstraction `AIProvider` pour pouvoir changer de provider plus tard.

### Conséquences
- Coût par appel à monitorer
- Abstraction permet de migrer sans refactor
- Prompt caching pour optimiser les coûts
- Fallback obligatoire (l'app fonctionne sans IA)
