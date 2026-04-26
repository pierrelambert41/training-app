import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

const PRESET_OPTIONS = [
  { label: '1min', value: 60 },
  { label: '1m30', value: 90 },
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
];

type RestTimerAdjusterProps = {
  currentRestSeconds: number;
  onAdjust: (newRestSeconds: number) => void;
};

export function RestTimerAdjuster({ currentRestSeconds, onAdjust }: RestTimerAdjusterProps) {
  const [expanded, setExpanded] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const displayLabel = (() => {
    const preset = PRESET_OPTIONS.find((o) => o.value === currentRestSeconds);
    if (preset) return preset.label;
    if (currentRestSeconds >= 60) {
      const min = Math.floor(currentRestSeconds / 60);
      const sec = currentRestSeconds % 60;
      return sec > 0 ? `${min}m${sec}s` : `${min}min`;
    }
    return `${currentRestSeconds}s`;
  })();

  function handlePreset(value: number) {
    onAdjust(value);
    setExpanded(false);
    setCustomValue('');
  }

  function handleCustomSubmit() {
    const parsed = parseInt(customValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onAdjust(parsed);
      setExpanded(false);
      setCustomValue('');
    }
  }

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{ minHeight: 44, alignSelf: 'flex-start' }}
        className="flex-row items-center gap-1 rounded-chip bg-background-elevated px-3 py-1 border border-border"
        accessibilityLabel={`Repos : ${displayLabel}. Tap pour ajuster`}
        accessibilityRole="button"
        testID="rest-timer-adjuster-toggle"
      >
        <AppText className="text-caption text-content-muted">⏱</AppText>
        <AppText className="text-label font-semibold text-content-secondary">{displayLabel}</AppText>
        <AppText className="text-caption text-content-muted">{expanded ? '▲' : '▼'}</AppText>
      </Pressable>

      {expanded && (
        <View className="flex-row flex-wrap gap-2 items-center">
          {PRESET_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => handlePreset(opt.value)}
              style={{ minHeight: 44, minWidth: 44 }}
              className={`rounded-chip px-3 py-1 border items-center justify-center ${
                currentRestSeconds === opt.value
                  ? 'bg-accent border-accent'
                  : 'bg-background-surface border-border'
              }`}
              accessibilityLabel={`Repos ${opt.label}`}
              testID={`rest-preset-${opt.value}`}
            >
              <AppText
                className={`text-label font-semibold ${
                  currentRestSeconds === opt.value ? 'text-content-on-accent' : 'text-content-secondary'
                }`}
              >
                {opt.label}
              </AppText>
            </Pressable>
          ))}

          <View className="flex-row items-center gap-1">
            <TextInput
              value={customValue}
              onChangeText={setCustomValue}
              onSubmitEditing={handleCustomSubmit}
              keyboardType="number-pad"
              returnKeyType="done"
              placeholder="s"
              placeholderTextColor={colors.contentMuted}
              style={{
                height: 44,
                width: 52,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#1e2d4a',
                backgroundColor: '#0f1628',
                color: colors.contentPrimary,
                fontSize: 14,
                fontWeight: '600',
                textAlign: 'center',
                paddingHorizontal: 6,
              }}
              accessibilityLabel="Durée de repos personnalisée en secondes"
              testID="rest-custom-input"
            />
            <Pressable
              onPress={handleCustomSubmit}
              style={{ minHeight: 44, minWidth: 44 }}
              className="rounded-chip bg-background-surface border border-border items-center justify-center px-2"
              accessibilityLabel="Valider la durée de repos"
              testID="rest-custom-confirm"
            >
              <AppText className="text-label font-bold text-accent">OK</AppText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
