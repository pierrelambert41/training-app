import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';

const RIR_OPTIONS = [0, 1, 2, 3, 4, 5];

type RirSelectorProps = {
  value: number | null;
  onChange: (v: number) => void;
};

export function RirSelector({ value, onChange }: RirSelectorProps) {
  return (
    <View className="flex-row gap-2">
      {RIR_OPTIONS.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          className={`flex-1 h-tap items-center justify-center rounded-button border ${
            value === opt
              ? 'bg-accent border-accent'
              : 'bg-background-surface border-border'
          }`}
          accessibilityLabel={`RIR ${opt}`}
        >
          <AppText
            className={`text-label font-semibold ${
              value === opt ? 'text-content-on-accent' : 'text-content-secondary'
            }`}
          >
            {opt}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
