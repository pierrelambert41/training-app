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
      className="flex-row bg-background-surface border border-border rounded-card overflow-hidden"
      testID={testID}
    >
      {options.map((option, index) => {
        const isSelected = value === option.value;
        const isLast = index === options.length - 1;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            testID={testID ? `${testID}-${option.value}` : undefined}
            className={`flex-1 h-tap items-center justify-center active:opacity-70 ${
              isSelected ? 'bg-accent' : 'bg-transparent'
            } ${!isLast ? 'border-r border-border' : ''}`}
          >
            <Text
              className={`text-label font-medium ${
                isSelected ? 'text-white' : 'text-content-secondary'
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
