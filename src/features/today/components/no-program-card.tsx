import { View } from 'react-native';
import { Sparkles, Wand2 } from 'lucide-react-native';
import { Card, AppText, Button } from '@/components/ui';
import { colors } from '@/theme/tokens';

type Props = {
  onGenerate: () => void;
};

export function NoProgramCard({ onGenerate }: Props) {
  return (
    <Card elevation="default" className="items-center gap-3 py-8">
      <View className="w-14 h-14 rounded-full bg-accent/12 items-center justify-center">
        <Wand2 size={26} color={colors.accent} strokeWidth={1.8} />
      </View>
      <AppText variant="heading">Aucun programme actif</AppText>
      <AppText variant="body" muted className="text-center px-4">
        Génère ton programme personnalisé pour commencer à t'entraîner.
      </AppText>
      <View className="w-full mt-1">
        <Button
          label="Créer un programme"
          icon={Sparkles}
          onPress={onGenerate}
          variant="primary"
          size="lg"
          testID="generate-program-button"
        />
      </View>
    </Card>
  );
}
