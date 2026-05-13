'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSignMessage } from 'wagmi';

import { useActiveWallet } from '@/hooks/useActiveWallet';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

export type PushTopic = 'wallet' | 'nearby' | 'campaigns' | 'venues';
type PushLocationContext = {
  latitude: number;
  longitude: number;
  radiusKm?: number;
};

type PushRuntimeConfig = {
  success?: boolean;
  publicKey?: string | null;
  configured?: boolean;
  clientConfigured?: boolean;
  deliveryConfigured?: boolean;
  publicKeySource?: string | null;
};

export const PUSH_TOPIC_LABELS: Array<{ id: PushTopic; label: string }> = [
  { id: 'wallet', label: 'Wallet' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'venues', label: 'Venues' },
];

export const NEARBY_RADIUS_OPTIONS = [2, 5, 10, 20] as const;
const PUSH_SUBSCRIPTION_CHANGED_EVENT = 'basedare:push-subscription-changed';
const SERVICE_WORKER_READY_TIMEOUT_MS = 8_000;
const GEOLOCATION_TIMEOUT_MS = 8_000;

function announcePushSubscriptionChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PUSH_SUBSCRIPTION_CHANGED_EVENT));
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

async function getReadyServiceWorkerRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }

  let registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } else {
    registration.update().catch(() => {});
  }

  if (registration.active) {
    return registration;
  }

  return withTimeout(
    navigator.serviceWorker.ready,
    SERVICE_WORKER_READY_TIMEOUT_MS,
    'Service worker is not ready yet. Reload BaseDare and try again.'
  );
}

async function getGeolocationPermissionState() {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return null;
  }

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state;
  } catch {
    return null;
  }
}

async function readCurrentPushLocation(radiusKm: number, options: { promptIfUnknown: boolean }) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null;
  }

  const permissionState = await getGeolocationPermissionState();
  if (permissionState === 'denied' || (!options.promptIfUnknown && permissionState !== 'granted')) {
    return null;
  }

  return withTimeout(
    new Promise<PushLocationContext>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radiusKm,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: GEOLOCATION_TIMEOUT_MS,
        }
      );
    }),
    GEOLOCATION_TIMEOUT_MS + 750,
    'Location lookup timed out.'
  ).catch(() => null);
}

export function useWalletPushSubscription() {
  const { address, sessionWallet } = useActiveWallet();
  const { data: session } = useSession();
  const { signMessageAsync } = useSignMessage();
  const bundledVapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? '';
  const [pushSupported, setPushSupported] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(Boolean(bundledVapidPublicKey));
  const [pushClientConfigured, setPushClientConfigured] = useState(Boolean(bundledVapidPublicKey));
  const [pushDeliveryConfigured, setPushDeliveryConfigured] = useState(Boolean(bundledVapidPublicKey));
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);
  const [pushLocationBusy, setPushLocationBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushEndpoint, setPushEndpoint] = useState<string | null>(null);
  const [pushTopics, setPushTopics] = useState<PushTopic[]>(['wallet', 'nearby']);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<number>(5);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | 'unknown'>('unknown');
  const [vapidPublicKey, setVapidPublicKey] = useState(bundledVapidPublicKey);
  const [pushPublicKeySource, setPushPublicKeySource] = useState<string | null>(
    bundledVapidPublicKey ? 'NEXT_PUBLIC_VAPID_PUBLIC_KEY' : null
  );

  const sessionToken = (session as { token?: string | null } | null)?.token ?? null;

  const getWalletAuthHeaders = useCallback(
    async (action: string, allowSignPrompt = false) => {
      if (!address) return {};

      return buildWalletActionAuthHeaders({
        walletAddress: address,
        sessionToken,
        sessionWallet,
        action,
        resource: address,
        allowSignPrompt,
        signMessageAsync,
      });
    },
    [address, sessionToken, sessionWallet, signMessageAsync]
  );

  const refreshPushConfig = useCallback(async () => {
    const fallbackKey = bundledVapidPublicKey;

    try {
      const res = await fetch('/api/push/config', { cache: 'no-store' });
      const data = (await parseJsonResponse(res)) as PushRuntimeConfig | null;

      if (res.ok && data?.success) {
        const nextPublicKey = typeof data.publicKey === 'string' ? data.publicKey.trim() : fallbackKey;
        const nextClientConfigured = Boolean(data.clientConfigured ?? nextPublicKey);
        const nextDeliveryConfigured = Boolean(data.deliveryConfigured ?? data.configured);
        const nextConfigured = Boolean(data.configured ?? (nextClientConfigured && nextDeliveryConfigured));

        setVapidPublicKey(nextPublicKey);
        setPushClientConfigured(nextClientConfigured);
        setPushDeliveryConfigured(nextDeliveryConfigured);
        setPushConfigured(nextConfigured);
        setPushPublicKeySource(data.publicKeySource ?? (nextPublicKey ? 'VAPID_PUBLIC_KEY' : null));

        return {
          publicKey: nextPublicKey,
          configured: nextConfigured,
          clientConfigured: nextClientConfigured,
          deliveryConfigured: nextDeliveryConfigured,
        };
      }
    } catch (err) {
      console.error('Failed to read push config', err);
    }

    setVapidPublicKey(fallbackKey);
    setPushClientConfigured(Boolean(fallbackKey));
    setPushDeliveryConfigured(Boolean(fallbackKey));
    setPushConfigured(Boolean(fallbackKey));
    setPushPublicKeySource(fallbackKey ? 'NEXT_PUBLIC_VAPID_PUBLIC_KEY' : null);

    return {
      publicKey: fallbackKey,
      configured: Boolean(fallbackKey),
      clientConfigured: Boolean(fallbackKey),
      deliveryConfigured: Boolean(fallbackKey),
    };
  }, [bundledVapidPublicKey]);

  const refreshPushState = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setPushSupported(supported);
    setPermission(getNotificationPermission());
    const runtimeConfig = supported ? await refreshPushConfig() : null;

    if (!supported || !address) {
      setPushEnabled(false);
      setPushEndpoint(null);
      return;
    }

    try {
      const registration = await getReadyServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();
      const headers = await getWalletAuthHeaders('push:read', false);
      const params = new URLSearchParams({ wallet: address });
      if (subscription?.endpoint) {
        params.set('endpoint', subscription.endpoint);
      }
      const res = await fetch(`/api/push/subscriptions?${params.toString()}`, { headers });
      const data = await parseJsonResponse(res);

      if (data?.success) {
        const nextClientConfigured = Boolean(data.clientConfigured ?? runtimeConfig?.clientConfigured);
        const nextDeliveryConfigured = Boolean(data.deliveryConfigured ?? runtimeConfig?.deliveryConfigured);
        setPushClientConfigured(nextClientConfigured);
        setPushDeliveryConfigured(nextDeliveryConfigured);
        setPushConfigured(Boolean(data.configured ?? (nextClientConfigured && nextDeliveryConfigured)));
        setPushEnabled(Boolean(subscription && data.subscribed));
        setPushEndpoint(subscription?.endpoint ?? null);
        setPushTopics(Array.isArray(data.topics) ? data.topics : ['wallet', 'nearby']);
        setNearbyRadiusKm(typeof data.location?.radiusKm === 'number' ? data.location.radiusKm : 5);
        return;
      }

      setPushClientConfigured(Boolean(runtimeConfig?.clientConfigured));
      setPushDeliveryConfigured(Boolean(runtimeConfig?.deliveryConfigured));
      setPushConfigured(Boolean(runtimeConfig?.configured));
      setPushEnabled(false);
      setPushEndpoint(subscription?.endpoint ?? null);
    } catch (err) {
      console.error('Failed to read push state', err);
    }
  }, [address, getWalletAuthHeaders, refreshPushConfig]);

  useEffect(() => {
    void refreshPushState();
  }, [refreshPushState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChanged = () => {
      void refreshPushState();
    };

    window.addEventListener(PUSH_SUBSCRIPTION_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(PUSH_SUBSCRIPTION_CHANGED_EVENT, handleChanged);
  }, [refreshPushState]);

  const syncPushSubscription = useCallback(async () => {
    if (!address || !pushSupported) {
      return;
    }

    setPushBusy(true);
    setPushMessage(null);

    try {
      const runtimeConfig = await refreshPushConfig();
      const activeVapidPublicKey = runtimeConfig.publicKey || vapidPublicKey;

      if (!activeVapidPublicKey) {
        setPushMessage('Push browser key is not configured yet.');
        return;
      }

      if (!runtimeConfig.deliveryConfigured) {
        setPushMessage('Push server delivery key is not configured yet.');
        return;
      }

      const nextPermission = await window.Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== 'granted') {
        setPushMessage('Push permission is blocked for this browser.');
        return;
      }

      const registration = await getReadyServiceWorkerRegistration();
      let subscription = await registration.pushManager.getSubscription();

      if (subscription && !pushEnabled) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }

      if (!subscription) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(activeVapidPublicKey),
          });
        } catch (error) {
          const currentSubscription = await registration.pushManager.getSubscription().catch(() => null);
          if (!currentSubscription) {
            throw error;
          }

          await currentSubscription.unsubscribe().catch(() => {});
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(activeVapidPublicKey),
          });
        }
      }

      const location = pushTopics.includes('nearby')
        ? await readCurrentPushLocation(nearbyRadiusKm, { promptIfUnknown: false })
        : null;
      const headers = await getWalletAuthHeaders('push:write', true);
      const res = await fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          wallet: address,
          subscription: subscription.toJSON(),
          topics: pushTopics,
          nearbyRadiusKm,
          location,
        }),
      });

      const data = await parseJsonResponse(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to save subscription');
      }

      const nextClientConfigured = Boolean(data.clientConfigured ?? true);
      const nextDeliveryConfigured = Boolean(data.deliveryConfigured ?? true);
      setPushClientConfigured(nextClientConfigured);
      setPushDeliveryConfigured(nextDeliveryConfigured);
      setPushConfigured(Boolean(data.configured ?? (nextClientConfigured && nextDeliveryConfigured)));
      setPushEnabled(true);
      setPushEndpoint(subscription.endpoint);
      setPushMessage(data.configured === false
        ? 'Device saved, but push delivery keys are missing on the server.'
        : 'Push alerts armed for this wallet.');
      announcePushSubscriptionChanged();
    } catch (err) {
      console.error('Failed to enable push alerts', err);
      setPushMessage(getErrorMessage(err, 'Could not enable push alerts right now.'));
    } finally {
      setPushBusy(false);
    }
  }, [address, getWalletAuthHeaders, nearbyRadiusKm, pushEnabled, pushSupported, pushTopics, refreshPushConfig, vapidPublicKey]);

  const disablePushSubscription = useCallback(async () => {
    if (!address || !pushSupported) {
      return;
    }

    setPushBusy(true);
    setPushMessage(null);

    try {
      const registration = await getReadyServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const headers = await getWalletAuthHeaders('push:write', true);
        await fetch('/api/push/subscriptions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            wallet: address,
            endpoint: subscription.endpoint,
          }),
        });
        await subscription.unsubscribe();
      }

      setPushEnabled(false);
      setPushEndpoint(null);
      setPushMessage('Push alerts paused on this device.');
      announcePushSubscriptionChanged();
    } catch (err) {
      console.error('Failed to disable push alerts', err);
      setPushMessage(getErrorMessage(err, 'Could not pause push alerts right now.'));
    } finally {
      setPushBusy(false);
    }
  }, [address, getWalletAuthHeaders, pushSupported]);

  const togglePushTopic = useCallback(
    async (topic: PushTopic) => {
      if (!address || !pushEnabled || !pushEndpoint) {
        return;
      }

      const nextTopics = pushTopics.includes(topic)
        ? pushTopics.filter((entry) => entry !== topic)
        : [...pushTopics, topic];

      if (nextTopics.length === 0) {
        setPushMessage('Keep at least one alert category active.');
        return;
      }

      setPushBusy(true);
      setPushMessage(null);

      try {
        const headers = await getWalletAuthHeaders('push:write', true);
        const res = await fetch('/api/push/subscriptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            wallet: address,
            endpoint: pushEndpoint,
            topics: nextTopics,
          }),
        });

        const data = await parseJsonResponse(res);
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to update push topics');
        }

        setPushTopics(data.topics);
        setPushMessage('Alert categories updated.');
        announcePushSubscriptionChanged();
      } catch (err) {
        console.error('Failed to update push topics', err);
        setPushMessage(getErrorMessage(err, 'Could not update alert categories right now.'));
      } finally {
        setPushBusy(false);
      }
    },
    [address, getWalletAuthHeaders, pushEnabled, pushEndpoint, pushTopics]
  );

  const updateNearbyRadius = useCallback(
    async (radiusKm: number) => {
      if (!address || !pushEnabled || !pushEndpoint || radiusKm === nearbyRadiusKm) {
        return;
      }

      setPushBusy(true);
      setPushMessage(null);

      try {
        const headers = await getWalletAuthHeaders('push:write', true);
        const res = await fetch('/api/push/subscriptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            wallet: address,
            endpoint: pushEndpoint,
            nearbyRadiusKm: radiusKm,
          }),
        });

        const data = await parseJsonResponse(res);
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to update nearby radius');
        }

        setNearbyRadiusKm(radiusKm);
        setPushMessage(`Nearby alerts tuned to ${radiusKm} km.`);
        announcePushSubscriptionChanged();
      } catch (err) {
        console.error('Failed to update nearby radius', err);
        setPushMessage(getErrorMessage(err, 'Could not update nearby alert radius right now.'));
      } finally {
        setPushBusy(false);
      }
    },
    [address, getWalletAuthHeaders, nearbyRadiusKm, pushEnabled, pushEndpoint]
  );

  const syncPushLocationContext = useCallback(async () => {
    if (!address || !pushEnabled || !pushEndpoint) {
      return;
    }

    setPushLocationBusy(true);
    setPushMessage(null);

    try {
      const location = await readCurrentPushLocation(nearbyRadiusKm, { promptIfUnknown: true });
      if (!location) {
        throw new Error('Location access is unavailable for this browser.');
      }

      const headers = await getWalletAuthHeaders('push:write', true);
      const res = await fetch('/api/push/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          wallet: address,
          endpoint: pushEndpoint,
          location,
          nearbyRadiusKm,
        }),
      });

      const data = await parseJsonResponse(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update nearby alert location');
      }

      setPushMessage('Nearby alert location refreshed for this device.');
      announcePushSubscriptionChanged();
    } catch (err) {
      console.error('Failed to update push location context', err);
      setPushMessage(getErrorMessage(err, 'Could not update nearby alert location right now.'));
    } finally {
      setPushLocationBusy(false);
    }
  }, [address, getWalletAuthHeaders, nearbyRadiusKm, pushEnabled, pushEndpoint]);

  const sendTestPush = useCallback(async () => {
    if (!address || !pushEndpoint) {
      return;
    }

    setPushTesting(true);
    setPushMessage(null);

    try {
      const headers = await getWalletAuthHeaders('push:test', true);
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          wallet: address,
          endpoint: pushEndpoint,
        }),
      });

      const data = await parseJsonResponse(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send test push');
      }

      setPushMessage('Test push sent. Check this device now.');
    } catch (err) {
      console.error('Failed to send test push', err);
      setPushMessage(getErrorMessage(err, 'Could not send a test push right now.'));
    } finally {
      setPushTesting(false);
    }
  }, [address, getWalletAuthHeaders, pushEndpoint]);

  return {
    address,
    nearbyRadiusKm,
    permission,
    pushBusy,
    pushClientConfigured,
    pushConfigured,
    pushDeliveryConfigured,
    pushEnabled,
    pushEndpoint,
    pushLocationBusy,
    pushMessage,
    pushSupported,
    pushTesting,
    pushTopics,
    pushPublicKeySource,
    vapidPublicKey,
    disablePushSubscription,
    refreshPushState,
    sendTestPush,
    setPushMessage,
    syncPushLocationContext,
    syncPushSubscription,
    togglePushTopic,
    updateNearbyRadius,
  };
}
