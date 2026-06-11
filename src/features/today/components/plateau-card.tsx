import { TrendingDown } from 'lucide-react-native';
import { AlertBanner } from '@/components/ui';

type Props = {
  count: number;
};

export function PlateauCard({ count }: Props) {
  return (
    <AlertBanner
      tone="warning"
      icon={TrendingDown}
      title="Plateau détecté"
      message={
        count === 1
          ? '1 exercice en plateau — variation recommandée'
          : `${count} exercices en plateau — variations recommandées`
      }
    />
  );
}
