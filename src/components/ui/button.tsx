import { ActivityIndicator, Pressable, Text } from 'react-native';
import { colors } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
};

const variantClasses: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-accent',
    text: 'text-white font-semibold',
  },
  secondary: {
    container: 'bg-background-surface border border-border-strong',
    text: 'text-content-primary font-semibold',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-accent font-medium',
  },
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  md: {
    container: 'h-tap px-4 rounded-button',
    text: 'text-label',
  },
  lg: {
    container: 'h-18 px-6 rounded-button',
    text: 'text-body',
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
}: Props) {
  const isDisabled = disabled || loading;
  const { container: variantContainer, text: variantText } = variantClasses[variant];
  const { container: sizeContainer, text: sizeText } = sizeClasses[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`items-center justify-center ${variantContainer} ${sizeContainer} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : colors.accent} />
      ) : (
        <Text className={`${variantText} ${sizeText}`}>{label}</Text>
      )}
    </Pressable>
  );
}
