/**
 * Tests TA-147 — Prompts de génération (generateProgram + regenerateBlock).
 *
 * Vérifie :
 * - structure non-vide, catalogue en première position du system avec cache_control: ephemeral
 * - les 6 progressionType ADR-006 présents dans les instructions
 * - le catalogue injecté (ids) est bien celui passé en paramètre (pré-filtré)
 * - le schéma JSON intermédiaire documenté dans les instructions
 * - les contraintes utilisateur injectées (blessures, durée, sports parallèles)
 * - regenerateBlock : exercices du bloc précédent + progression réelle + instruction 60-80%
 */

import type { Block, Exercise, ProgramQuestionnaire } from '@/types';
import type { AIContextProfile } from '../../types/ai-context';
import type {
  BlockRegenerationContext,
  ProgramGenerationContext,
} from '../../types/ai-generation';
import type { TextContentBlock } from '../../types/claude-messages';
import { buildGenerateProgramPrompt } from './generate-program-prompt';
import { buildRegenerateBlockPrompt } from './regenerate-block-prompt';

const ALLOWED = [
  'strength_fixed',
  'double_progression',
  'accessory_linear',
  'bodyweight_progression',
  'duration_progression',
  'distance_duration',
];

function makeExercise(id: string, name: string): Exercise {
  return {
    id,
    name,
    nameFr: name,
    category: 'compound',
    movementPattern: 'horizontal_push',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: ['barbell'],
    logType: 'weight_reps',
    isUnilateral: false,
    systemicFatigue: 'moderate',
    movementStability: 'stable',
    morphoTags: [],
    recommendedProgressionType: 'double_progression',
    alternatives: [],
    coachingNotes: null,
    tags: [],
    isCustom: false,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

const catalogue = [makeExercise('bench_press', 'Développé couché'), makeExercise('squat', 'Squat')];

const profile: AIContextProfile = {
  version: 1,
  user: {
    level: 'intermediate',
    goals: { primary: 'hypertrophy' },
    training_frequency: 4,
    preferred_unit: 'kg',
  },
  morphology: { strong_points: [], weak_points: [], injury_history: ['épaule droite'] },
  exercise_preferences: { preferred: [], avoided: [], constraints: [] },
  performance_baselines: {},
  recent_highlights: [],
  coaching_style: 'direct',
  parallel_sports: ['course à pied'],
};

const questionnaire: ProgramQuestionnaire = {
  goal: 'hypertrophy',
  frequencyDays: 4,
  preferredDays: null,
  level: 'intermediate',
  equipment: 'full_gym',
  injuries: 'genou gauche fragile',
  avoidExercises: '',
  priorityMuscles: ['Pectoraux'],
  sportsParallel: 'escalade',
  maxSessionDurationMin: 60,
  mixedPriority: null,
  volumeTolerance: 'medium',
  importHistory: false,
  weightKg: '80',
  heightCm: '180',
};

function systemBlocks(system: unknown): TextContentBlock[] {
  expect(Array.isArray(system)).toBe(true);
  return system as TextContentBlock[];
}

function fullText(blocks: TextContentBlock[]): string {
  return blocks.map((b) => b.text).join('\n');
}

describe('buildGenerateProgramPrompt', () => {
  const context: ProgramGenerationContext = { profile, questionnaire };

  it('catalogue en première position du system avec cache_control: ephemeral', () => {
    const { system } = buildGenerateProgramPrompt(context, catalogue);
    const blocks = systemBlocks(system);

    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(blocks[0].text).toContain('CATALOGUE');
    expect(blocks[0].text).toContain('bench_press');
    expect(blocks[0].text).toContain('squat');
  });

  it('injecte les 6 progressionType ADR-006 dans les instructions', () => {
    const { system } = buildGenerateProgramPrompt(context, catalogue);
    const text = fullText(systemBlocks(system));

    for (const progression of ALLOWED) {
      expect(text).toContain(progression);
    }
  });

  it('documente le schéma JSON intermédiaire de sortie', () => {
    const { system } = buildGenerateProgramPrompt(context, catalogue);
    const text = fullText(systemBlocks(system));

    expect(text).toContain('"split"');
    expect(text).toContain('"exercise_id"');
    expect(text).toContain('"start_weight_kg"');
    expect(text).toContain('reasoning');
  });

  it('injecte les contraintes utilisateur et les splits valides pour la fréquence', () => {
    const { system, messages } = buildGenerateProgramPrompt(context, catalogue);
    const text = fullText(systemBlocks(system));

    expect(text).toContain('genou gauche fragile');
    expect(text).toContain('escalade');
    expect(text).toContain('60 min');
    expect(text).toContain('upper_lower');
    expect(text).toContain('MV/MEV/MAV/MRV');
    // le volume est la règle de dimensionnement principale, pas le temps —
    // et uniquement des repères sourcés (pas de tranches inventées)
    expect(text).toContain('séries dures par groupe musculaire et par semaine');
    expect(text).toContain('Schoenfeld, Ogborn & Krieger 2017');
    expect(text).toContain('Baz-Valle et al. 2022');
    expect(text).toContain('Muscles prioritaires');
    expect(text).toContain('Pectoraux');
    expect(text).toContain('plafond IMPÉRATIF');
    expect(text).toContain('maximum 17 séries par séance'); // (60-8)/3
    expect(text).toContain('Baz-Valle et al. 2022, le volume du triceps'); // comptage tel que publié
    expect(text).toContain('Gentil et al. 2015');
    expect(text).not.toMatch(/8-12|10-16|14-20/); // pas de coupures par niveau inventées

    const userText = messages[0].content.map((c) => c.text).join('\n');
    expect(userText).toContain('hypertrophy');
    expect(userText).toContain('Pectoraux');
  });

  it('fréquence null → défaut 3 jours (splits full body)', () => {
    const { system } = buildGenerateProgramPrompt(
      { profile, questionnaire: { ...questionnaire, frequencyDays: null } },
      catalogue
    );
    expect(fullText(systemBlocks(system))).toContain('full_body_ab');
  });
});

describe('buildRegenerateBlockPrompt', () => {
  const previousBlock: Block = {
    id: 'block-1',
    programId: 'program-1',
    title: 'Bloc Hypertrophie 1',
    goal: 'hypertrophy',
    durationWeeks: 6,
    weekNumber: 6,
    startDate: '2026-04-01',
    endDate: '2026-05-12',
    status: 'completed',
    deloadStrategy: 'scheduled',
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-05-12T00:00:00Z',
  };

  const context: BlockRegenerationContext = {
    profile,
    previousBlock,
    previousBlockStats: {
      complianceRate: 0.85,
      daysPerWeek: 4,
      exerciseProgress: [
        { exerciseId: 'bench_press', exerciseName: 'Développé couché', e1rmTrend: 'up', complianceRate: 0.9 },
        { exerciseId: 'squat', exerciseName: 'Squat', e1rmTrend: 'plateau', complianceRate: 0.8 },
      ],
      avgFatigueScore: 5.2,
      prs: ['Bench 100kg x 1'],
    },
    reason: 'end_of_block',
  };

  it('catalogue en première position avec cache_control: ephemeral', () => {
    const { system } = buildRegenerateBlockPrompt(context, catalogue);
    const blocks = systemBlocks(system);
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(blocks[0].text).toContain('CATALOGUE');
  });

  it('inclut les exercices du bloc précédent avec leur progression réelle', () => {
    const { messages } = buildRegenerateBlockPrompt(context, catalogue);
    const userText = messages[0].content.map((c) => c.text).join('\n');

    expect(userText).toContain('bench_press');
    expect(userText).toContain('"e1rm_trend":"up"');
    expect(userText).toContain('"e1rm_trend":"plateau"');
    expect(userText).toContain('Bench 100kg x 1');
    expect(userText).toContain('fin de bloc planifiée');
  });

  it('instruction de continuité 60-80% présente', () => {
    const { system } = buildRegenerateBlockPrompt(context, catalogue);
    const text = fullText(systemBlocks(system));
    expect(text).toContain('60 à 80%');
    expect(text).toContain('CONTINUITÉ INTER-BLOCS');
  });

  it('même cadre dur que generateProgram (progressions + schéma)', () => {
    const { system } = buildRegenerateBlockPrompt(context, catalogue);
    const text = fullText(systemBlocks(system));
    for (const progression of ALLOWED) {
      expect(text).toContain(progression);
    }
    expect(text).toContain('"exercise_id"');
    // blessures du profil injectées
    expect(text).toContain('épaule droite');
  });
});
