import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from '../services/api';

// Registration + the FCM token listener only need to run once per app
// session, regardless of how many times the owning component re-renders.
let listenersAdded = false;

export function initPushListeners() {
  if (!Capacitor.isNativePlatform() || listenersAdded) return;
  listenersAdded = true;

  PushNotifications.addListener('registration', (token) => {
    api.post('/push/register-token', { token: token.value, platform: 'android' }).catch(() => {});
  });
  PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration error:', err);
  });
}

export async function registerPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return;
    await PushNotifications.register();
  } catch (err) {
    console.error('Push notification setup failed:', err);
  }
}
