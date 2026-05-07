import { Text } from 'react-native';
import { colors } from '@/theme/tokens';

type TabIconProps = {
  symbol: string;
  focused: boolean;
};

export function TabIcon({ symbol, focused }: TabIconProps) {
  return (
    <Text
      style={{
        fontSize: 22,
        color: focused ? colors.accent : colors.contentSecondary,
        lineHeight: 26,
      }}
    >
      {symbol}
    </Text>
  );
}
