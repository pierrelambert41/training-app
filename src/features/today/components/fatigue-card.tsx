import { View } from 'react-native';
import { Card, AppText } from '@/components/ui';

type Props = {
  fatigueScore: number;
};

function fatigueLabel(score: number): string {
  if (score >= 9) return 'Fatigue critique';
  if (score >= 7) return 'Fatigue elevee';
  return 'Fatigue moderee';
}

export function FatigueCard({ fatigueScore }: Props) {
  return (
    <Card elevation="default" className="flex-row items-center gap-3 py-3">
      <AppText variant="heading" className="text-status-warning">
        {fatigueScore}/10
      </AppText>
      <View className="flex-1">
        <AppText variant="body" className="font-semibold text-status-warning">
          {fatigueLabel(fatigueScore)}
        </AppText>
        <AppText variant="caption" muted>
          Charge adaptee en consequence
        </AppText>
      </View>
    </Card>
  );
}
