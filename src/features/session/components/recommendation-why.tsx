import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useDB } from '@/hooks/use-db';
import { useExplainAdjustment } from '@/features/ai';

type RecommendationWhyProps = {
  recommendationId: string;
  userId: string;
};

/**
 * Bouton "Pourquoi ?" sous une recommandation du rules engine (TA-139).
 * Premier tap : déclenche use-explain-adjustment (TA-136) et déplie l'explication.
 * L'explication est mise en cache par TanStack Query (staleTime: Infinity).
 */
export function RecommendationWhy({ recommendationId, userId }: RecommendationWhyProps) {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const { explanation, isLoading, error, explain } = useExplainAdjustment({
    db,
    recommendationId,
    userId,
  });

  const handleToggle = useCallback(() => {
    if (!open && explanation === null) {
      void explain();
    }
    setOpen((o) => !o);
  }, [open, explanation, explain]);

  return (
    <View style={{ paddingBottom: 6 }}>
      <Pressable
        onPress={handleToggle}
        style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 }}
        accessibilityRole="button"
        accessibilityLabel="Pourquoi cette recommandation ?"
        testID={`why-button-${recommendationId}`}
      >
        <AppText style={{ fontSize: 13, color: '#60a5fa' }}>
          {open ? 'Masquer' : 'Pourquoi ?'}
        </AppText>
      </Pressable>

      {open && (
        <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#60a5fa" />
          ) : error ? (
            <AppText style={{ fontSize: 13, color: '#9ca3af' }}>
              Explication indisponible pour le moment.
            </AppText>
          ) : explanation !== null ? (
            <AppText
              style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 19 }}
              testID={`why-explanation-${recommendationId}`}
            >
              {explanation}
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );
}
