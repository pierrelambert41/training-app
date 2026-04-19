# Stratégie IA

## 1. Rôle de l'IA

L'IA **n'est pas** le moteur de décision des charges. Elle **interprète, explique et enrichit**.

```
Backend (calculs + règles) → données structurées → IA → texte humain
```

### Ce que l'IA fait
- Résumer une séance en langage naturel
- Expliquer pourquoi un ajustement est recommandé
- Détecter des patterns sur plusieurs semaines
- Analyser un plateau et suggérer des pistes
- Synthétiser un bloc terminé
- Contextualiser les recommandations avec le profil utilisateur

### Ce que l'IA ne fait PAS
- Calculer les charges
- Décider des progressions
- Remplacer le moteur de règles
- Être la source de vérité sur les métriques

## 2. Architecture

### Abstraction provider

```typescript
interface AIProvider {
  generateSessionSummary(context: AIContext): Promise<SessionSummary>;
  generateRecommendation(context: AIContext): Promise<Recommendation>;
  generateBlockSummary(context: AIContext): Promise<BlockSummary>;
  analyzePlateau(context: AIContext): Promise<PlateauAnalysis>;
  explainAdjustment(context: AIContext): Promise<string>;
}

class ClaudeProvider implements AIProvider { ... }
class FallbackProvider implements AIProvider { ... }
```

Le `FallbackProvider` retourne des résumés basiques générés par templates, sans appel LLM.

### Déclenchement

| Quand | Type | Priorité |
|---|---|---|
| Fin de séance (après sync) | Automatique | Haute |
| Mise à jour du contexte utilisateur | Automatique | Moyenne |
| Analyse de séance demandée | À la demande | Haute |
| Explication d'ajustement | À la demande | Moyenne |
| Résumé de bloc | À la demande | Moyenne |
| Analyse de plateau | À la demande | Basse |

### Fallback obligatoire

Si l'IA ne répond pas (timeout, erreur, pas de réseau) :
- L'app continue de fonctionner normalement
- Les recommandations de base fonctionnent via les règles seules
- Un résumé basique est généré par templates
- L'appel IA est mis en queue pour retry ultérieur

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
- Après chaque séance synchronisée
- Après mise à jour des mensurations
- Après fin de bloc
- Le champ `version` s'incrémente à chaque mise à jour

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
