import { View, ViewProps } from 'react-native';

type Elevation = 'default' | 'elevated';

type Props = ViewProps & {
  elevation?: Elevation;
};

const elevationClasses: Record<Elevation, string> = {
  default: 'bg-background-surface border border-border',
  elevated: 'bg-background-elevated border border-border-strong',
};

export function Card({ elevation = 'default', className = '', children, ...rest }: Props) {
  return (
    <View
      className={`rounded-card p-4 ${elevationClasses[elevation]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </View>
  );
}
