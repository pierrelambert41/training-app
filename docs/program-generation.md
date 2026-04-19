# Moteur de génération de programmes — version révisée

## 1. Objectif

L'utilisateur ne crée pas son programme librement. Il répond à un questionnaire et l'app génère un programme structuré, cohérent, adapté, **et piloté par une méthode propriétaire**.

Le moteur ne doit pas seulement “assembler des exercices”.
Il doit :

- choisir un split cohérent,
- sélectionner les exercices les plus adaptés,
- doser le volume,
- choisir les bons types de progression,
- tenir compte de la fatigue,
- tenir compte du profil morphologique,
- tenir compte du niveau réel et pas seulement des années de pratique,
- générer un **bloc exploitable immédiatement**.

---

## 2. Principes directeurs non négociables

1. **L’app impose une méthode**
   - pas de construction libre de programme,
   - pas de règle custom définie par l’utilisateur,
   - pas de “tableur d’entraînement”.

2. **Le moteur privilégie la cohérence long terme**
   - stabilité suffisante des exercices,
   - progression lisible,
   - gestion de la fatigue,
   - changements limités entre les blocs.

3. **Le moteur doit faire passer la qualité avant la variété**
   - peu d’exercices très pertinents > beaucoup d’exercices moyens.

4. **Le programme généré doit être compatible avec le moteur de progression**
   - les types de progression sont liés à la nature de l’exercice,
   - les choix d’exercices doivent faciliter un pilotage précis.

5. **Le programme doit être contextualisé**
   - objectif,
   - niveau,
   - matériel,
   - contraintes,
   - historique importé,
   - profil morphologique,
   - sports parallèles,
   - temps disponible.

---

## 3. Flow utilisateur

### Étape 1 — Objectif principal
- Hypertrophie
- Force
- Mixte (hypertrophie + force)

### Étape 2 — Fréquence
- 3 jours / semaine
- 4 jours / semaine
- 5 jours / semaine
- 6 jours / semaine

### Étape 3 — Niveau
- Débutant
- Intermédiaire
- Avancé

### Étape 4 — Matériel
- Salle complète
- Home gym
- Minimal

### Étape 5 — Contraintes
- Blessures / douleurs actuelles
- Exercices à éviter

### Étape 6 — Questionnaire de coaching
- Muscles à prioriser
- Sports parallèles
- Durée max de séance
- Préférence “force prioritaire” ou “look prioritaire” si objectif mixte
- Tolérance au volume (faible / moyenne / haute)
- Historique récent importé ou non

### Étape 7 — Données avancées si disponibles
- historique importé
- mensurations
- profil morphologique
- readiness moyen récent
- assiduité récente

### Étape 8 — Résumé et validation
- récapitulatif
- preview du programme
- validation

---

## 4. Changement important : la génération ne doit pas être purement template-based

Le document initial est bon, mais il faut éviter un moteur trop simpliste de type :

> objectif + fréquence + niveau = split fixe + catalogue

Cette logique est un bon point de départ, mais **pas suffisante**.

Le moteur final doit fonctionner en 3 couches :

### Couche 1 — Choix du split
- selon fréquence
- selon niveau
- selon objectif
- selon sports parallèles
- selon durée max de séance

### Couche 2 — Choix de la structure de la semaine
- quelle séance reçoit la priorité
- où placer les séances lourdes
- comment répartir le volume
- comment limiter les conflits fatigue

### Couche 3 — Choix des exercices
- par pattern
- par compatibilité matériel
- par compatibilité contraintes
- par compatibilité morphologique
- par capacité de progression mesurable

---

## 5. Logique de génération révisée

## 5.1 Sélection du split

| Fréquence | Niveau | Split recommandé |
|---|---|---|
| 3 jours | Débutant | Full body A/B/A |
| 3 jours | Intermédiaire | Full body A/B/C |
| 3 jours | Avancé | Full body A/B/C |
| 4 jours | Débutant | Upper/Lower x2 |
| 4 jours | Intermédiaire | Upper/Lower x2 |
| 4 jours | Avancé | Upper/Lower x2 ou Upper/Lower + priorité haut du corps |
| 5 jours | Intermédiaire | Upper/Lower/Push/Pull/Legs |
| 5 jours | Avancé | Push/Pull/Legs/Upper/Lower |
| 6 jours | Intermédiaire | Push/Pull/Legs x2 |
| 6 jours | Avancé | Push/Pull/Legs x2 |

### Ajustements à ajouter
Le split n’est pas choisi seulement selon fréquence + niveau.

Le moteur doit aussi tenir compte de :
- temps max par séance,
- présence de cardio/courses,
- priorité haut du corps / bas du corps,
- récupération perçue.

### Exemples
- Si objectif hypertrophie + sports parallèles jambes élevés :
  - privilégier un split avec lower mieux contrôlé.
- Si objectif mixte avec bench prioritaire :
  - un 4 jours Upper/Lower x2 peut être modifié pour inclure deux expositions bench clairement différenciées.

---

## 5.2 Sélection des exercices — principes révisés

Pour chaque workout day, le moteur sélectionne :

### 1. Exercices principaux
- 1 à 2 maximum
- choisis pour leur potentiel de progression
- choisis pour leur lisibilité dans le moteur de règles
- choisis pour leur compatibilité avec l’objectif

### 2. Exercices secondaires
- 1 à 3 selon durée dispo
- complémentaires, mesurables, stables

### 3. Accessoires
- 2 à 4 selon la place restante
- choisis pour :
  - muscles faibles,
  - esthétique,
  - équilibre articulaire,
  - prévention.

### Règle forte
Le moteur doit privilégier :
- les exercices **faciles à standardiser**,
- les exercices **faciles à logger**,
- les exercices **faciles à faire progresser**,
- les exercices **compatibles morpho et contraintes**.

### Ce qu’il faut éviter
- trop d’exercices “fun” mais peu pilotables,
- trop d’exercices redondants,
- trop de variations sur un même bloc,
- des mouvements très techniques mal compatibles avec un moteur auto-piloté.

---

## 5.3 Ajouter une notion de compatibilité morphologique

Le moteur doit pouvoir stocker, par exercice, un score ou des tags de compatibilité morphologique.

### Exemple de tags
- long_femur_friendly
- short_arm_push_friendly
- shoulder_friendly
- stable_progression
- low_fatigue
- axial_fatigue_high
- hinge_dominant
- quad_dominant
- lat_bias
- chest_bias

### Utilité
Le moteur peut alors :
- éviter certains mouvements pour certains profils,
- favoriser certains patterns,
- personnaliser davantage sans laisser l’utilisateur construire librement.

---

## 5.4 Paramétrage par objectif — à affiner

Le tableau initial est utile, mais doit être enrichi par **type de séance**.

Exemple :
- objectif mixte n’implique pas que toutes les séances soient “mixte” ;
- certaines séances doivent être clairement force,
- d’autres clairement hypertrophie.

### Recommandation
Garder les fourchettes du document initial, mais permettre une logique par séance :

#### Exemple objectif mixte en 4 jours
- Day 1 : force haut du corps
- Day 2 : lower hypertrophie contrôlée
- Day 3 : volume haut du corps
- Day 4 : pump / correction / dos / bras

Donc l’objectif global ne détermine pas seul la plage de reps de chaque séance.

---

## 5.5 Bloc initial — à renforcer

Le bloc initial de 4 à 6 semaines est bon, mais doit être plus précisément défini.

### Recommandation
Bloc initial de **6 semaines par défaut** :
- semaine 1 : calibration prudente
- semaine 2 à 4 : progression
- semaine 5 : consolidation / décision
- semaine 6 : deload si nécessaire ou transition bloc suivant

### Deload
Le deload ne doit pas être uniquement “scheduled”.
Le moteur doit pouvoir choisir entre :
- scheduled,
- fatigue-triggered,
- none.

### Décision recommandée
Au MVP :
- stratégie par défaut pilotée par le niveau + l’historique récent
- mais avec logique de fatigue simple

---

## 5.6 Calibration des charges — à rendre plus intelligente

Le texte initial est bon mais peut être amélioré.

### Si historique importé
Les charges de départ doivent se baser sur :
- e1RM,
- reps réelles récentes,
- réussite/échec,
- RIR si disponible,
- assiduité récente.

### Si historique absent
Le moteur ne doit pas simplement “laisser vide”.

### Recommandation
Si pas d’historique :
- soit charges vides + calibration manuelle guidée,
- soit poids suggérés très prudents selon niveau auto-déclaré,
- puis recalibrage automatique après 2–3 séances.

### Très important
Le moteur doit distinguer :
- historique récent utile,
- ancien historique devenu peu pertinent.

Exemple :
si l’utilisateur n’a pas touché un lift depuis 8 semaines, le moteur ne doit pas lui recaler une charge trop agressive.

---

## 6. Catalogue d’exercices — adaptation recommandée

Le catalogue par split est une bonne base, mais il doit évoluer vers une structure par :
- pattern,
- objectif,
- tags de fatigue,
- compatibilité morpho,
- compatibilité matériel,
- type de progression.

### Recommandation de structure
Pour chaque exercice :
- pattern : horizontal push / vertical pull / hinge / unilateral quad / etc.
- muscles principaux
- niveau de fatigue systémique
- stabilité du mouvement
- compatibilité morphologique
- matériel
- progressionType recommandé
- alternatives proches

### Important
Le catalogue ne doit pas être juste une liste d’exercices “par split”.
Il doit être une vraie base de connaissance exploitable par le moteur.

---

## 7. Création / proposition des programmes au MVP

## Décision forte
Au MVP, **l’app doit proposer / générer les programmes**.  
L’utilisateur **ne crée pas son programme librement**.

### Ce que l’utilisateur fait
- répond à un questionnaire,
- valide un programme généré,
- peut faire des micro-ajustements cadrés.

### Ce qu’il ne peut pas faire
- partir d’une page blanche,
- inventer la structure complète,
- changer librement la logique du bloc.

### Pourquoi
Le produit repose sur une **philosophie de coaching**.  
Donc :
- le programme doit rester cohérent avec les règles,
- l’app doit rester capable d’analyser ce qu’elle a prescrit,
- l’IA doit travailler sur une structure fiable.

---

## 8. Ajustement du programme par l’utilisateur — à encadrer davantage

Le document initial autorise :
- remplacement d’exercice,
- modification d’ordre.

C’est raisonnable, mais il faut cadrer.

### Oui à :
- remplacer un exercice par une alternative compatible,
- réordonner légèrement une séance,
- éventuellement choisir entre quelques variantes proposées.

### Non à :
- changer librement les rep ranges,
- changer le RIR cible,
- changer les types de progression,
- déséquilibrer la séance.

### Recommandation UX
Le remplacement doit être un flow guidé :
- l’utilisateur clique sur un exercice,
- l’app propose des alternatives compatibles,
- l’utilisateur choisit,
- le moteur conserve la logique associée.

---

## 9. Régénération de bloc — à préciser

Le document initial est bon, mais il faut ajouter la logique suivante :

### La régénération d’un bloc doit tenir compte de :
- progression réelle du bloc précédent,
- fatigue observée,
- assiduité,
- douleur / blessures remontées,
- objectifs modifiés,
- succès ou stagnation par groupe musculaire.

### Changement d’exercices entre blocs
Les exercices ne doivent pas changer trop brutalement.

#### Recommandation
- 60 à 80% du bloc suivant peut rester stable,
- 20 à 40% peut varier si pertinent.

### But
- garder une continuité analytique,
- éviter la lassitude,
- conserver la méthode.

---

## 10. Recommandations produit finales

### 10.1 Ce qu’il faut garder du document initial
- flow questionnaire
- logique de split
- structure principaux / secondaires / accessoires
- calibration historique
- possibilité de régénération de bloc

### 10.2 Ce qu’il faut modifier
- ne pas laisser penser que le moteur est juste template-based
- intégrer la compatibilité morphologique
- intégrer la fatigue et les sports parallèles dans la génération
- rendre la génération plus “coaching system” que “constructeur de planning”
- mieux définir la stratégie de bloc et de deload
- mieux structurer le catalogue d’exercices

### 10.3 Positionnement final
Le moteur de génération ne doit pas seulement “remplir des séances”.  
Il doit produire **le meilleur programme possible dans le cadre d’une méthode imposée** :
- lisible,
- progressif,
- analysable,
- ajustable,
- cohérent avec le moteur de progression et la couche IA.
