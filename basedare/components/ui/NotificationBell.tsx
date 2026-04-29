'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Check, Smartphone, X } from 'lucide-react';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useSession } from 'next-auth/react';
import { useSignMessage } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';
import {
    NEARBY_RADIUS_OPTIONS,
    PUSH_TOPIC_LABELS,
    useWalletPushSubscription,
} from '@/hooks/useWalletPushSubscription';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    createdAt: string;
    isRead: boolean;
}

type ActionCenterCategory =
    | 'Needs response'
    | 'Ready for proof'
    | 'Under review'
    | 'Payout queued'
    | 'Paid'
    | 'Claim decision'
    | 'Venue lead follow-up';

interface ActionCenterItem {
    id: string;
    dareId?: string | null;
    category: ActionCenterCategory;
    title: string;
    detail: string;
    cta: string;
    href: string;
    statusLabel?: string | null;
}

interface ActionCenterSummary {
    total: number;
    counts: Record<ActionCenterCategory, number>;
}

export function NotificationBell() {
    const { address, sessionWallet } = useActiveWallet();
    const { data: session } = useSession();
    const { signMessageAsync } = useSignMessage();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [actionItems, setActionItems] = useState<ActionCenterItem[]>([]);
    const [actionSummary, setActionSummary] = useState<ActionCenterSummary | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [mounted, setMounted] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

    const unreadCount = notifications.length;
    const attentionCount = Math.max(unreadCount, actionSummary?.total ?? 0);
    const sessionToken = (session as { token?: string | null } | null)?.token ?? null;
    const primaryAction = actionItems[0] ?? null;
    const primaryNotification = notifications[0] ?? null;
    const {
        disablePushSubscription,
        nearbyRadiusKm,
        pushBusy,
        pushEnabled,
        pushMessage,
        pushSupported,
        pushTesting,
        pushTopics,
        sendTestPush,
        syncPushSubscription,
        togglePushTopic,
        updateNearbyRadius,
        vapidPublicKey,
    } = useWalletPushSubscription();

    const formatNotificationTime = (value: string) =>
        new Date(value).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
        });

    const updateDropdownPosition = useCallback(() => {
        if (typeof window === 'undefined') return;

        if (window.innerWidth < 768) {
            setDropdownPosition(null);
            return;
        }

        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;

        setDropdownPosition({
            top: Math.round(rect.bottom + 14),
            right: Math.max(16, Math.round(window.innerWidth - rect.right)),
        });
    }, []);

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

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchNotifications = useCallback(async (allowSignPrompt = false) => {
        if (!address) return;
        try {
            const headers = await getWalletAuthHeaders('notifications:read', allowSignPrompt);
            const res = await fetch(`/api/notifications?wallet=${address}`, { headers });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications);
            }
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    }, [address, getWalletAuthHeaders]);

    const fetchActionCenter = useCallback(async () => {
        if (!address) return;
        try {
            const res = await fetch(`/api/action-center?wallet=${address}`, {
                headers: {
                    'x-moderator-wallet': address,
                },
            });
            const data = await res.json();
            if (data.success) {
                setActionItems((data.data.items ?? []).slice(0, 4));
                setActionSummary(data.data.summary ?? null);
            }
        } catch (err) {
            console.error('Failed to fetch action center', err);
        }
    }, [address]);

    // Polling every 30s
    useEffect(() => {
        if (address) {
            void fetchNotifications(false);
            void fetchActionCenter();
            const intervalId = setInterval(() => {
                void fetchNotifications(false);
                void fetchActionCenter();
            }, 30000);
            return () => clearInterval(intervalId);
        } else {
            setNotifications([]);
            setActionItems([]);
            setActionSummary(null);
        }
    }, [address, fetchActionCenter, fetchNotifications]);

    useEffect(() => {
        if (!isOpen || !address) return;
        void fetchNotifications(false);
        void fetchActionCenter();
    }, [address, fetchActionCenter, fetchNotifications, isOpen]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (dropdownRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        updateDropdownPosition();

        const handleReposition = () => updateDropdownPosition();
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);

        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [isOpen, updateDropdownPosition]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const markAsRead = async (ids: string[]) => {
        if (!address || ids.length === 0) return;

        // Optimistic update
        setNotifications(prev => prev.filter(n => !ids.includes(n.id)));

        try {
            const headers = await getWalletAuthHeaders('notifications:write', true);
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify({ wallet: address, notificationIds: ids })
            });
        } catch (err) {
            console.error('Failed to mark notifications as read', err);
            // Re-fetch to restore state on error
            void fetchNotifications(false);
        }
    };

    const markAllAsRead = () => {
        const ids = notifications.map(n => n.id);
        markAsRead(ids);
    };

    if (!address) return null;

    return (
        <div className="relative z-[200]" ref={dropdownRef}>
            <button
                ref={buttonRef}
                onClick={() => {
                    updateDropdownPosition();
                    setIsOpen((current) => !current);
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative p-2 rounded-full border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.22)] transition-colors hover:bg-white/10"
                aria-expanded={isOpen}
                aria-label="Open notifications"
            >
                <Bell className={`w-5 h-5 text-gray-300 transition-transform ${isHovered && attentionCount > 0 ? 'animate-wiggle' : ''}`} />

                {/* Unread Badge */}
                {attentionCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#121214]"
                    >
                        <span className="text-[9px] font-bold text-white">{attentionCount > 9 ? '9+' : attentionCount}</span>
                    </motion.div>
                )}
            </button>

            {/* Dropdown */}
            {mounted && createPortal(
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: -6, scale: 0.96, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -6, scale: 0.96, filter: 'blur(10px)' }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        style={dropdownPosition ? { top: dropdownPosition.top, right: dropdownPosition.right } : undefined}
                        className="fixed inset-x-2 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[1200] isolate flex h-[calc(100dvh-5.25rem)] w-auto flex-col overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(30,32,46,0.72)_0%,rgba(12,14,24,0.78)_46%,rgba(5,6,13,0.9)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.68),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-28px_42px_rgba(0,0,0,0.28)] ring-1 ring-white/[0.04] backdrop-blur-2xl md:inset-x-auto md:right-4 md:top-20 md:h-auto md:max-h-[min(78vh,42rem)] md:w-[27rem] md:rounded-[34px]"
                    >
                        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_-5%,rgba(255,255,255,0.2),transparent_28%),radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.22),transparent_38%),radial-gradient(circle_at_86%_10%,rgba(250,204,21,0.16),transparent_28%),radial-gradient(circle_at_80%_74%,rgba(168,85,247,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.11),transparent_34%)]" />
                        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                        <div className="pointer-events-none absolute left-6 right-16 top-3 h-10 rounded-full bg-white/10 blur-2xl" />
                        {/* Header */}
                        <div className="shrink-0 flex flex-col gap-3 border-b border-white/8 bg-white/[0.055] p-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <h3 className="font-bold text-white">Notifications</h3>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/36">
                                    {actionSummary?.total ? `${actionSummary.total} live actions` : 'Alerts and push settings'}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                <Link
                                    href="/action-center"
                                    className="min-h-9 rounded-full border border-fuchsia-400/18 bg-fuchsia-500/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100 transition hover:bg-fuchsia-500/[0.14]"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Action center
                                </Link>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="flex min-h-9 items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-purple-200 transition-colors hover:text-purple-100"
                                    >
                                        <Check className="w-3 h-3" /> Mark all read
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/25 text-white/58 transition hover:bg-white/10 hover:text-white"
                                    aria-label="Close notifications"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="shrink-0 border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] px-4 py-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.055] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">
                                        Actions
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-white">
                                        {actionSummary?.total ?? 0}
                                    </p>
                                </div>
                                <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.055] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">
                                        Unread
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-white">
                                        {unreadCount}
                                    </p>
                                </div>
                                <div className="rounded-[1.15rem] border border-cyan-200/15 bg-cyan-300/[0.07] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/50">
                                        Push
                                    </p>
                                    <p className="mt-1 truncate text-sm font-black text-cyan-50">
                                        {pushSupported ? (pushEnabled ? 'Armed' : 'Off') : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 overflow-hidden rounded-[1.35rem] border border-white/10 bg-black/24 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                {primaryAction ? (
                                    <Link
                                        href={primaryAction.href}
                                        className="block p-3 transition hover:bg-white/[0.04]"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-100/75">
                                                    Next best action
                                                </p>
                                                <h4 className="mt-1 truncate text-sm font-black text-white">
                                                    {primaryAction.title}
                                                </h4>
                                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/48">
                                                    {primaryAction.detail}
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded-full border border-yellow-200/20 bg-yellow-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-yellow-100/70">
                                                {primaryAction.cta}
                                            </span>
                                        </div>
                                    </Link>
                                ) : primaryNotification ? (
                                    <div className="p-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/72">
                                            Latest alert
                                        </p>
                                        <h4 className="mt-1 truncate text-sm font-black text-white">
                                            {primaryNotification.title}
                                        </h4>
                                        <div className="mt-1 flex items-start justify-between gap-3">
                                            <p className="line-clamp-2 text-xs leading-relaxed text-white/48">
                                                {primaryNotification.message}
                                            </p>
                                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-white/34">
                                                {formatNotificationTime(primaryNotification.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-3">
                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-emerald-200/20 bg-emerald-300/10 text-emerald-100">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-white">All clear</p>
                                            <p className="text-xs leading-relaxed text-white/45">
                                                No urgent alerts or action-center items are waiting.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-auto touch-pan-y [-webkit-overflow-scrolling:touch]">
                            <div className="sticky top-0 z-10 h-4 bg-gradient-to-b from-[#151521]/90 to-transparent pointer-events-none" />

                            {pushSupported && (
                                <div className="-mt-4 border-b border-white/5 bg-white/[0.03] px-4 py-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                                                className="min-h-9 shrink-0 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/15 active:scale-[0.98] disabled:opacity-50"
                                            >
                                                {pushBusy ? 'Working...' : (pushEnabled ? 'Disable' : 'Enable')}
                                            </button>
                                        ) : (
                                            <div className="min-h-9 shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                                                Soon
                                            </div>
                                        )}
                                    </div>
                                    {pushMessage && (
                                        <p className="mt-2 text-[11px] text-cyan-100/80">
                                            {pushMessage}
                                        </p>
                                    )}
                                    {pushEnabled && (
                                        <div className="mt-3 space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {PUSH_TOPIC_LABELS.map((topic) => {
                                                    const active = pushTopics.includes(topic.id);
                                                    return (
                                                        <button
                                                            key={topic.id}
                                                            type="button"
                                                            onClick={() => void togglePushTopic(topic.id)}
                                                            disabled={pushBusy}
                                                            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] transition active:scale-[0.98] ${
                                                                active
                                                                    ? 'border-cyan-300/35 bg-cyan-400/12 text-cyan-100'
                                                                    : 'border-white/10 bg-white/5 text-white/45'
                                                            }`}
                                                        >
                                                            {topic.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/75">
                                                        Device Check
                                                    </p>
                                                    <p className="mt-1 text-[11px] text-white/45">
                                                        Fire one test alert to confirm this browser is receiving pushes.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void sendTestPush()}
                                                    disabled={pushTesting || pushBusy}
                                                    className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/14 active:scale-[0.98] disabled:opacity-50"
                                                >
                                                    {pushTesting ? 'Sending...' : 'Test Push'}
                                                </button>
                                            </div>

                                            {pushTopics.includes('nearby') && (
                                                <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/75">
                                                                Nearby Radius
                                                            </p>
                                                            <p className="mt-1 text-[11px] text-white/45">
                                                                Limit nearby dare alerts to the range that actually feels useful.
                                                            </p>
                                                        </div>
                                                        <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/65">
                                                            {nearbyRadiusKm} km
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {NEARBY_RADIUS_OPTIONS.map((radius) => {
                                                            const active = nearbyRadiusKm === radius;
                                                            return (
                                                                <button
                                                                    key={radius}
                                                                    type="button"
                                                                    onClick={() => void updateNearbyRadius(radius)}
                                                                    disabled={pushBusy}
                                                                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] transition active:scale-[0.98] ${
                                                                        active
                                                                            ? 'border-cyan-300/35 bg-cyan-400/12 text-cyan-100'
                                                                            : 'border-white/10 bg-white/5 text-white/45'
                                                                    }`}
                                                                >
                                                                    {radius} km
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {actionItems.length > 0 && (
                                <div className="border-b border-white/5 bg-white/[0.025] px-3 py-3">
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {(
                                            ['Needs response', 'Ready for proof', 'Under review', 'Payout queued', 'Claim decision', 'Venue lead follow-up'] as const
                                        ).map((category) =>
                                            actionSummary && actionSummary.counts[category] > 0 ? (
                                                <span
                                                    key={category}
                                                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/60"
                                                >
                                                    {category} {actionSummary.counts[category]}
                                                </span>
                                            ) : null
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {actionItems.map((item) => (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                className="block rounded-2xl border border-white/8 bg-black/20 px-3 py-3 transition hover:bg-white/[0.04] active:scale-[0.99]"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100/80">
                                                            {item.category}
                                                        </p>
                                                        <h4 className="mt-2 text-sm font-bold text-white line-clamp-1">
                                                            {item.title}
                                                        </h4>
                                                    </div>
                                                    {item.statusLabel ? (
                                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/52">
                                                            {item.statusLabel}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-2 text-xs leading-relaxed text-gray-400 line-clamp-2">
                                                    {item.detail}
                                                </p>
                                                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-200/85">
                                                    {item.cta}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* List */}
                            <div className="p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                {notifications.length === 0 ? (
                                    <div className="flex min-h-[14rem] flex-col items-center justify-center p-8 text-center">
                                        <BellRing className="w-8 h-8 text-white/20 mb-3" />
                                        <p className="text-sm text-gray-400">
                                            {actionItems.length > 0 ? 'No extra alerts. Focus on the live action queue.' : 'You&apos;re all caught up!'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {notifications.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className="group relative p-3 rounded-xl hover:bg-white/5 active:bg-white/[0.08] active:scale-[0.99] transition cursor-pointer"
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
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
            )}
        </div>
    );
}
