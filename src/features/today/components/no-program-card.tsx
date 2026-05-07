import { Card, AppText, Button } from '@/components/ui';

type Props = {
  onGenerate: () => void;
};

export function NoProgramCard({ onGenerate }: Props) {
  return (
    <Card elevation="default" className="items-center gap-3 py-6">
      <AppText variant="heading">Aucun programme actif</AppText>
      <AppText variant="body" muted className="text-center">
        Genere ton programme personnalise pour commencer a t'entrainer.
      </AppText>
      <Button
        label="Creer un programme"
        onPress={onGenerate}
        variant="primary"
        size="lg"
        testID="generate-program-button"
      />
    </Card>
  );
}
