import { Card, AppText } from '@/components/ui';

type Props = {
  message: string;
};

export function DeloadCard({ message }: Props) {
  return (
    <Card elevation="elevated" className="border border-status-danger gap-2 py-4">
      <AppText variant="heading" className="text-status-danger">
        Semaine de deload
      </AppText>
      <AppText variant="body" muted numberOfLines={2}>
        {message}
      </AppText>
    </Card>
  );
}
