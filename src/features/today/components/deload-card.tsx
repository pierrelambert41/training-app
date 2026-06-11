import { BatteryLow } from 'lucide-react-native';
import { AlertBanner } from '@/components/ui';

type Props = {
  message: string;
};

export function DeloadCard({ message }: Props) {
  return (
    <AlertBanner
      tone="danger"
      icon={BatteryLow}
      title="Semaine de deload"
      message={message}
    />
  );
}
