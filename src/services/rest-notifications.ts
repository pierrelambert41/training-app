import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let permissionRequested = false;

export async function requestNotificationPermissionOnce(): Promise<boolean> {
  if (permissionRequested) return true;

  if (Platform.OS === 'web') return false;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') {
      permissionRequested = true;
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    permissionRequested = true;
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleRestEndNotification(
  restSeconds: number,
  exerciseName: string
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissionOnce();
    if (!granted) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Repos terminé',
        body: `Set suivant : ${exerciseName}`,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: restSeconds,
      },
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelRestNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}
