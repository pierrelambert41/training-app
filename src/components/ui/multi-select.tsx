import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  testID?: string;
};

export function MultiSelect({ label, options, selected, onToggle, testID }: Props) {
  return (
    <View className="w-full gap-2" testID={testID}>
      <Text className="text-label text-content-secondary">{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row gap-2">
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <TouchableOpacity
                key={option}
                onPress={() => onToggle(option)}
                activeOpacity={0.7}
                testID={testID ? `${testID}-chip-${option}` : `multi-select-chip-${option}`}
                className={`px-3 py-2 rounded-chip border ${
                  isSelected
                    ? 'bg-accent border-accent'
                    : 'bg-background-surface border-border'
                }`}
              >
                <Text
                  className={`text-label ${
                    isSelected ? 'text-content-on-accent' : 'text-content-secondary'
                  }`}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
