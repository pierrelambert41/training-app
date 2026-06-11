import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

export type LineChartPoint = {
  /** Label court affiché sous l'axe X (ex: date "12/05"). */
  label: string;
  value: number;
};

type Props = {
  points: LineChartPoint[];
  height?: number;
  color?: string;
  /** Formatte les valeurs min/max de l'axe Y (ex: "82,5 kg"). */
  formatValue?: (value: number) => string;
  emptyMessage?: string;
  testID?: string;
};

const PADDING_TOP = 8;
const PADDING_BOTTOM = 8;
const DOT_RADIUS = 3;

/**
 * Courbe SVG pure (data en props, aucun I/O — R4). Affiche min/max sur l'axe Y
 * et premier/dernier label sur l'axe X. En dessous de 2 points, état vide.
 */
export function LineChart({
  points,
  height = 160,
  color = colors.accent,
  formatValue = (v) => String(Math.round(v * 10) / 10),
  emptyMessage = 'Pas encore assez de données',
  testID = 'line-chart',
}: Props) {
  const [width, setWidth] = useState(0);

  if (points.length < 2) {
    return (
      <View
        className="items-center justify-center py-8"
        testID={`${testID}-empty`}
      >
        <AppText variant="caption" muted>
          {emptyMessage}
        </AppText>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Plage plate (toutes valeurs égales) : on centre la ligne.
  const range = max - min || 1;

  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const stepX = width > 0 ? width / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: PADDING_TOP + chartHeight - ((p.value - min) / range) * chartHeight,
  }));

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  const firstLabel = points[0]!.label;
  const lastLabel = points[points.length - 1]!.label;

  return (
    <View testID={testID}>
      <View className="flex-row justify-between">
        <AppText variant="caption" muted testID={`${testID}-max`}>
          {formatValue(max)}
        </AppText>
      </View>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line
              x1={0}
              y1={PADDING_TOP}
              x2={width}
              y2={PADDING_TOP}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Line
              x1={0}
              y1={PADDING_TOP + chartHeight}
              x2={width}
              y2={PADDING_TOP + chartHeight}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            {coords.map((c, i) => (
              <Circle key={i} cx={c.x} cy={c.y} r={DOT_RADIUS} fill={color} />
            ))}
          </Svg>
        ) : null}
      </View>
      <View className="flex-row justify-between">
        <AppText variant="caption" muted testID={`${testID}-min`}>
          {formatValue(min)}
        </AppText>
      </View>
      <View className="flex-row justify-between mt-1">
        <AppText variant="caption" muted>
          {firstLabel}
        </AppText>
        <AppText variant="caption" muted>
          {lastLabel}
        </AppText>
      </View>
    </View>
  );
}
