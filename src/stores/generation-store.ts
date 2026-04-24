import { create } from 'zustand';
import type { GenerationAnswers, GenerationResult } from '@/types/generation';

interface GenerationState {
  answers: GenerationAnswers;
  result: GenerationResult | null;
  setGoal: (goal: GenerationAnswers['goal']) => void;
  setFrequency: (days: GenerationAnswers['frequencyDays']) => void;
  setLevel: (level: GenerationAnswers['level']) => void;
  setEquipment: (equipment: GenerationAnswers['equipment']) => void;
  setInjuries: (injuries: string) => void;
  setAvoidExercises: (exercises: string) => void;
  setPriorityMuscles: (muscles: string[]) => void;
  setSportsParallel: (sports: string) => void;
  setMaxSessionDuration: (duration: GenerationAnswers['maxSessionDurationMin']) => void;
  setMixedPriority: (priority: GenerationAnswers['mixedPriority']) => void;
  setVolumeTolerance: (tolerance: GenerationAnswers['volumeTolerance']) => void;
  setImportHistory: (value: boolean) => void;
  setWeightKg: (weight: string) => void;
  setHeightCm: (height: string) => void;
  setReadinessAvg: (readiness: GenerationAnswers['readinessAvg']) => void;
  setAttendancePercent: (pct: GenerationAnswers['attendancePercent']) => void;
  setResult: (result: GenerationResult | null) => void;
  reset: () => void;
}

const defaultAnswers: GenerationAnswers = {
  goal: null,
  frequencyDays: null,
  level: null,
  equipment: null,
  injuries: '',
  avoidExercises: '',
  priorityMuscles: [],
  sportsParallel: '',
  maxSessionDurationMin: null,
  mixedPriority: null,
  volumeTolerance: null,
  importHistory: false,
  weightKg: '',
  heightCm: '',
  readinessAvg: null,
  attendancePercent: null,
};

export const useGenerationStore = create<GenerationState>((set) => ({
  answers: { ...defaultAnswers },
  result: null,
  setGoal: (goal) => set((s) => ({ answers: { ...s.answers, goal } })),
  setFrequency: (frequencyDays) => set((s) => ({ answers: { ...s.answers, frequencyDays } })),
  setLevel: (level) => set((s) => ({ answers: { ...s.answers, level } })),
  setEquipment: (equipment) => set((s) => ({ answers: { ...s.answers, equipment } })),
  setInjuries: (injuries) => set((s) => ({ answers: { ...s.answers, injuries } })),
  setAvoidExercises: (avoidExercises) => set((s) => ({ answers: { ...s.answers, avoidExercises } })),
  setPriorityMuscles: (priorityMuscles) => set((s) => ({ answers: { ...s.answers, priorityMuscles } })),
  setSportsParallel: (sportsParallel) => set((s) => ({ answers: { ...s.answers, sportsParallel } })),
  setMaxSessionDuration: (maxSessionDurationMin) => set((s) => ({ answers: { ...s.answers, maxSessionDurationMin } })),
  setMixedPriority: (mixedPriority) => set((s) => ({ answers: { ...s.answers, mixedPriority } })),
  setVolumeTolerance: (volumeTolerance) => set((s) => ({ answers: { ...s.answers, volumeTolerance } })),
  setImportHistory: (importHistory) => set((s) => ({ answers: { ...s.answers, importHistory } })),
  setWeightKg: (weightKg) => set((s) => ({ answers: { ...s.answers, weightKg } })),
  setHeightCm: (heightCm) => set((s) => ({ answers: { ...s.answers, heightCm } })),
  setReadinessAvg: (readinessAvg) => set((s) => ({ answers: { ...s.answers, readinessAvg } })),
  setAttendancePercent: (attendancePercent) => set((s) => ({ answers: { ...s.answers, attendancePercent } })),
  setResult: (result) => set({ result }),
  reset: () => set({ answers: { ...defaultAnswers }, result: null }),
}));
