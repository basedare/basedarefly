'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, Smartphone } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    createdAt: string;
    isRead: boolean;
}

export function NotificationBell() {
    const { address } = useWallet();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [pushSupported, setPushSupported] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushBusy, setPushBusy] = useState(false);
    const [pushMessage, setPushMessage] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.length;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const fetchNotifications = useCallback(async () => {
        if (!address) return;
        try {
            const res = await fetch(`/api/notifications?wallet=${address}`);
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications);
            }
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    }, [address]);

    // Polling every 30s
    useEffect(() => {
        if (address) {
            fetchNotifications();
            const intervalId = setInterval(fetchNotifications, 30000);
            return () => clearInterval(intervalId);
        } else {
            setNotifications([]);
        }
    }, [address, fetchNotifications]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const supported = 'serviceWorker' in navigator && 'PushManager' in window;
        setPushSupported(supported);

        if (!supported || !address) {
            setPushEnabled(false);
            return;
        }

        const loadPushState = async () => {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setPushEnabled(Boolean(subscription));
            } catch (err) {
                console.error('Failed to read push state', err);
            }
        };

        void loadPushState();
    }, [address]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const markAsRead = async (ids: string[]) => {
        if (!address || ids.length === 0) return;

        // Optimistic update
        setNotifications(prev => prev.filter(n => !ids.includes(n.id)));

        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet: address, notificationIds: ids })
            });
        } catch (err) {
            console.error('Failed to mark notifications as read', err);
            // Re-fetch to restore state on error
            fetchNotifications();
        }
    };

    const markAllAsRead = () => {
        const ids = notifications.map(n => n.id);
        markAsRead(ids);
    };

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
    };

    const syncPushSubscription = async () => {
        if (!address || !pushSupported || !vapidPublicKey) {
            return;
        }

        setPushBusy(true);
        setPushMessage(null);

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
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

            const res = await fetch('/api/push/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: address,
                    subscription: subscription.toJSON(),
                }),
            });

            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to save subscription');
            }

            setPushEnabled(true);
            setPushMessage('Push alerts armed for this wallet.');
        } catch (err) {
            console.error('Failed to enable push alerts', err);
            setPushMessage('Could not enable push alerts right now.');
        } finally {
            setPushBusy(false);
        }
    };

    const disablePushSubscription = async () => {
        if (!address || !pushSupported) {
            return;
        }

        setPushBusy(true);
        setPushMessage(null);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await fetch('/api/push/subscriptions', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        wallet: address,
                        endpoint: subscription.endpoint,
                    }),
                });
                await subscription.unsubscribe();
            }

            setPushEnabled(false);
            setPushMessage('Push alerts paused on this device.');
        } catch (err) {
            console.error('Failed to disable push alerts', err);
            setPushMessage('Could not pause push alerts right now.');
        } finally {
            setPushBusy(false);
        }
    };

    if (!address) return null;

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
                <Bell className={`w-5 h-5 text-gray-300 transition-transform ${isHovered && unreadCount > 0 ? 'animate-wiggle' : ''}`} />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#121214]"
                    >
                        <span className="text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </motion.div>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 md:w-96 max-h-[80vh] flex flex-col bg-[#16161a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                            <h3 className="font-bold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                                >
                                    <Check className="w-3 h-3" /> Mark all read
                                </button>
                            )}
                        </div>

                        {pushSupported && (
                            <div className="border-b border-white/5 bg-white/[0.03] px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-200/80">
                                            <Smartphone className="w-3.5 h-3.5" />
                                            Mobile Push
                                        </div>
                                        <p className="mt-1 text-xs text-gray-400">
                                            {vapidPublicKey
                                                ? (pushEnabled ? 'This device will get BaseDare alerts.' : 'Enable browser push for nearby and wallet alerts.')
                                                : 'Push delivery keys are not configured yet.'}
                                        </p>
                                    </div>
                                    {vapidPublicKey ? (
                                        <button
                                            type="button"
                                            onClick={() => void (pushEnabled ? disablePushSubscription() : syncPushSubscription())}
                                            disabled={pushBusy}
                                            className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/15 disabled:opacity-50"
                                        >
                                            {pushBusy ? 'Working...' : (pushEnabled ? 'Disable' : 'Enable')}
                                        </button>
                                    ) : (
                                        <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                                            Soon
                                        </div>
                                    )}
                                </div>
                                {pushMessage && (
                                    <p className="mt-2 text-[11px] text-cyan-100/80">
                                        {pushMessage}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* List */}
                        <div className="overflow-y-auto flex-1 p-2">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <Bell className="w-8 h-8 text-white/20 mb-3" />
                                    <p className="text-sm text-gray-400">You&apos;re all caught up!</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className="group relative p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                                            onClick={() => markAsRead([notif.id])}
                                        >
                                            {notif.link ? (
                                                <Link href={notif.link} className="block">
                                                    <h4 className="font-bold text-sm text-white mb-1">{notif.title}</h4>
                                                    <p className="text-xs text-gray-400 leading-relaxed">{notif.message}</p>
                                                    <span className="text-[10px] text-gray-500 mt-2 block">
                                                        {new Date(notif.createdAt).toLocaleDateString()}
                                                    </span>
                                                </Link>
                                            ) : (
                                                <div>
                                                    <h4 className="font-bold text-sm text-white mb-1">{notif.title}</h4>
                                                    <p className="text-xs text-gray-400 leading-relaxed">{notif.message}</p>
                                                    <span className="text-[10px] text-gray-500 mt-2 block">
                                                        {new Date(notif.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Read indicator dot */}
                                            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
