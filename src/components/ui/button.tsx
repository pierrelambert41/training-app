import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
};

const variantClasses: Record<Variant, { container: string; text: string; icon: string }> = {
  primary: {
    container: 'bg-accent',
    text: 'text-content-on-accent font-bold',
    icon: colors.contentOnAccent,
  },
  secondary: {
    container: 'bg-background-elevated',
    text: 'text-content-primary font-semibold',
    icon: colors.contentPrimary,
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-accent font-medium',
    icon: colors.accent,
  },
};

const sizeClasses: Record<Size, { container: string; text: string; icon: number }> = {
  md: {
    container: 'h-tap px-5 rounded-button',
    text: 'text-label',
    icon: 16,
  },
  lg: {
    container: 'h-14 px-6 rounded-button',
    text: 'text-body font-bold',
    icon: 19,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  testID,
}: Props) {
  const isDisabled = disabled || loading;
  const v = variantClasses[variant];
  const s = sizeClasses[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      className={`flex-row items-center justify-center gap-2 active:opacity-80 ${v.container} ${s.container} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.contentOnAccent : colors.accent} />
      ) : (
        <>
          {Icon ? (
            <View>
              <Icon size={s.icon} color={v.icon} strokeWidth={2.4} />
            </View>
          ) : null}
          <Text className={`${v.text} ${s.text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
