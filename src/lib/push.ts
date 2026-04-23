import apn from 'apn';
import admin from 'firebase-admin';
import { query, execute } from './db';

type DeviceRow = {
  id: number;
  platform: 'ios' | 'android';
  token: string;
};

// Module-level singletons — reused across invocations inside a warm lambda.
let apnProvider: apn.Provider | null = null;
let fcmInitialized = false;

// Trailing whitespace/newlines in values pasted into the Vercel env UI have
// bitten us once: a `\n` tail on APNS_BUNDLE_ID silently broke every push
// because the topic didn't match the key's registered bundle. Trim defensively.
function envStr(name: string): string | undefined {
  const v = process.env[name];
  return v ? v.trim() : undefined;
}

function getApnProvider(): apn.Provider | null {
  if (apnProvider) return apnProvider;
  const keyBase64 = envStr('APNS_KEY_BASE64');
  const keyId = envStr('APNS_KEY_ID');
  const teamId = envStr('APNS_TEAM_ID');
  if (!keyBase64 || !keyId || !teamId) return null;

  const key = Buffer.from(keyBase64, 'base64').toString('utf8');
  apnProvider = new apn.Provider({
    token: { key, keyId, teamId },
    // TestFlight + App Store builds both use APNs PRODUCTION. The sandbox
    // endpoint is only for Xcode debug builds installed directly onto a
    // device (easy to get wrong — a `development` aps-environment
    // entitlement on a Release archive still yields production tokens).
    production: envStr('APNS_PRODUCTION') === 'true',
  });
  return apnProvider;
}

function ensureFcm(): boolean {
  if (fcmInitialized) return true;
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return false;
  try {
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    fcmInitialized = true;
    return true;
  } catch (err) {
    console.error('FCM init failed:', err);
    return false;
  }
}

type PushPayload = {
  title: string;
  body: string;
  // Tapping a notification opens the app — `url` tells the wrapper which path to route to.
  url?: string;
};

async function sendToIos(tokens: string[], payload: PushPayload): Promise<DeadToken[]> {
  const provider = getApnProvider();
  const bundleId = envStr('APNS_BUNDLE_ID');
  if (!provider || !bundleId || tokens.length === 0) return [];

  const note = new apn.Notification();
  note.topic = bundleId;
  note.alert = { title: payload.title, body: payload.body };
  note.sound = 'default';
  note.contentAvailable = true;
  if (payload.url) note.payload = { url: payload.url };

  const dead: DeadToken[] = [];
  const result = await provider.send(note, tokens);
  for (const f of result.failed) {
    const reason = f.response?.reason;
    // 410 Unregistered / BadDeviceToken = token is permanently dead, prune it.
    if (f.status === '410' || reason === 'BadDeviceToken' || reason === 'Unregistered') {
      dead.push({ token: f.device, reason: reason || 'unknown' });
    } else {
      console.warn('APNs send failed:', f.device.slice(0, 12) + '…', f.status, reason);
    }
  }
  return dead;
}

async function sendToAndroid(tokens: string[], payload: PushPayload): Promise<DeadToken[]> {
  if (!ensureFcm() || tokens.length === 0) return [];

  const messaging = admin.messaging();
  const messages = tokens.map((token) => ({
    token,
    notification: { title: payload.title, body: payload.body },
    android: { priority: 'high' as const },
    data: payload.url ? { url: payload.url } : undefined,
  }));

  const dead: DeadToken[] = [];
  const response = await messaging.sendEach(messages);
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        dead.push({ token: tokens[i], reason: code });
      } else {
        console.warn('FCM send failed:', tokens[i].slice(0, 12) + '…', code);
      }
    }
  });
  return dead;
}

type DeadToken = { token: string; reason: string };

// Fire-and-forget from callers. Each transport is tried independently so
// misconfiguring one (e.g. no APNS_KEY yet) doesn't break the other.
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  try {
    const devices = await query<DeviceRow>(
      'SELECT id, platform, token FROM device_tokens WHERE user_id = $1',
      [userId]
    );
    if (devices.length === 0) return;

    const iosTokens = devices.filter((d) => d.platform === 'ios').map((d) => d.token);
    const androidTokens = devices.filter((d) => d.platform === 'android').map((d) => d.token);

    const [iosDead, androidDead] = await Promise.all([
      sendToIos(iosTokens, payload).catch((err) => {
        console.error('iOS push failed:', err);
        return [] as DeadToken[];
      }),
      sendToAndroid(androidTokens, payload).catch((err) => {
        console.error('Android push failed:', err);
        return [] as DeadToken[];
      }),
    ]);

    const deadTokens = [...iosDead, ...androidDead].map((d) => d.token);
    if (deadTokens.length > 0) {
      await execute(
        `DELETE FROM device_tokens WHERE token = ANY($1::text[])`,
        [deadTokens]
      );
    }
  } catch (err) {
    console.error('sendPushToUser failed:', err);
  }
}
