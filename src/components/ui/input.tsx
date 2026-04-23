import { View, Text, TextInput, TextInputProps } from 'react-native';
import { colors } from '@/theme/tokens';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  secure?: boolean;
};

export function Input({ label, error, secure = false, ...rest }: Props) {
  return (
    <View className="w-full gap-1">
      {label ? (
        <Text className="text-label text-content-secondary">{label}</Text>
      ) : null}
      <TextInput
        className={`w-full bg-background-surface border rounded-button h-tap px-4 text-body text-content-primary ${
          error ? 'border-status-danger' : 'border-border'
        }`}
        placeholderTextColor={colors.contentMuted}
        secureTextEntry={secure}
        {...rest}
      />
      {error ? (
        <Text className="text-caption text-status-danger">{error}</Text>
      ) : null}
    </View>
  );
}
