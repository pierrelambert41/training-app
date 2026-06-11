import { View, ViewProps } from 'react-native';

type Elevation = 'default' | 'elevated';

type Props = ViewProps & {
  elevation?: Elevation;
};

// Borderless : l'élévation passe par le contraste de fond, pas par une bordure.
const elevationClasses: Record<Elevation, string> = {
  default: 'bg-background-surface',
  elevated: 'bg-background-elevated',
};

export function Card({ elevation = 'default', className = '', children, style, ...rest }: Props) {
  return (
    <View
      className={`rounded-card p-5 ${elevationClasses[elevation]} ${className}`.trim()}
      style={[{ borderCurve: 'continuous' }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
