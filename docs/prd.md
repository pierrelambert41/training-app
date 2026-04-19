# PRD — App de pilotage d'entraînement

## 1. Vision produit

Créer une **plateforme de pilotage d'entraînement personnalisée**, orientée hypertrophie / force / progression intelligente.

Le produit n'est **pas** un simple logger d'entraînement. C'est un **co-pilote** qui :

- suit l'entraînement de façon ultra rapide et exploitable
- mesure l'intensité réelle (pas seulement le volume)
- ajuste la séance suivante selon la performance, la fatigue et le contexte
- centralise musculation, cardio, mensurations, ressenti, récupération
- enrichit un profil d'athlète exploitable par une IA

## 2. Problème à résoudre

Les apps existantes (Hevy, Strong, etc.) loggent bien les charges mais pilotent mal la progression :

- Pas de cible d'effort claire (pas de suivi RIR)
- Pas de règle de progression robuste (stockent les données mais ne décident pas)
- Trop de variété / pas assez de stabilité dans les exercices
- Pas de vraie séparation objectif force / hypertrophie
- Pas de garde-fou fatigue

## 3. Utilisateur cible

Utilisateur avancé/intermédiaire sérieux qui :

- s'entraîne 4+ fois par semaine
- log déjà ses séances
- veut progresser en hypertrophie et/ou force
- veut une logique de progression plus intelligente
- aime la donnée mais veut une UX rapide
- ne veut pas d'une usine à gaz en séance
- veut du concret : "quoi faire aujourd'hui" et "quoi faire la prochaine fois"

## 4. Philosophie produit

### Système coaché

L'utilisateur ne crée pas ses propres règles ni ses programmes librement. Le produit impose :

- la méthode de progression
- les règles d'ajustement
- la logique de fatigue/deload

L'utilisateur choisit : objectif, fréquence, niveau, matériel, et répond à un questionnaire. L'app génère le programme.

### Principes

1. Le logger doit rester plus rapide qu'un carnet
2. Le moteur de progression doit être compréhensible
3. L'IA ne doit jamais être seule juge des charges
4. Les intégrations santé doivent enrichir, pas compliquer
5. L'app doit expliquer **pourquoi** elle ajuste
6. Le produit doit devenir plus pertinent avec l'historique
7. Le contexte utilisateur structuré est essentiel pour une IA utile

## 5. Objectifs fonctionnels

### Avant séance
- Quelle séance faire aujourd'hui
- Quels exercices, fourchettes de reps, charges cibles, RIR cibles, temps de repos
- Quel statut : progression / maintien / allégée / prudente / agressive

### Pendant séance
- Logger ultra rapide (peu de taps, usage une main)
- Proposition du set suivant automatique
- Timer repos automatique
- Saisie rapide : poids, reps, RIR, note

### Fin de séance
- Résumé structuré : séance réussie / moyenne / ratée
- Exercices performants vs en dessous
- Fatigue détectée
- Adaptation pour la prochaine séance

### Entre les séances
- Suivi progression du bloc
- Identification des plateaux
- Suivi fatigue cumulée
- Proposition deload si nécessaire
- Ajustement automatique des charges

## 6. Scope MVP

### MVP-core
- Auth + profil
- Bibliothèque d'exercices (200-300 pré-remplis + création encadrée)
- Génération de programmes (questionnaire → programme)
- Programmes / blocs
- Logger séance ultra rapide
- Timer repos
- RIR
- Moteur de progression (rules-based)
- Ajustement séance suivante
- Offline-first
- Import CSV / Hevy

### MVP-complet (phase suivante)
- Dashboard analytics
- Résumé fin de séance
- Readiness enrichi
- Contexte utilisateur enrichi
- IA contextuelle
- Intégrations santé/cardio

## 7. Fonctionnalités V2
- Import Apple Health
- Import Strava
- Readiness score enrichi
- Mensurations + photos
- IA coach avancée
- Génération de blocs avancée
- Recommandations morphologiques
- Moteur de priorisation musculaire
- Support course intégré
