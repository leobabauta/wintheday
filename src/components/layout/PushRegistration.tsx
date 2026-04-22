'use client';

import { useEffect } from 'react';

// Dynamically imported so the Capacitor packages never load on the plain-web
// build (they try to reach native bridges that don't exist in a browser).
// Runs once per authenticated layout mount; Capacitor guards against
// re-registering the same token so repeated calls are harmless.
export default function PushRegistration() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        const platform = Capacitor.getPlatform() as 'ios' | 'android';

        // Ask for permission. On iOS this shows the system alert the first
        // time; subsequent calls just return the current state.
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;
        if (cancelled) return;

        // Fires once per app install when APNs/FCM returns a token, and
        // again if the OS rotates the token.
        PushNotifications.addListener('registration', async (token) => {
          try {
            await fetch('/api/device-tokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: token.value, platform }),
              credentials: 'include',
            });
          } catch (err) {
            console.error('device-token POST failed:', err);
          }
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('Push registration error:', err);
        });

        // Tapping a notification from the lock screen / notification center
        // lands here. We stored the in-app destination under data.url.
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const url = action.notification.data?.url;
          if (url && typeof url === 'string') {
            window.location.href = url;
          }
        });

        await PushNotifications.register();
      } catch (err) {
        console.error('PushRegistration init failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
