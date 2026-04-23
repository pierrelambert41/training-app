import { useLocalSearchParams } from 'expo-router';
import ExerciseDetailScreen from '@/screens/(app)/exercise-detail-screen';

export default function ExerciseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseDetailScreen exerciseId={id ?? ''} />;
}
