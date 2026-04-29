'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSignMessage } from 'wagmi';

import { useActiveWallet } from '@/hooks/useActiveWallet';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';

export type PushTopic = 'wallet' | 'nearby' | 'campaigns' | 'venues';

export const PUSH_TOPIC_LABELS: Array<{ id: PushTopic; label: string }> = [
  { id: 'wallet', label: 'Wallet' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'venues', label: 'Venues' },
];

export const NEARBY_RADIUS_OPTIONS = [2, 5, 10, 20] as const;
const PUSH_SUBSCRIPTION_CHANGED_EVENT = 'basedare:push-subscription-changed';

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

export function useWalletPushSubscription() {
  const { address, sessionWallet } = useActiveWallet();
  const { data: session } = useSession();
  const { signMessageAsync } = useSignMessage();
  const [pushSupported, setPushSupported] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY));
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushEndpoint, setPushEndpoint] = useState<string | null>(null);
  const [pushTopics, setPushTopics] = useState<PushTopic[]>(['wallet', 'nearby']);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<number>(5);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | 'unknown'>('unknown');

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
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

  const refreshPushState = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setPushSupported(supported);
    setPermission(getNotificationPermission());

    if (!supported || !address) {
      setPushEnabled(false);
      setPushEndpoint(null);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const headers = await getWalletAuthHeaders('push:read', false);
      const params = new URLSearchParams({ wallet: address });
      if (subscription?.endpoint) {
        params.set('endpoint', subscription.endpoint);
      }
      const res = await fetch(`/api/push/subscriptions?${params.toString()}`, { headers });
      const data = await res.json();

      if (data.success) {
        setPushConfigured(Boolean(data.configured ?? vapidPublicKey));
        setPushEnabled(Boolean(subscription && data.subscribed));
        setPushEndpoint(subscription?.endpoint ?? null);
        setPushTopics(Array.isArray(data.topics) ? data.topics : ['wallet', 'nearby']);
        setNearbyRadiusKm(typeof data.location?.radiusKm === 'number' ? data.location.radiusKm : 5);
        return;
      }

      setPushConfigured(Boolean(vapidPublicKey));
      setPushEnabled(false);
      setPushEndpoint(subscription?.endpoint ?? null);
    } catch (err) {
      console.error('Failed to read push state', err);
    }
  }, [address, getWalletAuthHeaders, vapidPublicKey]);

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
    if (!address || !pushSupported || !vapidPublicKey) {
      return;
    }

    setPushBusy(true);
    setPushMessage(null);

    try {
      const nextPermission = await window.Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== 'granted') {
        setPushMessage('Push permission is blocked for this browser.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const headers = await getWalletAuthHeaders('push:write', true);
      const res = await fetch('/api/push/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          wallet: address,
          subscription: subscription.toJSON(),
          topics: pushTopics,
          nearbyRadiusKm,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save subscription');
      }

      setPushConfigured(true);
      setPushEnabled(true);
      setPushEndpoint(subscription.endpoint);
      setPushMessage('Push alerts armed for this wallet.');
      announcePushSubscriptionChanged();
    } catch (err) {
      console.error('Failed to enable push alerts', err);
      setPushMessage('Could not enable push alerts right now.');
    } finally {
      setPushBusy(false);
    }
  }, [address, getWalletAuthHeaders, nearbyRadiusKm, pushSupported, pushTopics, vapidPublicKey]);

  const disablePushSubscription = useCallback(async () => {
    if (!address || !pushSupported) {
      return;
    }

    setPushBusy(true);
    setPushMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
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
      setPushMessage('Could not pause push alerts right now.');
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

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to update push topics');
        }

        setPushTopics(data.topics);
        setPushMessage('Alert categories updated.');
        announcePushSubscriptionChanged();
      } catch (err) {
        console.error('Failed to update push topics', err);
        setPushMessage('Could not update alert categories right now.');
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

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to update nearby radius');
        }

        setNearbyRadiusKm(radiusKm);
        setPushMessage(`Nearby alerts tuned to ${radiusKm} km.`);
        announcePushSubscriptionChanged();
      } catch (err) {
        console.error('Failed to update nearby radius', err);
        setPushMessage('Could not update nearby alert radius right now.');
      } finally {
        setPushBusy(false);
      }
    },
    [address, getWalletAuthHeaders, nearbyRadiusKm, pushEnabled, pushEndpoint]
  );

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

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to send test push');
      }

      setPushMessage('Test push sent. Check this device now.');
    } catch (err) {
      console.error('Failed to send test push', err);
      setPushMessage('Could not send a test push right now.');
    } finally {
      setPushTesting(false);
    }
  }, [address, getWalletAuthHeaders, pushEndpoint]);

  return {
    address,
    nearbyRadiusKm,
    permission,
    pushBusy,
    pushConfigured,
    pushEnabled,
    pushEndpoint,
    pushMessage,
    pushSupported,
    pushTesting,
    pushTopics,
    vapidPublicKey,
    disablePushSubscription,
    refreshPushState,
    sendTestPush,
    setPushMessage,
    syncPushSubscription,
    togglePushTopic,
    updateNearbyRadius,
  };
}
