import { Card } from './card';
import { AppText } from './text';

type Props = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: Props) {
  return (
    <Card elevation="default" className="items-center gap-2">
      <AppText variant="body" muted={false}>{title}</AppText>
      <AppText variant="caption" muted className="text-center">
        {description}
      </AppText>
    </Card>
  );
}
