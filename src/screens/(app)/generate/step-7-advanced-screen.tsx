import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useGenerationStore } from '@/stores/generation-store';
import { AppText, CardChoice, Input, StepLayout } from '@/components/ui';
import type { GenerationAnswers } from '@/types/generation';

const READINESS_VALUES = [1, 2, 3, 4, 5] as const;

const ATTENDANCE_OPTIONS: {
  value: NonNullable<GenerationAnswers['attendancePercent']>;
  label: string;
  description: string;
}[] = [
  { value: 60, label: '60 %', description: '~3 séances sur 5 réalisées' },
  { value: 70, label: '70 %', description: '~3-4 séances sur 5 réalisées' },
  { value: 80, label: '80 %', description: '~4 séances sur 5 réalisées' },
  { value: 90, label: '90 %', description: 'Très régulier, rares absences' },
  { value: 100, label: '100 %', description: 'Assiduité parfaite' },
];

export default function Step7AdvancedScreen() {
  const router = useRouter();
  const answers = useGenerationStore((s) => s.answers);
  const setImportHistory = useGenerationStore((s) => s.setImportHistory);
  const setWeightKg = useGenerationStore((s) => s.setWeightKg);
  const setHeightCm = useGenerationStore((s) => s.setHeightCm);
  const setReadinessAvg = useGenerationStore((s) => s.setReadinessAvg);
  const setAttendancePercent = useGenerationStore((s) => s.setAttendancePercent);

  function handleNext() {
    router.push('/(app)/programs/generate/step-8-summary');
  }

  function handleBack() {
    router.back();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StepLayout
        step={7}
        title="Données avancées"
        subtitle="Toutes ces informations sont optionnelles. Elles affinent la calibration initiale."
        onNext={handleNext}
        onBack={handleBack}
        nextLabel="Suivant"
      >
        <View className="gap-6">
          <View className="gap-3">
            <AppText variant="caption" className="text-content-secondary uppercase tracking-wider">
              Importer mon historique d'entraînement
            </AppText>
            <CardChoice
              label="Utiliser mon historique"
              description="Le moteur calibre les charges de départ sur tes performances récentes"
              selected={answers.importHistory}
              onPress={() => setImportHistory(!answers.importHistory)}
              testID="import-history-toggle"
            />
          </View>

          <View className="gap-3">
            <AppText variant="caption" className="text-content-secondary uppercase tracking-wider">
              Mensurations
            </AppText>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Poids (kg)"
                  placeholder="Ex : 80"
                  value={answers.weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="decimal-pad"
                  testID="advanced-weight-input"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Taille (cm)"
                  placeholder="Ex : 178"
                  value={answers.heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="decimal-pad"
                  testID="advanced-height-input"
                />
              </View>
            </View>
          </View>

          <View className="gap-3">
            <AppText variant="caption" className="text-content-secondary uppercase tracking-wider">
              Readiness moyen récent (1–5)
            </AppText>
            <AppText variant="caption" muted>
              Comment te sens-tu généralement avant tes séances ?
            </AppText>
            <View className="flex-row gap-2">
              {READINESS_VALUES.map((val) => (
                <View key={val} className="flex-1">
                  <CardChoice
                    label={String(val)}
                    selected={answers.readinessAvg === val}
                    onPress={() => setReadinessAvg(val)}
                    testID={`readiness-option-${val}`}
                  />
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <AppText variant="caption" className="text-content-secondary uppercase tracking-wider">
              Assiduité récente
            </AppText>
            <View className="gap-2">
              {ATTENDANCE_OPTIONS.map((opt) => (
                <CardChoice
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={answers.attendancePercent === opt.value}
                  onPress={() => setAttendancePercent(opt.value)}
                  testID={`attendance-option-${opt.value}`}
                />
              ))}
            </View>
          </View>
        </View>
      </StepLayout>
    </KeyboardAvoidingView>
  );
}
