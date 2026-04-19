# Exigences UX / Product Design

## 1. Principes fondamentaux

1. **Mobile-first absolu** — l'app est utilisée en salle, debout, entre les séries
2. **Rapidité avant tout** — le logger doit être plus rapide qu'un carnet
3. **Minimum de taps** — chaque action supplémentaire est un frein
4. **Lisibilité en salle** — gros texte, bon contraste, pas de surcharge visuelle
5. **Usage à une main** — les boutons critiques sont accessibles au pouce
6. **Dark mode** — obligatoire, potentiellement le mode par défaut

## 2. Écrans principaux

### 2.1 Home / Aujourd'hui
- Séance du jour proposée
- Statut de la séance (progression / maintien / allégée / deload)
- Bouton "Démarrer la séance" proéminent
- Résumé rapide : dernière séance, streak, fatigue
- Quick access : readiness, poids du jour

### 2.2 Séance live (écran le plus critique)
- **En-tête** : nom de la séance, timer global, exercice courant
- **Zone exercice** : nom, sets prévus, charge cible, RIR cible
- **Grille de sets** : une ligne par set avec colonnes poids / reps / RIR
- **Bouton "Log set"** : gros, accessible, un tap pour valider
- **Bouton "Repeat previous"** : duplique le set précédent
- **Timer repos** : se lance automatiquement après un set, notification sonore
- **Navigation** : swipe ou tap pour passer à l'exercice suivant
- **Notes rapides** : champ optionnel, pas intrusif

#### Contraintes UX séance
- Pas de modal inutile
- Pas de confirmation pour chaque set (sauf suppression)
- Le clavier numérique s'ouvre directement sur le bon champ
- Les valeurs par défaut sont intelligentes (dernière séance + ajustement)
- La modification d'un set déjà loggé est rapide (tap sur la ligne)

### 2.3 Fin de séance
- Score de la séance
- Résumé : exercices réussis / en difficulté
- Recommandations pour la prochaine séance
- Résumé IA (si disponible)
- Bouton "Terminer"

### 2.4 Programme / Bloc
- Vue du bloc en cours
- Semaine courante
- Jours d'entraînement avec exercices listés
- Progression de la semaine (jours faits / restants)
- Vue calendrier optionnelle

### 2.5 Questionnaire de génération de programme
- Flow multi-étapes simple
- Une question par écran
- Choix visuels (cartes, pas de dropdowns)
- Résumé avant validation
- Possibilité de modifier

### 2.6 Bibliothèque d'exercices
- Recherche rapide
- Filtres : muscle, équipement, catégorie
- Fiche exercice : muscles, alternatives, notes coaching
- Favoris
- Création d'exercice custom (encadrée, secondaire)

### 2.7 Dashboard (MVP-complet)
- Progression par exercice (graphe e1RM)
- Volume par groupe musculaire
- Poids du corps
- Score fatigue
- Compliance au plan

### 2.8 Profil / Settings
- Unités (kg/lb)
- Objectifs
- Contraintes
- Import de données
- Données de récupération

## 3. Patterns d'interaction

### Saisie rapide de sets
```
[Charge cible pré-remplie] → tap pour modifier ou valider
[Reps cibles pré-remplies] → tap pour modifier ou valider
[RIR] → sélecteur rapide 0-5
[LOG SET] → gros bouton → timer repos se lance
```

### Timer repos
- Démarre automatiquement après log d'un set
- Notification sonore/vibration à la fin
- Affichage en overlay ou en haut de l'écran
- Possibilité de skip
- Temps de repos personnalisé par exercice

### Navigation en séance
- Swipe horizontal entre exercices
- Indicateur de progression (dots ou barre)
- Bouton "skip" pour passer un exercice
- Bouton "add exercise" pour ajouter un exo non prévu

## 4. Design tokens à respecter

### Typographie
- Grands chiffres pour les charges et reps (24-32pt minimum en séance)
- Labels clairs et courts
- Pas de texte superflu en mode séance

### Couleurs
- Dark mode principal
- Vert : progression, réussite, RIR confortable
- Orange : maintien, attention, fatigue modérée
- Rouge : échec, fatigue haute, deload
- Bleu/accent : actions, boutons principaux

### Espacement
- Zones de tap minimum 44x44pt
- Espacement généreux entre les éléments interactifs
- Pas de boutons trop proches (risque d'erreur en salle)

## 5. Exigences de coaching

Le produit doit expliquer **pourquoi** il recommande quelque chose, mais de façon concise :

- Pas de pavés de texte
- Distinction claire entre :
  - **Données** : "Bench 95kg x 5 (RIR 2)"
  - **Diagnostic** : "En progression, RIR confortable"
  - **Action** : "→ +2.5kg la prochaine fois"
- Icônes pour les statuts (flèche haut / trait / flèche bas)
- Tooltip ou expand pour le détail si l'utilisateur veut creuser

## 6. Accessibilité

- Contraste suffisant en dark mode
- Taille de texte minimale respectée
- Support du Dynamic Type iOS
- Retour haptique sur les actions clés (log set, timer fini)
