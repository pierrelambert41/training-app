import '../global.css';
import { colorScheme } from 'nativewind';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { checkSupabaseHealth, supabase } from '@/services/supabase';
import { DBProvider } from '@/components/db-provider';

colorScheme.set('dark');

function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isHydrated, segments, router]);

  return <Slot />;
}

function SessionHydrator({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    checkSupabaseHealth();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          createdAt: data.session.user.created_at,
        });
      }
      setHydrated();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          createdAt: session.user.created_at,
        });
      } else {
        setUser(null);
      }
      setHydrated();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [setUser, setHydrated]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <DBProvider>
        <SessionHydrator>
          <AuthGuard />
        </SessionHydrator>
      </DBProvider>
    </QueryClientProvider>
  );
}
