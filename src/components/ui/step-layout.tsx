import { ScrollView, View } from 'react-native';
import { GENERATION_STEP_COUNT } from '@/types/generation';
import { AppText } from './text';
import { Button } from './button';

type Props = {
  step: number;
  title: string;
  subtitle?: string;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: React.ReactNode;
};

export function StepLayout({
  step,
  title,
  subtitle,
  onNext,
  onBack,
  nextLabel = 'Suivant',
  nextDisabled = false,
  children,
}: Props) {
  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-2 gap-3">
        <View className="flex-row items-center gap-2">
          <AppText variant="caption" muted>
            Étape {step}/{GENERATION_STEP_COUNT}
          </AppText>
        </View>
        <View className="h-1 bg-background-surface rounded-chip overflow-hidden">
          <View
            className="h-full bg-accent rounded-chip"
            style={{ width: `${(step / GENERATION_STEP_COUNT) * 100}%` }}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 pb-8 gap-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1">
          <AppText className="text-display text-content-primary font-bold">{title}</AppText>
          {subtitle ? (
            <AppText variant="body" className="text-content-secondary">{subtitle}</AppText>
          ) : null}
        </View>

        {children}
      </ScrollView>

      <View className="px-4 pb-8 pt-3 gap-3 border-t border-border">
        <Button
          label={nextLabel}
          onPress={onNext}
          disabled={nextDisabled}
          size="lg"
        />
        {onBack ? (
          <Button
            label="Retour"
            onPress={onBack}
            variant="ghost"
          />
        ) : null}
      </View>
    </View>
  );
}
