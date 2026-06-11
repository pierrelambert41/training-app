import { Tabs } from 'expo-router';
import { CalendarDays, ChartNoAxesCombined, Dumbbell, House, UserRound } from 'lucide-react-native';
import { TabIcon } from '@/components/ui/tab-icon';
import { colors } from '@/theme/tokens';

export function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.contentPrimary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.contentMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Aujourd'hui",
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon={House} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: 'Programme',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon={CalendarDays} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progrès',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon={ChartNoAxesCombined} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Bibliothèque',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon={Dumbbell} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon={UserRound} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
