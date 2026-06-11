import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

type Tone = 'default' | 'danger';

type ListRowProps = {
  icon: LucideIcon;
  label: string;
  detail?: string;
  tone?: Tone;
  chevron?: boolean;
  onPress?: () => void;
  testID?: string;
};

/**
 * Rangée de liste groupée (style réglages iOS) : icône dans une pastille,
 * label, détail optionnel à droite, chevron si navigable.
 * À utiliser dans un ListGroup.
 */
export function ListRow({
  icon: Icon,
  label,
  detail,
  tone = 'default',
  chevron = false,
  onPress,
  testID,
}: ListRowProps) {
  const iconColor = tone === 'danger' ? colors.statusDanger : colors.contentSecondary;
  const bubbleClass = tone === 'danger' ? 'bg-status-danger/15' : 'bg-background-elevated';
  const labelClass = tone === 'danger' ? 'text-status-danger' : 'text-content-primary';

  const content = (
    <>
      <View className={`w-8 h-8 rounded-lg items-center justify-center ${bubbleClass}`}>
        <Icon size={17} color={iconColor} strokeWidth={2.2} />
      </View>
      <Text className={`text-body font-medium flex-1 ${labelClass}`} numberOfLines={1}>
        {label}
      </Text>
      {detail ? (
        <Text className="text-label text-content-muted" numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
      {chevron ? <ChevronRight size={17} color={colors.contentMuted} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View className="flex-row items-center gap-3 px-4 h-14" testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 h-14 active:bg-background-elevated"
      accessibilityRole="button"
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

type ListGroupProps = {
  children: React.ReactNode;
  testID?: string;
};

/** Conteneur de ListRow : carte arrondie, séparateurs gérés par espacement. */
export function ListGroup({ children, testID }: ListGroupProps) {
  return (
    <View
      className="bg-background-surface rounded-card overflow-hidden"
      style={{ borderCurve: 'continuous' }}
      testID={testID}
    >
      {children}
    </View>
  );
}
