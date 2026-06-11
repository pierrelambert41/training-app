import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { Program } from '@/types';
import { AppText } from '@/components/ui';
import { useNetworkStatus } from '@/features/sync';
import { useUpgradeProgram } from '../hooks/use-upgrade-program';
import { useUpgradeBannerStore } from '../stores/upgrade-banner-store';

const AI_ACCENT = '#8b5cf6';

const WHY_TEXT =
  "Ce programme a été généré hors-ligne par le moteur de base. L'IA peut le personnaliser davantage : volume par muscle selon ton profil, choix d'exercices affinés, progression adaptée à ton historique. Ton bloc en cours n'est pas modifié.";

type FallbackUpgradeBannerProps = {
  program: Program;
  userId: string | undefined;
};

/**
 * Bannière contextuelle "Programme amélioré disponible" (TA-146).
 *
 * Affichée dans l'écran programme quand le programme actif est issu du
 * fallback (generationSource: 'fallback') ET que le réseau est disponible.
 * Non-bloquante, dismissable (jusqu'au prochain démarrage — store en mémoire).
 *
 * "Mettre à jour" → generateProgramWithAI avec le contexte reconstruit →
 * remplacement transactionnel des blocs planned (le bloc actif est conservé).
 * En cas d'échec : message non-bloquant, la bannière reste pour réessayer.
 */
export function FallbackUpgradeBanner({ program, userId }: FallbackUpgradeBannerProps) {
  const { isOffline } = useNetworkStatus();
  const dismissed = useUpgradeBannerStore((s) => s.dismissed);
  const dismiss = useUpgradeBannerStore((s) => s.dismiss);
  const { isUpgrading, error, upgrade } = useUpgradeProgram(program.id, userId);
  const [showWhy, setShowWhy] = useState(false);

  if (program.generationSource !== 'fallback' || isOffline || dismissed || !userId) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: '#1e1b34',
        borderRadius: 12,
        borderCurve: 'continuous',
        borderLeftWidth: 3,
        borderLeftColor: AI_ACCENT,
        padding: 14,
        gap: 10,
      }}
      testID="fallback-upgrade-banner"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontSize: 15, fontWeight: '700', color: '#e5e7eb' }}>
            ✦ Programme amélioré disponible
          </AppText>
          <AppText style={{ fontSize: 13, color: '#9ca3af', lineHeight: 18 }}>
            Ton programme a été généré hors-ligne. L&apos;IA peut maintenant le personnaliser.
          </AppText>
        </View>
        <Pressable
          onPress={dismiss}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Masquer la bannière"
          testID="upgrade-banner-dismiss"
        >
          <AppText style={{ fontSize: 16, color: '#6b7280' }}>✕</AppText>
        </Pressable>
      </View>

      {showWhy && (
        <AppText style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 19 }} testID="upgrade-banner-why-text">
          {WHY_TEXT}
        </AppText>
      )}

      {error !== null && (
        <AppText style={{ fontSize: 13, color: '#fb923c' }} testID="upgrade-banner-error">
          {error}
        </AppText>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable
          onPress={upgrade}
          disabled={isUpgrading}
          style={{
            minHeight: 44,
            paddingHorizontal: 16,
            borderRadius: 10,
            backgroundColor: AI_ACCENT,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: isUpgrading ? 0.7 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Mettre à jour le programme avec l'IA"
          testID="upgrade-banner-cta"
        >
          {isUpgrading && <ActivityIndicator size="small" color="#ffffff" />}
          <AppText style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
            {isUpgrading ? 'Génération en cours…' : 'Mettre à jour'}
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setShowWhy((v) => !v)}
          style={{ minHeight: 44, justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Pourquoi cette proposition ?"
          testID="upgrade-banner-why"
        >
          <AppText style={{ fontSize: 13, color: AI_ACCENT }}>Pourquoi ?</AppText>
        </Pressable>
      </View>
    </View>
  );
}
