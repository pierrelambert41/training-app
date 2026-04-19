# Scope MVP et phasage

## 1. Stratégie de livraison

Architecture complète dès le départ, livraison séquencée. Pas de faux MVP minimaliste, mais pas non plus un monolithe impossible à livrer.

## 2. Phases de développement

### Phase 1 — Fondations (semaine 1-2)

**Objectif** : une app qui se lance, avec auth et navigation.

- [ ] Setup Expo / React Native / TypeScript
- [ ] Configuration NativeWind (dark mode par défaut)
- [ ] Expo Router — structure de navigation
- [ ] Supabase — projet + config client
- [ ] Auth (email/password)
- [ ] Schéma DB initial (toutes les tables, migrations)
- [ ] expo-sqlite — setup base locale
- [ ] Design system minimal (boutons, inputs, couleurs, typographie)
- [ ] Écran d'accueil basique

**Livrables** : app qui démarre, login fonctionnel, navigation en place.

---

### Phase 2 — Bibliothèque d'exercices (semaine 2-3)

**Objectif** : base d'exercices exploitable.

- [ ] Seed de 200-300 exercices standards
- [ ] Écran bibliothèque avec recherche + filtres
- [ ] Fiche exercice (muscles, équipement, notes, alternatives)
- [ ] Création d'exercice custom (encadrée)
- [ ] Favoris
- [ ] Sync bibliothèque custom avec Supabase

**Livrables** : bibliothèque consultable et fonctionnelle.

---

### Phase 3 — Programmes et blocs (semaine 3-5)

**Objectif** : générer un programme d'entraînement structuré.

- [ ] Questionnaire de génération (objectif, fréquence, niveau, matériel, contraintes)
- [ ] Moteur de génération de programmes (templates + logique de sélection)
- [ ] Entités Program → Block → WorkoutDay → PlannedExercise
- [ ] Écran programme : vue du bloc en cours
- [ ] Vue semaine : jours d'entraînement
- [ ] Détail d'un workout day : exercices, sets, rep ranges, RIR
- [ ] Assignation automatique des progressionType + progressionConfig
- [ ] Possibilité de modifier un programme généré (ajustements limités)

**Livrables** : l'utilisateur peut générer un programme et voir sa planification.

---

### Phase 4 — Logger de séance (semaine 5-7)

**Objectif** : logger une séance aussi vite qu'un carnet.

- [ ] Écran "Aujourd'hui" avec séance proposée
- [ ] Écran séance live
- [ ] Saisie rapide de sets (charge, reps, RIR)
- [ ] Valeurs pré-remplies intelligentes (dernière séance + ajustement)
- [ ] Bouton "Repeat previous set"
- [ ] Timer repos automatique avec notification
- [ ] Navigation entre exercices (swipe)
- [ ] Notes rapides par set et par séance
- [ ] Readiness pré-séance (énergie, sommeil, motivation)
- [ ] Stockage local SQLite (offline-first)
- [ ] Fin de séance : sauvegarde + marquage completed

**Livrables** : séance complète loggable offline.

---

### Phase 5 — Moteur de progression (semaine 7-9)

**Objectif** : l'app décide quoi faire la prochaine fois.

- [ ] Implémentation des 6 types de progression
- [ ] Calcul des charges cibles pour la prochaine séance
- [ ] Calcul du statut de séance (progression / maintien / allégée / deload)
- [ ] Score de performance de séance
- [ ] Détection de plateau
- [ ] Fatigue score basique
- [ ] Règles de deload (auto + programmé)
- [ ] Recommandations stockées en DB (source: rules_engine)
- [ ] Affichage des recommandations sur l'écran "Aujourd'hui"

**Livrables** : la boucle complète fonctionne — logger → analyse → recommandation → prochaine séance.

---

### Phase 6 — Sync et import (semaine 9-10)

**Objectif** : les données remontent au serveur et l'historique existant est récupérable.

- [ ] Sync engine (SQLite → Supabase)
- [ ] Queue de sync offline
- [ ] Gestion des conflits (last-write-wins)
- [ ] Import CSV (format Hevy)
- [ ] Mapping d'exercices à l'import
- [ ] Calibration des charges initiales depuis l'historique importé

**Livrables** : données synchronisées, historique Hevy importable.

---

### Phase 7 — IA contextuelle (semaine 10-12)

**Objectif** : l'IA explique et enrichit.

- [ ] AIContextProfile : construction et mise à jour automatique
- [ ] Abstraction AIProvider + ClaudeProvider + FallbackProvider
- [ ] Résumé fin de séance (IA)
- [ ] Explication d'ajustement (IA)
- [ ] Analyse de plateau (IA, à la demande)
- [ ] Prompts versionnés
- [ ] Affichage des résumés IA dans l'app

**Livrables** : résumés et explications IA fonctionnels.

---

### Phase 8 — Dashboard et analytics (semaine 12-14)

**Objectif** : visualiser la progression.

- [ ] Progression par exercice (graphe e1RM)
- [ ] Volume par groupe musculaire
- [ ] Progression poids du corps
- [ ] Score fatigue dans le temps
- [ ] Compliance au plan (% séances réalisées)
- [ ] Vue bloc : progression de la semaine

**Livrables** : dashboard analytics fonctionnel.

---

## 3. Jalons

| Jalon | Contenu | Semaine |
|---|---|---|
| **Alpha** | Phases 1-4 : app utilisable en salle (logger offline) | ~7 |
| **Beta** | Phases 5-6 : moteur intelligent + sync + import | ~10 |
| **MVP-core** | Phases 1-6 : app complète sans IA | ~10 |
| **MVP-complet** | Phases 7-8 : IA + dashboard | ~14 |

## 4. Dépendances critiques

```
Phase 1 (fondations)
  └── Phase 2 (exercices) + Phase 3 (programmes) [parallélisables partiellement]
       └── Phase 4 (logger) [dépend de 2+3]
            └── Phase 5 (moteur progression) [dépend de 4]
            └── Phase 6 (sync + import) [dépend de 4, parallélisable avec 5]
                 └── Phase 7 (IA) [dépend de 5+6]
                      └── Phase 8 (dashboard) [dépend de 5, parallélisable avec 7]
```

## 5. Risques identifiés

| Risque | Impact | Mitigation |
|---|---|---|
| Complexité sync offline | Élevé | Commencer simple (last-write-wins), itérer |
| Moteur de génération de programmes | Élevé | Commencer avec 3-4 templates, enrichir |
| Performance SQLite sur gros historique | Moyen | Index, pagination, nettoyage |
| Coût IA par utilisateur | Moyen | Prompt caching, limiter les appels auto |
| Seed exercices (200-300) | Faible | Préparer le dataset en amont |
