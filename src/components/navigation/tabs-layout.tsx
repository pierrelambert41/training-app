import { Tabs } from 'expo-router';
import { TabIcon } from '@/components/ui/tab-icon';
import { colors } from '@/theme/tokens';

export function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.contentPrimary,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: '#1f2937' },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.contentSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Aujourd'hui",
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon symbol="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: 'Programme',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon symbol="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Bibliothèque',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon symbol="🏋️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon symbol="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
