import '../global.css';
import { colorScheme } from 'nativewind';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { checkSupabaseHealth } from '@/services/supabase';

colorScheme.set('dark');

function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    checkSupabaseHealth();
  }, []);

  return <AuthGuard />;
}
