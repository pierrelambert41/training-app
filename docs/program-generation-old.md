# Moteur de génération de programmes

## 1. Objectif

L'utilisateur ne crée pas son programme librement. Il répond à un questionnaire et l'app génère un programme structuré, cohérent et adapté.

## 2. Flow utilisateur

### Étape 1 — Objectif
- Hypertrophie
- Force
- Mixte (hypertrophie + force)

### Étape 2 — Fréquence
- 3 jours / semaine
- 4 jours / semaine
- 5 jours / semaine
- 6 jours / semaine

### Étape 3 — Niveau
- Débutant (< 1 an de pratique sérieuse)
- Intermédiaire (1-3 ans)
- Avancé (3+ ans)

### Étape 4 — Matériel
- Salle complète (tout disponible)
- Home gym (barbell, haltères, rack, banc)
- Minimal (haltères + banc)

### Étape 5 — Contraintes
- Blessures / douleurs actuelles (multi-select par zone : épaule, dos, genou…)
- Exercices à éviter (recherche dans la bibliothèque)

### Étape 6 — Préférences optionnelles
- Muscles à prioriser (multi-select)
- Sports parallèles (course, vélo, etc.)
- Durée max de séance souhaitée

### Étape 7 — Résumé et validation
- Récapitulatif des choix
- Preview du programme généré
- Bouton "Valider" ou "Modifier"

## 3. Logique de génération

### 3.1 Sélection du template de split

| Fréquence | Niveau | Split recommandé |
|---|---|---|
| 3 jours | Débutant | Full body A/B/A |
| 3 jours | Intermédiaire | Full body A/B/C |
| 3 jours | Avancé | Full body A/B/C |
| 4 jours | Débutant | Upper/Lower x2 |
| 4 jours | Intermédiaire | Upper/Lower x2 |
| 4 jours | Avancé | Upper/Lower x2 |
| 5 jours | Intermédiaire | Upper/Lower/Push/Pull/Legs |
| 5 jours | Avancé | Push/Pull/Legs/Upper/Lower |
| 6 jours | Intermédiaire | Push/Pull/Legs x2 |
| 6 jours | Avancé | Push/Pull/Legs x2 |

### 3.2 Sélection des exercices

Pour chaque workout day, le moteur sélectionne :

1. **Exercices principaux** (composés) :
   - 1-2 par séance
   - Sélectionnés selon le split et l'objectif
   - Filtrés par matériel disponible
   - Filtrés par contraintes (exercices à éviter, blessures)
   - Progression type : `strength_fixed` ou `double_progression`

2. **Exercices secondaires** (composés légers / machines) :
   - 1-2 par séance
   - Complètent les principaux
   - Progression type : `double_progression`

3. **Exercices accessoires** (isolation) :
   - 2-3 par séance
   - Ciblent les muscles secondaires ou les points faibles
   - Ajustés selon les priorités musculaires de l'utilisateur
   - Progression type : `accessory_linear`

### 3.3 Paramétrage par objectif

| Paramètre | Hypertrophie | Force | Mixte |
|---|---|---|---|
| Sets principaux | 3-4 | 4-5 | 4 |
| Reps principaux | 8-12 | 3-5 | 5-8 |
| RIR cible principaux | 2-3 | 1-2 | 2 |
| Sets secondaires | 3-4 | 3 | 3 |
| Reps secondaires | 10-15 | 6-8 | 8-10 |
| Sets accessoires | 3 | 2-3 | 3 |
| Reps accessoires | 12-20 | 8-12 | 10-15 |
| Repos principaux | 90-120s | 180-300s | 120-180s |
| Repos secondaires | 60-90s | 120-180s | 90-120s |
| Repos accessoires | 45-60s | 60-90s | 60s |

### 3.4 Bloc initial

Le programme génère un premier bloc de **4-6 semaines** avec :
- Objectif aligné sur le choix utilisateur
- Deload strategy : `scheduled` en semaine 5 ou 7 (selon niveau)
- Semaine 1 = charges conservatrices (RIR 3-4)
- Montée progressive sur les premières semaines

### 3.5 Calibration des charges

- **Si historique importé** : charges basées sur l'e1RM calculé, avec marge de sécurité (80-85% pour force, 65-75% pour volume)
- **Si pas d'historique** : charges initiales laissées vides, l'utilisateur les renseigne à la première séance. Le moteur s'auto-calibre après 2-3 séances.

## 4. Catalogue d'exercices par split

### Push
**Principaux** : bench press (barbell/dumbbell), incline bench, overhead press
**Secondaires** : dips, machine chest press, landmine press
**Accessoires** : cable fly, lateral raise, triceps pushdown, overhead extension

### Pull
**Principaux** : barbell row, pull-up/chin-up, pendlay row
**Secondaires** : cable row, lat pulldown, chest-supported row
**Accessoires** : face pull, rear delt fly, biceps curl, hammer curl

### Legs
**Principaux** : squat, deadlift, Romanian deadlift
**Secondaires** : leg press, Bulgarian split squat, front squat
**Accessoires** : leg curl, leg extension, calf raise, hip thrust

### Upper
Combinaison Push + Pull, avec priorité sur les composés.

### Lower
Combinaison Legs, avec variété quad-dominant / hinge-dominant.

### Full body
1 push + 1 pull + 1 legs composé + 2-3 accessoires.

## 5. Ajustement du programme

L'utilisateur peut, après génération :
- **Remplacer un exercice** par une alternative de la bibliothèque (même groupe musculaire)
- **Modifier l'ordre** des exercices dans un workout day
- **Ne PAS** modifier les rep ranges, RIR cibles, ou règles de progression

## 6. Régénération de bloc

À la fin d'un bloc, l'app propose :
- Continuer avec un nouveau bloc (objectif ajusté ou maintenu)
- Les exercices peuvent changer légèrement (variantes)
- Les charges de départ du nouveau bloc = charges de fin du bloc précédent
- Possibilité de deload automatique entre les blocs
