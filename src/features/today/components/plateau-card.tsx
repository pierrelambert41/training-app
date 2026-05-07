import { Card, AppText } from '@/components/ui';

type Props = {
  count: number;
};

export function PlateauCard({ count }: Props) {
  return (
    <Card elevation="default" className="flex-row items-center gap-3 py-3">
      <AppText variant="body" className="text-xl">!</AppText>
      <AppText variant="body" className="flex-1">
        {count === 1
          ? '1 exercice en plateau — variation recommandee'
          : `${count} exercices en plateau — variations recommandees`}
      </AppText>
    </Card>
  );
}
