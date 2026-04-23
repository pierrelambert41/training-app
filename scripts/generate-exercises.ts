#!/usr/bin/env npx ts-node --esm
import { writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

type Category = 'compound' | 'isolation' | 'bodyweight' | 'machine' | 'cable';
type MovementPattern =
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'hinge'
  | 'squat'
  | 'unilateral_quad'
  | 'unilateral_hinge'
  | 'isolation_upper'
  | 'isolation_lower'
  | 'core'
  | 'carry';
type LogType = 'weight_reps' | 'bodyweight_reps' | 'duration' | 'distance_duration';
type SystemicFatigue = 'low' | 'moderate' | 'high';
type MovementStability = 'stable' | 'moderate' | 'variable';
type ProgressionType =
  | 'strength_fixed'
  | 'double_progression'
  | 'accessory_linear'
  | 'bodyweight_progression'
  | 'duration_progression'
  | 'distance_duration';

interface Exercise {
  id: string;
  name: string;
  name_fr: string;
  category: Category;
  movement_pattern: MovementPattern;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  log_type: LogType;
  is_unilateral: boolean;
  systemic_fatigue: SystemicFatigue;
  movement_stability: MovementStability;
  morpho_tags: string[];
  recommended_progression_type: ProgressionType;
  alternatives: string[];
  coaching_notes: string | null;
  tags: string[];
  is_custom: boolean;
  created_by: null;
  created_at: string;
}

const now = new Date().toISOString();

function ex(
  name: string,
  name_fr: string,
  category: Category,
  movement_pattern: MovementPattern,
  primary_muscles: string[],
  secondary_muscles: string[],
  equipment: string[],
  log_type: LogType,
  is_unilateral: boolean,
  systemic_fatigue: SystemicFatigue,
  movement_stability: MovementStability,
  morpho_tags: string[],
  recommended_progression_type: ProgressionType,
  tags: string[],
  coaching_notes: string | null = null
): Omit<Exercise, 'id' | 'alternatives' | 'is_custom' | 'created_by' | 'created_at'> {
  return {
    name,
    name_fr,
    category,
    movement_pattern,
    primary_muscles,
    secondary_muscles,
    equipment,
    log_type,
    is_unilateral,
    systemic_fatigue,
    movement_stability,
    morpho_tags,
    recommended_progression_type,
    tags,
    coaching_notes,
  };
}

const definitions = [
  // ── HORIZONTAL PUSH ────────────────────────────────────────────
  ex('Barbell Bench Press', 'Développé couché barre', 'compound', 'horizontal_push', ['chest'], ['triceps', 'front_deltoid'], ['barbell', 'bench'], 'weight_reps', false, 'high', 'stable', ['chest_bias', 'stable_progression'], 'strength_fixed', ['push', 'chest', 'strength']),
  ex('Dumbbell Bench Press', 'Développé couché haltères', 'compound', 'horizontal_push', ['chest'], ['triceps', 'front_deltoid'], ['dumbbell', 'bench'], 'weight_reps', false, 'moderate', 'moderate', ['chest_bias', 'shoulder_friendly'], 'double_progression', ['push', 'chest']),
  ex('Incline Barbell Bench Press', 'Développé incliné barre', 'compound', 'horizontal_push', ['upper_chest'], ['triceps', 'front_deltoid'], ['barbell', 'incline_bench'], 'weight_reps', false, 'high', 'stable', ['chest_bias'], 'strength_fixed', ['push', 'upper_chest']),
  ex('Incline Dumbbell Bench Press', 'Développé incliné haltères', 'compound', 'horizontal_push', ['upper_chest'], ['triceps', 'front_deltoid'], ['dumbbell', 'incline_bench'], 'weight_reps', false, 'moderate', 'moderate', ['chest_bias', 'shoulder_friendly'], 'double_progression', ['push', 'upper_chest']),
  ex('Decline Barbell Bench Press', 'Développé décliné barre', 'compound', 'horizontal_push', ['lower_chest'], ['triceps'], ['barbell', 'decline_bench'], 'weight_reps', false, 'high', 'stable', ['chest_bias'], 'double_progression', ['push', 'lower_chest']),
  ex('Decline Dumbbell Bench Press', 'Développé décliné haltères', 'compound', 'horizontal_push', ['lower_chest'], ['triceps'], ['dumbbell', 'decline_bench'], 'weight_reps', false, 'moderate', 'moderate', ['chest_bias'], 'double_progression', ['push', 'lower_chest']),
  ex('Machine Chest Press', 'Presse pectorale machine', 'machine', 'horizontal_push', ['chest'], ['triceps', 'front_deltoid'], ['chest_press_machine'], 'weight_reps', false, 'low', 'stable', ['chest_bias', 'stable_progression', 'shoulder_friendly'], 'double_progression', ['push', 'chest', 'machine']),
  ex('Cable Fly', 'Écarté poulie', 'cable', 'horizontal_push', ['chest'], ['front_deltoid'], ['cable_machine'], 'weight_reps', false, 'low', 'stable', ['chest_bias', 'low_fatigue'], 'accessory_linear', ['chest', 'isolation', 'cable']),
  ex('Dumbbell Fly', 'Écarté haltères', 'isolation', 'horizontal_push', ['chest'], ['front_deltoid'], ['dumbbell', 'bench'], 'weight_reps', false, 'low', 'moderate', ['chest_bias', 'shoulder_friendly'], 'accessory_linear', ['chest', 'isolation']),
  ex('Pec Deck', 'Pec deck machine', 'machine', 'horizontal_push', ['chest'], ['front_deltoid'], ['pec_deck_machine'], 'weight_reps', false, 'low', 'stable', ['chest_bias', 'stable_progression', 'low_fatigue'], 'accessory_linear', ['chest', 'isolation', 'machine']),
  ex('Push-Up', 'Pompe', 'bodyweight', 'horizontal_push', ['chest'], ['triceps', 'front_deltoid'], [], 'bodyweight_reps', false, 'low', 'moderate', ['chest_bias', 'low_fatigue'], 'bodyweight_progression', ['push', 'chest', 'bodyweight']),
  ex('Weighted Push-Up', 'Pompe lestée', 'bodyweight', 'horizontal_push', ['chest'], ['triceps', 'front_deltoid'], ['weight_plate'], 'weight_reps', false, 'moderate', 'moderate', ['chest_bias'], 'double_progression', ['push', 'chest', 'bodyweight']),
  ex('Cable Chest Press', 'Développé poitrine poulie', 'cable', 'horizontal_push', ['chest'], ['triceps', 'front_deltoid'], ['cable_machine'], 'weight_reps', false, 'moderate', 'stable', ['chest_bias'], 'double_progression', ['push', 'chest', 'cable']),
  ex('Smith Machine Bench Press', 'Développé couché Smith', 'machine', 'horizontal_push', ['chest'], ['triceps', 'front_deltoid'], ['smith_machine', 'bench'], 'weight_reps', false, 'high', 'stable', ['chest_bias', 'stable_progression'], 'strength_fixed', ['push', 'chest', 'machine']),
  ex('Dumbbell Pullover', 'Pull-over haltère', 'isolation', 'horizontal_push', ['chest', 'lats'], ['triceps', 'serratus'], ['dumbbell', 'bench'], 'weight_reps', false, 'low', 'moderate', ['lat_bias', 'chest_bias'], 'accessory_linear', ['chest', 'lats', 'isolation']),

  // ── VERTICAL PUSH ──────────────────────────────────────────────
  ex('Barbell Overhead Press', 'Développé militaire barre', 'compound', 'vertical_push', ['front_deltoid', 'lateral_deltoid'], ['triceps', 'upper_chest'], ['barbell'], 'weight_reps', false, 'high', 'variable', ['axial_fatigue_high'], 'strength_fixed', ['push', 'shoulder', 'strength']),
  ex('Dumbbell Shoulder Press', 'Développé épaules haltères', 'compound', 'vertical_push', ['front_deltoid', 'lateral_deltoid'], ['triceps', 'upper_chest'], ['dumbbell'], 'weight_reps', false, 'moderate', 'moderate', ['shoulder_friendly'], 'double_progression', ['push', 'shoulder']),
  ex('Machine Shoulder Press', 'Presse épaules machine', 'machine', 'vertical_push', ['front_deltoid', 'lateral_deltoid'], ['triceps'], ['shoulder_press_machine'], 'weight_reps', false, 'low', 'stable', ['stable_progression', 'shoulder_friendly'], 'double_progression', ['push', 'shoulder', 'machine']),
  ex('Arnold Press', 'Arnold press', 'compound', 'vertical_push', ['front_deltoid', 'lateral_deltoid'], ['triceps'], ['dumbbell'], 'weight_reps', false, 'moderate', 'moderate', [], 'double_progression', ['push', 'shoulder']),
  ex('Seated Dumbbell Shoulder Press', 'Développé épaules haltères assis', 'compound', 'vertical_push', ['front_deltoid', 'lateral_deltoid'], ['triceps'], ['dumbbell', 'bench'], 'weight_reps', false, 'moderate', 'stable', ['stable_progression'], 'double_progression', ['push', 'shoulder']),
  ex('Cable Overhead Press', 'Développé vertical poulie', 'cable', 'vertical_push', ['front_deltoid', 'lateral_deltoid'], ['triceps'], ['cable_machine'], 'weight_reps', false, 'low', 'stable', [], 'accessory_linear', ['push', 'shoulder', 'cable']),
  ex('Dumbbell Lateral Raise', 'Élévation latérale haltères', 'isolation', 'isolation_upper', ['lateral_deltoid'], [], ['dumbbell'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['shoulder', 'isolation']),
  ex('Cable Lateral Raise', 'Élévation latérale poulie', 'cable', 'isolation_upper', ['lateral_deltoid'], [], ['cable_machine'], 'weight_reps', true, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['shoulder', 'isolation', 'cable']),
  ex('Machine Lateral Raise', 'Élévation latérale machine', 'machine', 'isolation_upper', ['lateral_deltoid'], [], ['lateral_raise_machine'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['shoulder', 'isolation', 'machine']),
  ex('Dumbbell Front Raise', 'Élévation frontale haltères', 'isolation', 'isolation_upper', ['front_deltoid'], [], ['dumbbell'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['shoulder', 'isolation']),
  ex('Handstand Push-Up', 'Pompe en équilibre', 'bodyweight', 'vertical_push', ['front_deltoid', 'lateral_deltoid'], ['triceps'], [], 'bodyweight_reps', false, 'moderate', 'variable', [], 'bodyweight_progression', ['push', 'shoulder', 'bodyweight']),
  ex('Pike Push-Up', 'Pompe en pike', 'bodyweight', 'vertical_push', ['front_deltoid', 'lateral_deltoid'], ['triceps'], [], 'bodyweight_reps', false, 'low', 'moderate', [], 'bodyweight_progression', ['push', 'shoulder', 'bodyweight']),

  // ── HORIZONTAL PULL ────────────────────────────────────────────
  ex('Barbell Row', 'Rowing barre', 'compound', 'horizontal_pull', ['lats', 'rhomboids'], ['biceps', 'rear_deltoid'], ['barbell'], 'weight_reps', false, 'high', 'variable', ['lat_bias', 'hinge_dominant'], 'strength_fixed', ['pull', 'back', 'strength']),
  ex('Dumbbell Row', 'Rowing haltère', 'compound', 'horizontal_pull', ['lats', 'rhomboids'], ['biceps', 'rear_deltoid'], ['dumbbell', 'bench'], 'weight_reps', true, 'moderate', 'moderate', ['lat_bias'], 'double_progression', ['pull', 'back']),
  ex('Cable Row', 'Tirage câble horizontal', 'cable', 'horizontal_pull', ['lats', 'rhomboids'], ['biceps', 'rear_deltoid'], ['cable_machine', 'row_attachment'], 'weight_reps', false, 'moderate', 'stable', ['lat_bias', 'stable_progression'], 'double_progression', ['pull', 'back', 'cable']),
  ex('Machine Row', 'Rowing machine', 'machine', 'horizontal_pull', ['lats', 'rhomboids'], ['biceps', 'rear_deltoid'], ['row_machine'], 'weight_reps', false, 'low', 'stable', ['lat_bias', 'stable_progression'], 'double_progression', ['pull', 'back', 'machine']),
  ex('T-Bar Row', 'Rowing T-bar', 'compound', 'horizontal_pull', ['lats', 'rhomboids'], ['biceps', 'rear_deltoid'], ['t_bar', 'barbell'], 'weight_reps', false, 'high', 'moderate', ['lat_bias'], 'strength_fixed', ['pull', 'back', 'strength']),
  ex('Chest-Supported Row', 'Rowing poitrine supportée', 'compound', 'horizontal_pull', ['lats', 'rhomboids'], ['biceps', 'rear_deltoid'], ['incline_bench', 'dumbbell'], 'weight_reps', false, 'moderate', 'stable', ['lat_bias', 'stable_progression'], 'double_progression', ['pull', 'back']),
  ex('Inverted Row', 'Rowing à l\'australienne', 'bodyweight', 'horizontal_pull', ['lats', 'rhomboids'], ['biceps', 'rear_deltoid'], ['barbell', 'rack'], 'bodyweight_reps', false, 'low', 'moderate', ['lat_bias', 'low_fatigue'], 'bodyweight_progression', ['pull', 'back', 'bodyweight']),
  ex('Face Pull', 'Tirage face poulie', 'cable', 'horizontal_pull', ['rear_deltoid', 'rhomboids'], ['biceps'], ['cable_machine', 'rope_attachment'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'shoulder_friendly'], 'accessory_linear', ['shoulder', 'back', 'cable']),
  ex('Rear Delt Fly', 'Écarté arrière haltères', 'isolation', 'isolation_upper', ['rear_deltoid'], ['rhomboids'], ['dumbbell'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['shoulder', 'isolation']),
  ex('Cable Rear Delt Fly', 'Écarté arrière poulie', 'cable', 'isolation_upper', ['rear_deltoid'], ['rhomboids'], ['cable_machine'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['shoulder', 'cable']),
  ex('Pec Deck Rear Delt', 'Pec deck arrière', 'machine', 'isolation_upper', ['rear_deltoid'], ['rhomboids'], ['pec_deck_machine'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['shoulder', 'machine']),
  ex('Smith Machine Row', 'Rowing Smith', 'machine', 'horizontal_pull', ['lats', 'rhomboids'], ['biceps', 'rear_deltoid'], ['smith_machine'], 'weight_reps', false, 'moderate', 'stable', ['lat_bias', 'stable_progression'], 'double_progression', ['pull', 'back', 'machine']),
  ex('Meadows Row', 'Rowing Meadows', 'compound', 'horizontal_pull', ['lats'], ['biceps', 'rear_deltoid'], ['barbell', 'landmine'], 'weight_reps', true, 'moderate', 'moderate', ['lat_bias'], 'double_progression', ['pull', 'back']),

  // ── VERTICAL PULL ──────────────────────────────────────────────
  ex('Pull-Up', 'Traction pronation', 'bodyweight', 'vertical_pull', ['lats'], ['biceps', 'rear_deltoid'], ['pull_up_bar'], 'bodyweight_reps', false, 'moderate', 'moderate', ['lat_bias'], 'bodyweight_progression', ['pull', 'back', 'bodyweight']),
  ex('Chin-Up', 'Traction supination', 'bodyweight', 'vertical_pull', ['lats', 'biceps'], ['rear_deltoid'], ['pull_up_bar'], 'bodyweight_reps', false, 'moderate', 'moderate', ['lat_bias'], 'bodyweight_progression', ['pull', 'back', 'bodyweight']),
  ex('Weighted Pull-Up', 'Traction lestée pronation', 'compound', 'vertical_pull', ['lats'], ['biceps', 'rear_deltoid'], ['pull_up_bar', 'dip_belt'], 'weight_reps', false, 'high', 'moderate', ['lat_bias'], 'double_progression', ['pull', 'back', 'strength']),
  ex('Weighted Chin-Up', 'Traction lestée supination', 'compound', 'vertical_pull', ['lats', 'biceps'], ['rear_deltoid'], ['pull_up_bar', 'dip_belt'], 'weight_reps', false, 'high', 'moderate', ['lat_bias'], 'double_progression', ['pull', 'back', 'strength']),
  ex('Lat Pulldown', 'Tirage vertical poulie', 'cable', 'vertical_pull', ['lats'], ['biceps', 'rear_deltoid'], ['cable_machine', 'lat_bar'], 'weight_reps', false, 'moderate', 'stable', ['lat_bias', 'stable_progression'], 'double_progression', ['pull', 'back', 'cable']),
  ex('Close-Grip Lat Pulldown', 'Tirage vertical prise serrée', 'cable', 'vertical_pull', ['lats', 'biceps'], ['rear_deltoid'], ['cable_machine', 'close_grip_bar'], 'weight_reps', false, 'moderate', 'stable', ['lat_bias', 'stable_progression'], 'double_progression', ['pull', 'back', 'cable']),
  ex('Wide-Grip Lat Pulldown', 'Tirage vertical prise large', 'cable', 'vertical_pull', ['lats'], ['biceps', 'rear_deltoid'], ['cable_machine', 'lat_bar'], 'weight_reps', false, 'moderate', 'stable', ['lat_bias'], 'double_progression', ['pull', 'back', 'cable']),
  ex('Machine Pulldown', 'Tirage vertical machine', 'machine', 'vertical_pull', ['lats'], ['biceps', 'rear_deltoid'], ['pulldown_machine'], 'weight_reps', false, 'low', 'stable', ['lat_bias', 'stable_progression'], 'double_progression', ['pull', 'back', 'machine']),
  ex('Straight Arm Pulldown', 'Tirage bras tendus poulie', 'cable', 'isolation_upper', ['lats', 'serratus'], [], ['cable_machine'], 'weight_reps', false, 'low', 'stable', ['lat_bias', 'low_fatigue'], 'accessory_linear', ['back', 'cable', 'isolation']),
  ex('Single-Arm Lat Pulldown', 'Tirage unilatéral poulie', 'cable', 'vertical_pull', ['lats'], ['biceps'], ['cable_machine'], 'weight_reps', true, 'low', 'stable', ['lat_bias', 'stable_progression'], 'accessory_linear', ['pull', 'back', 'cable']),
  ex('Neutral-Grip Pull-Up', 'Traction prise neutre', 'bodyweight', 'vertical_pull', ['lats', 'biceps'], ['rear_deltoid'], ['pull_up_bar'], 'bodyweight_reps', false, 'moderate', 'moderate', ['lat_bias', 'shoulder_friendly'], 'bodyweight_progression', ['pull', 'back', 'bodyweight']),

  // ── HINGE ──────────────────────────────────────────────────────
  ex('Conventional Deadlift', 'Soulevé de terre conventionnel', 'compound', 'hinge', ['hamstrings', 'glutes', 'lower_back'], ['traps', 'lats', 'quads'], ['barbell'], 'weight_reps', false, 'high', 'variable', ['hinge_dominant', 'axial_fatigue_high'], 'strength_fixed', ['hinge', 'posterior_chain', 'strength']),
  ex('Sumo Deadlift', 'Soulevé de terre sumo', 'compound', 'hinge', ['hamstrings', 'glutes', 'inner_thigh'], ['lower_back', 'quads'], ['barbell'], 'weight_reps', false, 'high', 'variable', ['hinge_dominant', 'axial_fatigue_high', 'long_femur_friendly'], 'strength_fixed', ['hinge', 'posterior_chain', 'strength']),
  ex('Romanian Deadlift', 'Soulevé de terre roumain', 'compound', 'hinge', ['hamstrings', 'glutes'], ['lower_back'], ['barbell'], 'weight_reps', false, 'high', 'moderate', ['hinge_dominant'], 'double_progression', ['hinge', 'posterior_chain']),
  ex('Dumbbell Romanian Deadlift', 'SDT roumain haltères', 'compound', 'hinge', ['hamstrings', 'glutes'], ['lower_back'], ['dumbbell'], 'weight_reps', false, 'moderate', 'moderate', ['hinge_dominant'], 'double_progression', ['hinge', 'posterior_chain']),
  ex('Trap Bar Deadlift', 'Soulevé de terre hexagonal', 'compound', 'hinge', ['hamstrings', 'glutes', 'quads'], ['lower_back', 'traps'], ['trap_bar'], 'weight_reps', false, 'high', 'stable', ['hinge_dominant', 'axial_fatigue_high', 'long_femur_friendly', 'stable_progression'], 'strength_fixed', ['hinge', 'strength']),
  ex('Good Morning', 'Good morning barre', 'compound', 'hinge', ['hamstrings', 'lower_back'], ['glutes'], ['barbell'], 'weight_reps', false, 'moderate', 'variable', ['hinge_dominant', 'axial_fatigue_high'], 'double_progression', ['hinge', 'posterior_chain']),
  ex('Kettlebell Swing', 'Swing kettlebell', 'compound', 'hinge', ['glutes', 'hamstrings'], ['lower_back', 'core'], ['kettlebell'], 'weight_reps', false, 'moderate', 'variable', ['hinge_dominant'], 'double_progression', ['hinge', 'power']),
  ex('Barbell Hip Thrust', 'Hip thrust barre', 'compound', 'hinge', ['glutes'], ['hamstrings'], ['barbell', 'bench'], 'weight_reps', false, 'moderate', 'stable', ['stable_progression'], 'double_progression', ['hinge', 'glutes']),
  ex('Dumbbell Hip Thrust', 'Hip thrust haltères', 'compound', 'hinge', ['glutes'], ['hamstrings'], ['dumbbell', 'bench'], 'weight_reps', false, 'moderate', 'stable', ['stable_progression'], 'double_progression', ['hinge', 'glutes']),
  ex('Machine Hip Thrust', 'Hip thrust machine', 'machine', 'hinge', ['glutes'], ['hamstrings'], ['hip_thrust_machine'], 'weight_reps', false, 'low', 'stable', ['stable_progression', 'low_fatigue'], 'double_progression', ['hinge', 'glutes', 'machine']),
  ex('Cable Pull-Through', 'Tirage câble entre jambes', 'cable', 'hinge', ['glutes', 'hamstrings'], ['lower_back'], ['cable_machine'], 'weight_reps', false, 'low', 'stable', ['low_fatigue'], 'accessory_linear', ['hinge', 'glutes', 'cable']),
  ex('Glute Bridge', 'Pont fessier', 'bodyweight', 'hinge', ['glutes'], ['hamstrings'], [], 'bodyweight_reps', false, 'low', 'stable', ['low_fatigue'], 'bodyweight_progression', ['hinge', 'glutes', 'bodyweight']),
  ex('Stiff-Leg Deadlift', 'SDT jambes tendues', 'compound', 'hinge', ['hamstrings', 'lower_back'], ['glutes'], ['barbell'], 'weight_reps', false, 'high', 'moderate', ['hinge_dominant'], 'double_progression', ['hinge', 'posterior_chain']),
  ex('Single-Leg Romanian Deadlift', 'SDT roumain unijambiste', 'compound', 'unilateral_hinge', ['hamstrings', 'glutes'], ['lower_back'], ['dumbbell'], 'weight_reps', true, 'moderate', 'variable', ['hinge_dominant'], 'double_progression', ['hinge', 'unilateral', 'posterior_chain']),
  ex('Dumbbell Deadlift', 'Soulevé de terre haltères', 'compound', 'hinge', ['hamstrings', 'glutes', 'lower_back'], ['traps', 'lats'], ['dumbbell'], 'weight_reps', false, 'moderate', 'moderate', ['hinge_dominant'], 'double_progression', ['hinge', 'posterior_chain']),

  // ── SQUAT ──────────────────────────────────────────────────────
  ex('Barbell Back Squat', 'Squat barre haute', 'compound', 'squat', ['quads', 'glutes'], ['hamstrings', 'lower_back'], ['barbell', 'rack'], 'weight_reps', false, 'high', 'variable', ['quad_dominant', 'axial_fatigue_high'], 'strength_fixed', ['squat', 'legs', 'strength']),
  ex('Barbell Front Squat', 'Squat barre avant', 'compound', 'squat', ['quads', 'glutes'], ['core', 'upper_back'], ['barbell', 'rack'], 'weight_reps', false, 'high', 'variable', ['quad_dominant', 'axial_fatigue_high', 'long_femur_friendly'], 'strength_fixed', ['squat', 'legs', 'strength']),
  ex('Goblet Squat', 'Squat gobelet', 'compound', 'squat', ['quads', 'glutes'], ['core'], ['dumbbell'], 'weight_reps', false, 'moderate', 'moderate', ['quad_dominant'], 'double_progression', ['squat', 'legs']),
  ex('Dumbbell Squat', 'Squat haltères', 'compound', 'squat', ['quads', 'glutes'], ['hamstrings'], ['dumbbell'], 'weight_reps', false, 'moderate', 'moderate', ['quad_dominant'], 'double_progression', ['squat', 'legs']),
  ex('Leg Press', 'Presse à cuisse', 'machine', 'squat', ['quads', 'glutes'], ['hamstrings'], ['leg_press_machine'], 'weight_reps', false, 'moderate', 'stable', ['quad_dominant', 'stable_progression', 'long_femur_friendly'], 'double_progression', ['squat', 'legs', 'machine']),
  ex('Hack Squat', 'Hack squat machine', 'machine', 'squat', ['quads', 'glutes'], ['hamstrings'], ['hack_squat_machine'], 'weight_reps', false, 'moderate', 'stable', ['quad_dominant', 'stable_progression'], 'double_progression', ['squat', 'legs', 'machine']),
  ex('Smith Machine Squat', 'Squat Smith', 'machine', 'squat', ['quads', 'glutes'], ['hamstrings'], ['smith_machine'], 'weight_reps', false, 'high', 'stable', ['quad_dominant', 'stable_progression'], 'double_progression', ['squat', 'legs', 'machine']),
  ex('Box Squat', 'Squat sur box', 'compound', 'squat', ['quads', 'glutes', 'hamstrings'], ['lower_back'], ['barbell', 'rack', 'box'], 'weight_reps', false, 'high', 'moderate', ['quad_dominant'], 'strength_fixed', ['squat', 'legs']),
  ex('Pause Squat', 'Squat pausé', 'compound', 'squat', ['quads', 'glutes'], ['hamstrings', 'core'], ['barbell', 'rack'], 'weight_reps', false, 'high', 'variable', ['quad_dominant', 'axial_fatigue_high'], 'strength_fixed', ['squat', 'legs', 'strength']),
  ex('Bodyweight Squat', 'Squat poids de corps', 'bodyweight', 'squat', ['quads', 'glutes'], ['hamstrings'], [], 'bodyweight_reps', false, 'low', 'stable', ['quad_dominant', 'low_fatigue'], 'bodyweight_progression', ['squat', 'legs', 'bodyweight']),
  ex('Sissy Squat', 'Sissy squat', 'bodyweight', 'squat', ['quads'], ['core'], [], 'bodyweight_reps', false, 'low', 'moderate', ['quad_dominant', 'low_fatigue'], 'bodyweight_progression', ['squat', 'legs', 'bodyweight']),
  ex('Landmine Squat', 'Squat landmine', 'compound', 'squat', ['quads', 'glutes'], ['core'], ['barbell', 'landmine'], 'weight_reps', false, 'moderate', 'stable', ['quad_dominant', 'long_femur_friendly'], 'double_progression', ['squat', 'legs']),

  // ── UNILATERAL QUAD ────────────────────────────────────────────
  ex('Barbell Lunge', 'Fente barre', 'compound', 'unilateral_quad', ['quads', 'glutes'], ['hamstrings'], ['barbell'], 'weight_reps', true, 'high', 'variable', ['quad_dominant', 'axial_fatigue_high'], 'double_progression', ['lunge', 'legs', 'unilateral']),
  ex('Dumbbell Lunge', 'Fente haltères', 'compound', 'unilateral_quad', ['quads', 'glutes'], ['hamstrings'], ['dumbbell'], 'weight_reps', true, 'moderate', 'moderate', ['quad_dominant'], 'double_progression', ['lunge', 'legs', 'unilateral']),
  ex('Walking Lunge', 'Fente marchée', 'compound', 'unilateral_quad', ['quads', 'glutes'], ['hamstrings'], ['dumbbell'], 'weight_reps', true, 'moderate', 'variable', ['quad_dominant'], 'double_progression', ['lunge', 'legs', 'unilateral']),
  ex('Bulgarian Split Squat', 'Squat bulgare', 'compound', 'unilateral_quad', ['quads', 'glutes'], ['hamstrings'], ['dumbbell', 'bench'], 'weight_reps', true, 'moderate', 'variable', ['quad_dominant', 'long_femur_friendly'], 'double_progression', ['squat', 'legs', 'unilateral']),
  ex('Barbell Bulgarian Split Squat', 'Squat bulgare barre', 'compound', 'unilateral_quad', ['quads', 'glutes'], ['hamstrings'], ['barbell', 'bench'], 'weight_reps', true, 'high', 'variable', ['quad_dominant', 'axial_fatigue_high'], 'double_progression', ['squat', 'legs', 'unilateral']),
  ex('Reverse Lunge', 'Fente arrière', 'compound', 'unilateral_quad', ['quads', 'glutes'], ['hamstrings'], ['dumbbell'], 'weight_reps', true, 'moderate', 'moderate', ['quad_dominant'], 'double_progression', ['lunge', 'legs', 'unilateral']),
  ex('Step-Up', 'Montée de box', 'compound', 'unilateral_quad', ['quads', 'glutes'], ['hamstrings'], ['dumbbell', 'box'], 'weight_reps', true, 'moderate', 'moderate', ['quad_dominant'], 'double_progression', ['legs', 'unilateral']),
  ex('Leg Extension', 'Leg extension machine', 'machine', 'isolation_lower', ['quads'], [], ['leg_extension_machine'], 'weight_reps', false, 'low', 'stable', ['quad_dominant', 'stable_progression', 'low_fatigue'], 'accessory_linear', ['legs', 'isolation', 'machine']),
  ex('Single-Leg Leg Extension', 'Leg extension unilatéral', 'machine', 'isolation_lower', ['quads'], [], ['leg_extension_machine'], 'weight_reps', true, 'low', 'stable', ['quad_dominant', 'stable_progression', 'low_fatigue'], 'accessory_linear', ['legs', 'isolation', 'machine']),
  ex('Pistol Squat', 'Squat pistolet', 'bodyweight', 'unilateral_quad', ['quads', 'glutes'], ['hamstrings', 'core'], [], 'bodyweight_reps', true, 'moderate', 'variable', ['quad_dominant', 'long_femur_friendly'], 'bodyweight_progression', ['squat', 'legs', 'bodyweight', 'unilateral']),
  ex('Skater Squat', 'Squat patineur', 'bodyweight', 'unilateral_quad', ['quads', 'glutes'], ['hamstrings'], [], 'bodyweight_reps', true, 'moderate', 'variable', ['quad_dominant'], 'bodyweight_progression', ['squat', 'legs', 'bodyweight', 'unilateral']),
  ex('Cable Pull Lunge', 'Fente poulie', 'cable', 'unilateral_quad', ['quads', 'glutes'], ['hamstrings'], ['cable_machine'], 'weight_reps', true, 'moderate', 'moderate', ['quad_dominant'], 'double_progression', ['lunge', 'legs', 'cable']),

  // ── UNILATERAL HINGE ───────────────────────────────────────────
  ex('Single-Leg Glute Bridge', 'Pont fessier unijambiste', 'bodyweight', 'unilateral_hinge', ['glutes'], ['hamstrings'], [], 'bodyweight_reps', true, 'low', 'stable', ['low_fatigue'], 'bodyweight_progression', ['hinge', 'glutes', 'bodyweight']),
  ex('Single-Leg Hip Thrust', 'Hip thrust unijambiste', 'compound', 'unilateral_hinge', ['glutes'], ['hamstrings'], ['bench'], 'bodyweight_reps', true, 'moderate', 'moderate', [], 'bodyweight_progression', ['hinge', 'glutes', 'unilateral']),
  ex('Lying Leg Curl', 'Leg curl allongé machine', 'machine', 'isolation_lower', ['hamstrings'], ['glutes'], ['leg_curl_machine'], 'weight_reps', false, 'low', 'stable', ['stable_progression', 'low_fatigue'], 'accessory_linear', ['legs', 'hamstrings', 'machine']),
  ex('Seated Leg Curl', 'Leg curl assis machine', 'machine', 'isolation_lower', ['hamstrings'], ['glutes'], ['seated_leg_curl_machine'], 'weight_reps', false, 'low', 'stable', ['stable_progression', 'low_fatigue'], 'accessory_linear', ['legs', 'hamstrings', 'machine']),
  ex('Single-Leg Lying Leg Curl', 'Leg curl allongé unilatéral', 'machine', 'isolation_lower', ['hamstrings'], ['glutes'], ['leg_curl_machine'], 'weight_reps', true, 'low', 'stable', ['stable_progression', 'low_fatigue'], 'accessory_linear', ['legs', 'hamstrings', 'machine']),
  ex('Nordic Hamstring Curl', 'Curl ischio nordique', 'bodyweight', 'unilateral_hinge', ['hamstrings'], ['glutes'], [], 'bodyweight_reps', false, 'moderate', 'moderate', [], 'bodyweight_progression', ['hinge', 'hamstrings', 'bodyweight']),
  ex('Cable Kickback', 'Kickback poulie', 'cable', 'unilateral_hinge', ['glutes'], ['hamstrings'], ['cable_machine'], 'weight_reps', true, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['glutes', 'cable']),
  ex('Donkey Kickback', 'Kickback quadrupède', 'bodyweight', 'unilateral_hinge', ['glutes'], [], [], 'bodyweight_reps', true, 'low', 'stable', ['low_fatigue'], 'bodyweight_progression', ['glutes', 'bodyweight']),

  // ── ISOLATION UPPER ────────────────────────────────────────────
  ex('Barbell Curl', 'Curl barre', 'isolation', 'isolation_upper', ['biceps'], ['brachialis', 'brachioradialis'], ['barbell'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['biceps', 'isolation']),
  ex('Dumbbell Curl', 'Curl haltères', 'isolation', 'isolation_upper', ['biceps'], ['brachialis', 'brachioradialis'], ['dumbbell'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['biceps', 'isolation']),
  ex('Hammer Curl', 'Curl marteau', 'isolation', 'isolation_upper', ['brachialis', 'brachioradialis'], ['biceps'], ['dumbbell'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['biceps', 'isolation']),
  ex('Preacher Curl', 'Curl Larry Scott', 'isolation', 'isolation_upper', ['biceps'], ['brachialis'], ['barbell', 'preacher_bench'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['biceps', 'isolation']),
  ex('Concentration Curl', 'Curl concentration', 'isolation', 'isolation_upper', ['biceps'], [], ['dumbbell'], 'weight_reps', true, 'low', 'stable', ['low_fatigue'], 'accessory_linear', ['biceps', 'isolation']),
  ex('Cable Curl', 'Curl poulie', 'cable', 'isolation_upper', ['biceps'], ['brachialis'], ['cable_machine'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['biceps', 'cable', 'isolation']),
  ex('Incline Dumbbell Curl', 'Curl haltères incliné', 'isolation', 'isolation_upper', ['biceps'], ['brachialis'], ['dumbbell', 'incline_bench'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['biceps', 'isolation']),
  ex('Machine Curl', 'Curl machine', 'machine', 'isolation_upper', ['biceps'], ['brachialis'], ['bicep_curl_machine'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['biceps', 'machine']),
  ex('EZ Bar Curl', 'Curl barre EZ', 'isolation', 'isolation_upper', ['biceps'], ['brachialis', 'brachioradialis'], ['ez_bar'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression', 'shoulder_friendly'], 'accessory_linear', ['biceps', 'isolation']),
  ex('Tricep Pushdown', 'Pushdown triceps', 'cable', 'isolation_upper', ['triceps'], [], ['cable_machine', 'rope_attachment'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['triceps', 'cable', 'isolation']),
  ex('Overhead Tricep Extension', 'Extension triceps au-dessus tête', 'isolation', 'isolation_upper', ['triceps'], [], ['dumbbell'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['triceps', 'isolation']),
  ex('Cable Overhead Tricep Extension', 'Extension triceps poulie haute', 'cable', 'isolation_upper', ['triceps'], [], ['cable_machine', 'rope_attachment'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['triceps', 'cable', 'isolation']),
  ex('Skull Crusher', 'Barre au front', 'isolation', 'isolation_upper', ['triceps'], [], ['barbell', 'bench'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['triceps', 'isolation']),
  ex('Tricep Kickback', 'Extension triceps coude au corps', 'isolation', 'isolation_upper', ['triceps'], [], ['dumbbell'], 'weight_reps', true, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['triceps', 'isolation']),
  ex('Dip', 'Dips triceps', 'bodyweight', 'isolation_upper', ['triceps'], ['chest', 'front_deltoid'], ['dip_bars'], 'bodyweight_reps', false, 'moderate', 'moderate', ['chest_bias'], 'bodyweight_progression', ['triceps', 'bodyweight', 'push']),
  ex('Weighted Dip', 'Dips lestés', 'compound', 'isolation_upper', ['triceps'], ['chest', 'front_deltoid'], ['dip_bars', 'dip_belt'], 'weight_reps', false, 'moderate', 'moderate', ['chest_bias'], 'double_progression', ['triceps', 'strength']),
  ex('Machine Tricep Extension', 'Extension triceps machine', 'machine', 'isolation_upper', ['triceps'], [], ['tricep_machine'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['triceps', 'machine']),
  ex('Close-Grip Bench Press', 'Développé prise serrée', 'compound', 'isolation_upper', ['triceps'], ['chest', 'front_deltoid'], ['barbell', 'bench'], 'weight_reps', false, 'moderate', 'stable', ['stable_progression'], 'double_progression', ['triceps', 'push']),
  ex('Diamond Push-Up', 'Pompe diamant', 'bodyweight', 'isolation_upper', ['triceps'], ['chest'], [], 'bodyweight_reps', false, 'low', 'moderate', ['low_fatigue'], 'bodyweight_progression', ['triceps', 'bodyweight']),
  ex('Shrug', 'Haussement d\'épaules', 'isolation', 'isolation_upper', ['traps'], ['rhomboids'], ['barbell'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['traps', 'isolation']),
  ex('Dumbbell Shrug', 'Haussement d\'épaules haltères', 'isolation', 'isolation_upper', ['traps'], ['rhomboids'], ['dumbbell'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['traps', 'isolation']),
  ex('Cable Shrug', 'Haussement d\'épaules poulie', 'cable', 'isolation_upper', ['traps'], ['rhomboids'], ['cable_machine'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['traps', 'cable']),
  ex('Upright Row', 'Rowing vertical', 'compound', 'isolation_upper', ['traps', 'lateral_deltoid'], ['biceps'], ['barbell'], 'weight_reps', false, 'low', 'stable', ['stable_progression'], 'accessory_linear', ['traps', 'shoulder']),
  ex('Wrist Curl', 'Curl poignets', 'isolation', 'isolation_upper', ['forearms'], [], ['barbell'], 'weight_reps', false, 'low', 'stable', ['low_fatigue'], 'accessory_linear', ['forearms', 'isolation']),
  ex('Reverse Wrist Curl', 'Curl poignets inversé', 'isolation', 'isolation_upper', ['forearms'], [], ['barbell'], 'weight_reps', false, 'low', 'stable', ['low_fatigue'], 'accessory_linear', ['forearms', 'isolation']),
  ex('Zottman Curl', 'Curl Zottman', 'isolation', 'isolation_upper', ['biceps', 'brachioradialis'], ['brachialis'], ['dumbbell'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['biceps', 'forearms', 'isolation']),
  ex('Spider Curl', 'Curl araignée', 'isolation', 'isolation_upper', ['biceps'], [], ['barbell', 'incline_bench'], 'weight_reps', false, 'low', 'stable', ['low_fatigue'], 'accessory_linear', ['biceps', 'isolation']),
  ex('Cable Face Pull', 'Tirage face poulie corde', 'cable', 'isolation_upper', ['rear_deltoid', 'rhomboids', 'rotator_cuff'], [], ['cable_machine', 'rope_attachment'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'shoulder_friendly'], 'accessory_linear', ['shoulder', 'cable']),
  ex('Reverse Fly Machine', 'Écarté arrière machine', 'machine', 'isolation_upper', ['rear_deltoid', 'rhomboids'], [], ['reverse_fly_machine'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['shoulder', 'machine']),

  // ── ISOLATION LOWER ────────────────────────────────────────────
  ex('Standing Calf Raise', 'Mollet debout machine', 'machine', 'isolation_lower', ['gastrocnemius'], ['soleus'], ['calf_raise_machine'], 'weight_reps', false, 'low', 'stable', ['stable_progression', 'low_fatigue'], 'accessory_linear', ['calves', 'machine']),
  ex('Seated Calf Raise', 'Mollet assis machine', 'machine', 'isolation_lower', ['soleus'], ['gastrocnemius'], ['seated_calf_machine'], 'weight_reps', false, 'low', 'stable', ['stable_progression', 'low_fatigue'], 'accessory_linear', ['calves', 'machine']),
  ex('Dumbbell Calf Raise', 'Mollet haltères debout', 'isolation', 'isolation_lower', ['gastrocnemius'], ['soleus'], ['dumbbell'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['calves', 'isolation']),
  ex('Single-Leg Calf Raise', 'Mollet unijambiste', 'bodyweight', 'isolation_lower', ['gastrocnemius'], ['soleus'], [], 'bodyweight_reps', true, 'low', 'stable', ['low_fatigue'], 'bodyweight_progression', ['calves', 'bodyweight']),
  ex('Hip Abduction Machine', 'Abduction hanche machine', 'machine', 'isolation_lower', ['abductors', 'glute_medius'], [], ['hip_abduction_machine'], 'weight_reps', false, 'low', 'stable', ['stable_progression', 'low_fatigue'], 'accessory_linear', ['glutes', 'machine']),
  ex('Hip Adduction Machine', 'Adduction hanche machine', 'machine', 'isolation_lower', ['adductors'], [], ['hip_adduction_machine'], 'weight_reps', false, 'low', 'stable', ['stable_progression', 'low_fatigue'], 'accessory_linear', ['legs', 'machine']),
  ex('Cable Hip Abduction', 'Abduction hanche poulie', 'cable', 'isolation_lower', ['abductors', 'glute_medius'], [], ['cable_machine'], 'weight_reps', true, 'low', 'stable', ['low_fatigue'], 'accessory_linear', ['glutes', 'cable']),
  ex('Cable Hip Adduction', 'Adduction hanche poulie', 'cable', 'isolation_lower', ['adductors'], [], ['cable_machine'], 'weight_reps', true, 'low', 'stable', ['low_fatigue'], 'accessory_linear', ['legs', 'cable']),
  ex('Tibialis Raise', 'Relevé tibial', 'isolation', 'isolation_lower', ['tibialis_anterior'], [], [], 'bodyweight_reps', false, 'low', 'stable', ['low_fatigue'], 'bodyweight_progression', ['legs', 'isolation']),

  // ── CORE ───────────────────────────────────────────────────────
  ex('Plank', 'Gainage planche', 'bodyweight', 'core', ['core', 'transverse_abdominis'], ['shoulders'], [], 'duration', false, 'low', 'stable', ['low_fatigue'], 'duration_progression', ['core', 'bodyweight']),
  ex('Side Plank', 'Gainage latéral', 'bodyweight', 'core', ['obliques', 'core'], [], [], 'duration', true, 'low', 'stable', ['low_fatigue'], 'duration_progression', ['core', 'bodyweight']),
  ex('Hollow Body Hold', 'Gainage creux', 'bodyweight', 'core', ['core', 'hip_flexors'], [], [], 'duration', false, 'low', 'stable', ['low_fatigue'], 'duration_progression', ['core', 'bodyweight']),
  ex('Ab Wheel Rollout', 'Roue abdominale', 'bodyweight', 'core', ['core', 'lats'], ['shoulders'], ['ab_wheel'], 'bodyweight_reps', false, 'moderate', 'moderate', [], 'bodyweight_progression', ['core', 'bodyweight']),
  ex('Cable Crunch', 'Crunch poulie', 'cable', 'core', ['rectus_abdominis'], [], ['cable_machine', 'rope_attachment'], 'weight_reps', false, 'low', 'stable', ['stable_progression', 'low_fatigue'], 'accessory_linear', ['core', 'cable']),
  ex('Hanging Leg Raise', 'Relevé de jambes suspendu', 'bodyweight', 'core', ['rectus_abdominis', 'hip_flexors'], [], ['pull_up_bar'], 'bodyweight_reps', false, 'low', 'moderate', ['low_fatigue'], 'bodyweight_progression', ['core', 'bodyweight']),
  ex('Crunch', 'Crunch', 'bodyweight', 'core', ['rectus_abdominis'], [], [], 'bodyweight_reps', false, 'low', 'stable', ['low_fatigue'], 'bodyweight_progression', ['core', 'bodyweight']),
  ex('Decline Crunch', 'Crunch décliné', 'bodyweight', 'core', ['rectus_abdominis'], [], ['decline_bench'], 'bodyweight_reps', false, 'low', 'moderate', ['low_fatigue'], 'bodyweight_progression', ['core', 'bodyweight']),
  ex('Russian Twist', 'Rotation russe', 'bodyweight', 'core', ['obliques'], ['core'], [], 'bodyweight_reps', false, 'low', 'moderate', ['low_fatigue'], 'bodyweight_progression', ['core', 'bodyweight']),
  ex('Dead Bug', 'Dead bug', 'bodyweight', 'core', ['core', 'transverse_abdominis'], ['hip_flexors'], [], 'bodyweight_reps', false, 'low', 'stable', ['low_fatigue'], 'bodyweight_progression', ['core', 'bodyweight']),
  ex('Pallof Press', 'Pallof press poulie', 'cable', 'core', ['obliques', 'core'], [], ['cable_machine'], 'weight_reps', false, 'low', 'stable', ['low_fatigue', 'stable_progression'], 'accessory_linear', ['core', 'cable']),
  ex('Landmine Rotation', 'Rotation landmine', 'compound', 'core', ['obliques', 'core'], ['shoulders'], ['barbell', 'landmine'], 'weight_reps', false, 'low', 'moderate', ['low_fatigue'], 'accessory_linear', ['core']),
  ex('Dragon Flag', 'Dragon flag', 'bodyweight', 'core', ['core', 'rectus_abdominis'], ['lats'], ['bench'], 'bodyweight_reps', false, 'moderate', 'moderate', [], 'bodyweight_progression', ['core', 'bodyweight']),
  ex('L-Sit', 'L-sit', 'bodyweight', 'core', ['core', 'hip_flexors'], ['triceps'], [], 'duration', false, 'moderate', 'variable', [], 'duration_progression', ['core', 'bodyweight']),
  ex('Copenhagen Plank', 'Planche de Copenhague', 'bodyweight', 'core', ['adductors', 'obliques'], ['core'], [], 'duration', true, 'low', 'moderate', ['low_fatigue'], 'duration_progression', ['core', 'bodyweight']),

  // ── CARRY ──────────────────────────────────────────────────────
  ex('Farmer Walk', 'Marche du fermier', 'compound', 'carry', ['traps', 'core', 'forearms'], ['shoulders', 'glutes'], ['dumbbell'], 'distance_duration', false, 'moderate', 'variable', [], 'distance_duration', ['carry', 'strength']),
  ex('Suitcase Carry', 'Marche valise', 'compound', 'carry', ['obliques', 'core', 'traps'], ['forearms'], ['dumbbell'], 'distance_duration', true, 'moderate', 'variable', [], 'distance_duration', ['carry', 'core']),
  ex('Overhead Carry', 'Marche overhead', 'compound', 'carry', ['shoulders', 'core', 'traps'], ['triceps'], ['dumbbell'], 'distance_duration', false, 'moderate', 'variable', [], 'distance_duration', ['carry', 'shoulder']),
  ex('Trap Bar Farmer Walk', 'Marche du fermier hexagonal', 'compound', 'carry', ['traps', 'core', 'forearms'], ['glutes', 'hamstrings'], ['trap_bar'], 'distance_duration', false, 'moderate', 'variable', [], 'distance_duration', ['carry', 'strength']),
  ex('Yoke Walk', 'Marche au joug', 'compound', 'carry', ['traps', 'core', 'quads'], ['glutes'], ['yoke'], 'distance_duration', false, 'high', 'variable', ['axial_fatigue_high'], 'distance_duration', ['carry', 'strength']),
];

const exercises: Exercise[] = definitions.map((def) => ({
  ...def,
  id: uuidv4(),
  alternatives: [],
  is_custom: false,
  created_by: null,
  created_at: now,
}));

// Verify uniqueness
const names = exercises.map((e) => e.name);
const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
if (duplicates.length > 0) {
  console.error('DUPLICATE NAMES:', duplicates);
  process.exit(1);
}

console.log(`Generated ${exercises.length} exercises`);

const outputPath = join(__dirname, '../data/exercises.json');
writeFileSync(outputPath, JSON.stringify(exercises, null, 2));
console.log(`Written to ${outputPath}`);
