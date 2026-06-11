import { View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import type { Compliance } from '../domain/compliance';

type Props = {
  compliance: Compliance | null;
  hasActiveBlock: boolean;
};

/**
 * Carte "Compliance au plan" : % de séances réalisées vs planifiées écoulées
 * sur le bloc actif (prorata de la semaine courante, plafonné à 100 %).
 */
export function ComplianceCard({ compliance, hasActiveBlock }: Props) {
  return (
    <Card elevation="default" className="gap-2" testID="compliance-card">
      <AppText variant="body" className="font-semibold">
        Compliance au plan
      </AppText>

      {!hasActiveBlock ? (
        <AppText variant="caption" muted testID="compliance-no-block">
          Aucun bloc actif — génère un programme pour suivre ta régularité.
        </AppText>
      ) : compliance === null ? (
        <AppText variant="caption" muted testID="compliance-too-early">
          Bloc fraîchement démarré — la compliance s'affichera après ta
          première semaine d'entraînement.
        </AppText>
      ) : (
        <View className="flex-row items-baseline gap-3">
          {/* Seuil 75 % = seuil d'assiduité du fatigue score (business-rules §3.1) */}
          <AppText
            variant="heading"
            className={
              compliance.percentage >= 75
                ? 'text-status-success'
                : 'text-status-warning'
            }
            testID="compliance-percentage"
          >
            {compliance.percentage}%
          </AppText>
          <AppText variant="caption" muted testID="compliance-detail">
            {compliance.completedCount}/{compliance.plannedCount} séances
            planifiées réalisées sur le bloc en cours
          </AppText>
        </View>
      )}
    </Card>
  );
}
