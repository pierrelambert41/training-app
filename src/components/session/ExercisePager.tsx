import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ExercisePagerProps = {
  currentIndex: number;
  count: number;
  onPageChange: (index: number) => void;
  renderPage: (index: number) => React.ReactNode;
};

export function ExercisePager({
  currentIndex,
  count,
  onPageChange,
  renderPage,
}: ExercisePagerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isScrollingProgrammatically = useRef(false);

  const scrollToIndex = useCallback(
    (index: number) => {
      isScrollingProgrammatically.current = true;
      scrollRef.current?.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true,
      });
      // Fallback reset: onMomentumScrollEnd may not fire if the scroll distance
      // is tiny (same page) or the gesture is interrupted.
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 600);
    },
    []
  );

  useEffect(() => {
    scrollToIndex(currentIndex);
  }, [currentIndex, scrollToIndex]);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isScrollingProgrammatically.current) {
        isScrollingProgrammatically.current = false;
        return;
      }
      const pageIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (pageIndex !== currentIndex) {
        onPageChange(pageIndex);
      }
    },
    [currentIndex, onPageChange]
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      decelerationRate="fast"
      onMomentumScrollEnd={handleMomentumScrollEnd}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: SCREEN_WIDTH }}>
          {renderPage(i)}
        </View>
      ))}
    </ScrollView>
  );
}
