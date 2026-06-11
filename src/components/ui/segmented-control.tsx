import { Pressable, Text, View } from 'react-native';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  testID?: string;
};

export function SegmentedControl<T extends string>({ options, value, onChange, testID }: Props<T>) {
  return (
    <View
      className="flex-row bg-background-surface rounded-chip p-1"
      testID={testID}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            testID={testID ? `${testID}-${option.value}` : undefined}
            className={`flex-1 h-tap items-center justify-center rounded-chip active:opacity-70 ${
              isSelected ? 'bg-accent' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-label ${
                isSelected
                  ? 'text-content-on-accent font-semibold'
                  : 'text-content-secondary font-medium'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
