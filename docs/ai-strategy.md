# Stratégie IA

## 1. Rôle de l'IA

L'IA a **deux rôles** dans l'app, séparés clairement :

1. **Générateur de programme (mode nominal)** — l'IA construit le programme initial et régénère les blocs suivants. C'est la valeur différenciante du produit : un programme véritablement personnalisé sur la morphologie, l'historique, les objectifs, les contraintes, la récup et les sports parallèles. Cf. ADR-028.
2. **Interprète et enrichisseur** — l'IA explique, résume, détecte les patterns, analyse les plateaux. Cf. ADR-004.

L'IA **n'est pas** le moteur de décision des charges **intra-bloc** (ajustement semaine après semaine). Cette responsabilité reste 100 % déterministe (moteur de règles, cf. ADR-004, ADR-006).

### Dualité fondamentale : règles = espace de solutions, IA = choix experts dans cet espace

La génération de programme repose sur une séparation stricte des rôles :

- **Les règles déterministes définissent l'espace des programmes valides** : split compatible fréquence × niveau, exos uniquement dans le catalogue (table `exercises`), `progressionType` ∈ les 6 valeurs prédéfinies (ADR-006), contraintes utilisateur (matériel, blessures, sports parallèles, durée séance) respectées, schéma JSON strict. Hors de cet espace : rejet automatique. Ces règles sont la **garantie de cohérence** : pas d'exo halluciné, pas de structure incohérente, pas de prog impossible à piloter par le moteur intra-bloc.

- **L'IA fait les choix experts à l'intérieur de cet espace** :
  - quel exercice prioriser sur tel pattern pour ce profil morpho,
  - quel volume hebdo cibler par groupe musculaire selon niveau et récup observée (volume landmarks MV/MEV/MAV/MRV),
  - où placer les séances les plus intenses dans la semaine,
  - comment doser RIR vs charge selon l'objectif déclaré,
  - quels accessoires sont les plus rentables (stimulus-to-fatigue ratio) pour les objectifs prioritaires,
  - quelle proportion d'exos conserver entre deux blocs successifs (continuité analytique vs renouveau),
  - en s'appuyant sur des **principes evidence-based documentés** (littérature hypertrophie/force récente), **pas** sur des heuristiques figées dans le code.

**Promesse produit** : *"un programme aussi rigoureux qu'un moteur de règles, aussi pertinent qu'un coach qui a lu la littérature et connaît l'utilisateur"*. C'est ce qu'aucun moteur purement déterministe ne peut produire (manque de raisonnement contextuel) et ce qu'un LLM sans garde-fous ne peut pas produire fiablement non plus (hallucinations, incohérences). La combinaison **règles-en-amont + IA-au-milieu + validateur-en-aval** est l'architecture de la promesse.

**Conséquence sur le prompt système IA** (ticket d'implémentation à venir) :
- Injecter les contraintes du moteur (catalogue d'exos disponibles, splits valides pour la fréquence, `progressionType` autorisés, contraintes utilisateur) en tant que cadre dur dans le prompt.
- Inviter explicitement le modèle à **appuyer ses choix sur les principes établis** (volume landmarks, fréquence optimale par muscle, SFR, etc.), en demandant une justification courte pour les décisions principales (utile pour debug et amélioration des prompts).
- Le validateur déterministe reste l'arbitre final : si l'IA propose quelque chose hors-règles, on rejette/retry, et en cas d'échec persistant on bascule sur `FallbackProvider`.

```
Génération de programme :  Questionnaire + AIContextProfile → IA (ClaudeProvider) → Programme JSON validé
                                                          └→ Fallback : moteur 3-couches (FallbackProvider) si IA indisponible

Progression intra-bloc :   Set logs + State → Règles déterministes → Recommandation → IA (texte humain)
```

### Ce que l'IA fait
- **Générer le programme initial** : split, structure semaine, sélection des exercices dans le catalogue, sets/reps/RIR cibles, charges de départ (cf. ADR-028)
- **Régénérer un bloc** : transition entre blocs, en s'appuyant sur la progression réelle et le AIContextProfile (cf. ADR-028)
- Résumer une séance en langage naturel
- Expliquer pourquoi un ajustement de charge est recommandé
- Détecter des patterns sur plusieurs semaines
- Analyser un plateau et suggérer des pistes
- Synthétiser un bloc terminé
- Contextualiser les recommandations avec le profil utilisateur

### Ce que l'IA ne fait PAS
- Calculer les charges **intra-bloc** (progression semaine après semaine)
- Décider des statuts de séance (progression / maintien / allégée / deload)
- Détecter mécaniquement un plateau (la règle de détection est déterministe ; l'IA *analyse* un plateau déjà détecté)
- Inventer des exercices hors du catalogue
- Être la source de vérité sur les métriques (e1RM, volume, fréquence)
- Décider d'un `progressionType` hors des 6 prédéfinis (ADR-006)

## 2. Architecture

### Abstraction provider

```typescript
interface AIProvider {
  // Génération (ADR-028) — l'IA est le générateur principal, FallbackProvider sinon
  generateProgram(context: ProgramGenerationContext): Promise<Program>;
  regenerateBlock(context: BlockRegenerationContext): Promise<Block>;

  // Interprétation (ADR-004) — l'IA enrichit, FallbackProvider produit des templates basiques
  generateSessionSummary(context: AIContext): Promise<SessionSummary>;
  generateRecommendation(context: AIContext): Promise<Recommendation>;
  generateBlockSummary(context: AIContext): Promise<BlockSummary>;
  analyzePlateau(context: AIContext): Promise<PlateauAnalysis>;
  explainAdjustment(context: AIContext): Promise<string>;
}

class ClaudeProvider implements AIProvider { ... }
class FallbackProvider implements AIProvider { ... }
```

Le `FallbackProvider` implémente :
- `generateProgram` / `regenerateBlock` via le moteur de règles 3-couches (cf. `docs/program-generation.md`).
- Les méthodes d'interprétation via des templates basiques (textes pré-formatés à partir des données structurées).

### Pipeline de génération : schéma intermédiaire IA → validateur → transformer → Program

La génération suit un pipeline en 3 étapes, isolant le prompt LLM du modèle interne :

1. **L'IA produit un `AIIntermediateOutput`** — JSON épuré (split, weeks, days avec `exercise_id` / sets / reps / rir / start_weight_kg / progression). Le LLM ne génère ni UUIDs, ni `progressionConfig` complet, ni métadonnées internes.
2. **Le validateur déterministe** opère sur le `AIIntermediateOutput` (pas sur le type `Program` complet) :
   - schéma JSON conforme (champs requis, types attendus)
   - `exercise_id` présents dans le catalogue local
   - `progression` ∈ les 6 `progressionType` prédéfinis (ADR-006)
   - contraintes utilisateur respectées (matériel, blessures, sports parallèles, durée séance)
   - cohérence du split avec la fréquence déclarée
3. **Le transformer** déterministe convertit le `AIIntermediateOutput` validé vers le type `Program` complet (UUIDs, `progressionConfig` détaillé, métadonnées). Partagé entre `ClaudeProvider` et `FallbackProvider` — le `FallbackProvider` produit lui aussi le schéma intermédiaire, garantissant un seul format d'entrée pour le transformer.

Si la validation échoue : 1 retry avec feedback dans le prompt, puis bascule sur `FallbackProvider`. Toute erreur de validation est loguée pour amélioration des prompts.

**Prompt caching du catalogue** : le catalogue d'exercices filtré (matériel × contraintes utilisateur, ~100-300 exos, ~5-15k tokens) est injecté en première position du prompt système avec `cache_control: ephemeral` (Anthropic prompt caching, ADR-025). 90 % de réduction coût attendue sur les générations suivantes du même utilisateur tant que le catalogue filtré ne change pas.

**Retry et queue offline** : `generateProgram` et `regenerateBlock` **ne passent pas** par la queue de retry IA (réservée aux résumés/explications). Leur retry est explicitement utilisateur via le flow UX de remplacement fallback → IA au retour réseau. Justification : ce sont des moments produit majeurs qui doivent rester sous contrôle de l'utilisateur, pas retriés en silence.

### Déclenchement

| Quand | Type | Priorité |
|---|---|---|
| **Génération initiale du programme** (onboarding) | À la demande (validation utilisateur) | Critique |
| **Régénération de bloc** (fin de bloc, change d'objectif, gros écart entre prévu/réalisé) | À la demande (validation utilisateur) | Haute |
| Fin de séance (complétion locale, pas post-sync — cf. ADR-026) | Automatique | Haute |
| Mise à jour du contexte utilisateur (mensurations, profil, fin de bloc) | Automatique | Moyenne |
| Analyse de séance demandée | À la demande | Haute |
| Explication d'ajustement | À la demande | Moyenne |
| Résumé de bloc | À la demande | Moyenne |
| Analyse de plateau | À la demande | Basse |

### Transport des appels (Edge Function relay)

Tous les appels au LLM passent par une **Edge Function Supabase `ai-proxy`** qui détient la clé Anthropic côté serveur (cf. ADR-025). Le client mobile n'embarque jamais la clé. L'Edge Function applique un rate-limit par `user_id` et log les coûts (`input_tokens`, `output_tokens`, `cache_read_input_tokens`). Le `ClaudeProvider` appelle l'Edge Function via `supabase.functions.invoke('ai-proxy', { body })`.

### Fallback obligatoire

Si l'IA ne répond pas (timeout, erreur, pas de réseau, rate-limit Edge Function) :
- L'app continue de fonctionner normalement
- **Génération de programme** : `FallbackProvider.generateProgram` produit un programme via le moteur déterministe 3-couches. L'utilisateur n'est pas bloqué en offline. Au retour réseau, l'utilisateur peut demander une régénération IA pour remplacer le programme fallback (proposition UX explicite).
- **Recommandations intra-bloc** : les ajustements de charges fonctionnent via les règles seules (déterministes, ADR-004).
- **Résumés et explications** : un texte basique est généré par templates (`FallbackProvider`)
- L'appel IA est mis en queue de retry et sera retenté au retour réseau ; si l'IA répond, la `Recommendation` fallback est remplacée par la version IA

## 3. Contexte utilisateur structuré (AIContextProfile)

### Format JSON

```json
{
  "version": 1,
  "user": {
    "level": "intermediate",
    "goals": { "primary": "hypertrophy", "secondary": "strength" },
    "training_frequency": 5,
    "training_since": "2020-01",
    "height_cm": 180,
    "weight_kg": 82,
    "preferred_unit": "kg"
  },
  "morphology": {
    "body_type": "mesomorph",
    "strong_points": ["chest", "shoulders"],
    "weak_points": ["hamstrings", "calves"],
    "injury_history": ["lower_back_2023"]
  },
  "exercise_preferences": {
    "preferred": ["bench_press", "squat", "ohp"],
    "avoided": ["behind_neck_press"],
    "constraints": ["no_leg_extension_heavy"]
  },
  "performance_baselines": {
    "bench_press": { "e1rm": 110, "trend": "up", "last_4w_avg": 105 },
    "squat": { "e1rm": 140, "trend": "plateau", "last_4w_avg": 138 }
  },
  "current_block": {
    "title": "Hypertrophie S3/6",
    "goal": "hypertrophy",
    "week": 3,
    "total_weeks": 6,
    "compliance_rate": 0.92
  },
  "readiness_trends": {
    "avg_sleep": 7.2,
    "avg_energy": 6.5,
    "avg_soreness": 4.0,
    "fatigue_trend": "stable"
  },
  "recent_highlights": [
    "PR bench 100kg x 5",
    "squat stagnant depuis 2 semaines",
    "sommeil dégradé cette semaine"
  ],
  "coaching_style": "direct",
  "parallel_sports": ["running_2x_week"]
}
```

### Mise à jour

Le profil IA est recalculé :
- Après chaque séance complétée localement (pas post-sync — cf. ADR-026)
- Après mise à jour des mensurations
- Après fin de bloc
- Le champ `version` s'incrémente à chaque mise à jour

### Persistance

Le profil est stocké comme **cache SQLite local** (table `ai_context_profiles`) miroir de la table Supabase, pour pouvoir construire les prompts IA offline (cf. ADR-027). Le push vers Supabase passe par la `SyncQueue` standard.

## 4. Pipeline IA par cas d'usage

### Résumé fin de séance

**Input** :
1. AIContextProfile
2. Session du jour (tous les SetLogs)
3. Recommandations du moteur de règles
4. Session précédente pour le même workout day

**Output attendu** :
```json
{
  "overall_rating": "good",
  "summary": "Bonne séance push. Bench en progression...",
  "highlights": ["Bench 95kg x 5 — PR série"],
  "concerns": ["Triceps fatigue sur les dernières séries"],
  "fatigue_note": "Fatigue modérée, sommeil correct",
  "next_session_note": "Maintenir la charge bench, surveiller triceps"
}
```

### Analyse de plateau

**Input** :
1. AIContextProfile
2. Historique exercice (8-12 dernières séances)
3. Données de fatigue/récupération sur la même période

**Output attendu** :
```json
{
  "exercise": "Squat",
  "plateau_duration_weeks": 3,
  "probable_causes": ["fatigue cumulée", "running impact"],
  "suggestions": [
    "Réduire le volume cardio jambes cette semaine",
    "Essayer une variante (pause squat)",
    "Vérifier la profondeur d'exécution"
  ]
}
```

## 5. Gestion des coûts

### Estimation par appel
- Résumé fin de séance : ~2000-3000 tokens input, ~500 tokens output
- Analyse de plateau : ~3000-4000 tokens input, ~500 tokens output
- Synthèse de bloc : ~5000-8000 tokens input, ~1000 tokens output

### Optimisations
- Prompt caching sur le profil utilisateur (stable entre les appels)
- Limiter le contexte historique envoyé (4-8 séances max)
- Résumés courts et structurés (pas de prose)
- Batch les analyses non urgentes

### Budget estimé
Pour un utilisateur actif (5 séances/semaine + quelques analyses) :
- ~20-30 appels IA/semaine
- ~50k-100k tokens/semaine
- Coût marginal par utilisateur

## 6. Portabilité

Le système est conçu pour que l'intelligence accumulée survive à un changement de provider IA :

- **Données structurées** : stockées en Postgres, pas dans les réponses IA
- **Contexte versionné** : AIContextProfile avec version et historique
- **Prompts versionnés** : stockés et maintenus indépendamment du provider
- **Séparation calcul/interprétation** : les métriques ne dépendent pas de l'IA
