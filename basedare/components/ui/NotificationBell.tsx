'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bell, BellRing, Check, ChevronDown, MessageCircle, SlidersHorizontal, Smartphone, X } from 'lucide-react';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useSession } from 'next-auth/react';
import { useSignMessage } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { buildWalletActionAuthHeaders } from '@/lib/wallet-action-auth';
import {
    PUSH_TOPIC_LABELS,
    useWalletPushSubscription,
} from '@/hooks/useWalletPushSubscription';
import { runAfterPageIdle } from '@/lib/client-performance';

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

interface InboxSummaryThread {
    id: string;
    type: string;
    subject: string;
    contextLabel: string;
    counterpartLabel: string;
    unreadCount: number;
    href: string;
    lastMessageAt: string;
    lastMessage: {
        body: string;
        redacted: boolean;
        mine: boolean;
        createdAt: string;
    } | null;
}

interface InboxSummary {
    unreadTotal: number;
    threadCount: number;
    threads: InboxSummaryThread[];
}

export function NotificationBell({ defaultOpen = false }: { defaultOpen?: boolean }) {
    const { address, sessionWallet } = useActiveWallet();
    const { data: session } = useSession();
    const { signMessageAsync } = useSignMessage();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [actionItems, setActionItems] = useState<ActionCenterItem[]>([]);
    const [actionSummary, setActionSummary] = useState<ActionCenterSummary | null>(null);
    const [inboxSummary, setInboxSummary] = useState<InboxSummary | null>(null);
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isHovered, setIsHovered] = useState(false);
    const [showPushControls, setShowPushControls] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const previousAddressRef = useRef<string | null>(null);
    const idleFetchedAddressRef = useRef<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

    const unreadCount = notifications.length;
    const inboxUnreadCount = inboxSummary?.unreadTotal ?? 0;
    const actionCount = actionSummary?.total ?? 0;
    const attentionCount = Math.max(unreadCount + inboxUnreadCount, actionSummary?.total ?? 0);
    const sessionToken = (session as { token?: string | null } | null)?.token ?? null;
    const primaryAction = actionItems[0] ?? null;
    const secondaryActionItems = actionItems.slice(1, 4);
    const primaryNotification = notifications[0] ?? null;
    const {
        disablePushSubscription,
        nearbyRadiusKm,
        pushBusy,
        pushClientConfigured,
        pushConfigured,
        pushDeliveryConfigured,
        pushEnabled,
        pushMessage,
        pushSupported,
        pushTesting,
        pushTopics,
        sendTestPush,
        syncPushSubscription,
        togglePushTopic,
        vapidPublicKey,
    } = useWalletPushSubscription({ enabled: isOpen });
    const pushCanRegister = Boolean(vapidPublicKey && pushClientConfigured);
    const pushCanDeliver = Boolean(pushDeliveryConfigured && pushConfigured);
    const pushDeliveryPending = pushCanRegister && !pushCanDeliver;
    const pushHeadline = !pushSupported
        ? 'Unavailable'
        : pushEnabled
            ? 'On'
            : pushCanRegister
                ? 'Off'
                : 'Setup needed';
    const pushStatusText = !vapidPublicKey || !pushClientConfigured
        ? 'Push browser key is not configured yet.'
        : pushDeliveryPending
            ? pushEnabled
                ? 'This device is saved. Delivery starts when the server key is added.'
                : 'Save this device now. Delivery starts when the server key is added.'
        : pushEnabled
            ? `This device gets BaseDare alerts. Nearby uses ${nearbyRadiusKm} km by default.`
            : 'Enable browser push for nearby and wallet alerts.';

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

    const fetchInboxSummary = useCallback(async (allowSignPrompt = false) => {
        if (!address) return;
        try {
            const headers = await getWalletAuthHeaders('inbox:read', allowSignPrompt);
            const res = await fetch(`/api/inbox/summary?wallet=${address}`, { headers });
            const data = await res.json();
            if (data.success) {
                setInboxSummary(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch inbox summary', err);
        }
    }, [address, getWalletAuthHeaders]);

    // Keep the root shell quiet: load the badge after idle, then hydrate the
    // heavier action center and inbox only when the bell opens.
    useEffect(() => {
        if (!address) {
            previousAddressRef.current = null;
            idleFetchedAddressRef.current = null;
            setNotifications([]);
            setActionItems([]);
            setActionSummary(null);
            setInboxSummary(null);
            return undefined;
        }

        if (previousAddressRef.current !== address) {
            previousAddressRef.current = address;
            idleFetchedAddressRef.current = null;
            setNotifications([]);
            setActionItems([]);
            setActionSummary(null);
            setInboxSummary(null);
        }

        return runAfterPageIdle(() => {
            if (idleFetchedAddressRef.current === address) return;
            idleFetchedAddressRef.current = address;
            void fetchNotifications(false);
        }, 2600);
    }, [address, fetchNotifications]);

    useEffect(() => {
        if (!isOpen || !address) return;
        void fetchNotifications(false);
        void fetchActionCenter();
        void fetchInboxSummary(false);
    }, [address, fetchActionCenter, fetchInboxSummary, fetchNotifications, isOpen]);

    useEffect(() => {
        if (!isOpen || !address) return undefined;

        const intervalId = window.setInterval(() => {
            void fetchNotifications(false);
            void fetchActionCenter();
            void fetchInboxSummary(false);
        }, 60000);

        return () => window.clearInterval(intervalId);
    }, [address, fetchActionCenter, fetchInboxSummary, fetchNotifications, isOpen]);

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

        const handleReposition = () => {
            if (window.innerWidth < 768) return;
            updateDropdownPosition();
        };
        window.addEventListener('resize', handleReposition);
        if (window.innerWidth >= 768) {
            window.addEventListener('scroll', handleReposition, true);
        }

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

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined' || window.innerWidth >= 768) return;

        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'contain';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
        };
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
            {typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        style={dropdownPosition ? { top: dropdownPosition.top, right: dropdownPosition.right } : undefined}
                        className="bd-notification-panel fixed inset-x-2 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[12000] isolate flex h-[calc(100svh-5.25rem)] max-h-[calc(100svh-5.25rem)] w-auto flex-col overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(31,34,45,0.78)_0%,rgba(12,14,24,0.82)_48%,rgba(5,6,13,0.92)_100%)] shadow-[0_34px_110px_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-34px_52px_rgba(0,0,0,0.34)] ring-1 ring-white/[0.04] backdrop-blur-2xl md:inset-x-auto md:right-4 md:top-20 md:h-auto md:max-h-[min(78vh,42rem)] md:w-[27rem] md:rounded-[34px]"
                    >
                        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_-5%,rgba(255,255,255,0.24),transparent_26%),radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.22),transparent_38%),radial-gradient(circle_at_88%_8%,rgba(250,204,21,0.18),transparent_30%),radial-gradient(circle_at_80%_76%,rgba(168,85,247,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_34%)]" />
                        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                        <div className="pointer-events-none absolute left-6 right-16 top-3 h-10 rounded-full bg-white/10 blur-2xl" />
                        {/* Header */}
                        <div className="shrink-0 border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-18px_24px_rgba(0,0,0,0.16)]">
                            <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="text-2xl font-black tracking-[-0.04em] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.55)]">
                                    Notifications
                                </h3>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                                    {actionCount || inboxUnreadCount || unreadCount
                                        ? `${actionCount} actions · ${inboxUnreadCount} chats · ${unreadCount} alerts`
                                        : 'All quiet'}
                                </p>
                            </div>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-black/30 text-white/58 shadow-[0_12px_24px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-white/10 hover:text-white"
                                    aria-label="Close notifications"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <Link
                                    href="/action-center"
                                    className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#f5c518]/28 bg-[linear-gradient(180deg,rgba(255,232,110,0.18)_0%,rgba(80,53,10,0.2)_46%,rgba(7,8,15,0.72)_100%)] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#fff1a6] shadow-[0_14px_26px_rgba(0,0,0,0.24),0_0_22px_rgba(245,197,24,0.08),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-10px_14px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:border-[#f5c518]/42 hover:bg-[#f5c518]/12 active:translate-y-0"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Action center
                                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                </Link>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/10 bg-black/22 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-purple-100/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-colors hover:bg-white/[0.06] hover:text-purple-50"
                                    >
                                        <Check className="h-3.5 w-3.5" /> Clear alerts
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="shrink-0 border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] px-4 py-3">
                            <div className="overflow-hidden rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(0,0,0,0.32))] shadow-[0_18px_34px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-14px_20px_rgba(0,0,0,0.18)]">
                                {primaryAction ? (
                                    <Link
                                        href={primaryAction.href}
                                        className="block p-4 transition hover:bg-white/[0.04]"
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
                                                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/50">
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

                        <div className="bd-notification-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
                            <div className="sticky top-0 z-10 h-4 bg-gradient-to-b from-[#151521]/90 to-transparent pointer-events-none" />

                            {pushSupported && (
                                <div className="-mt-4 border-b border-white/5 bg-[linear-gradient(180deg,rgba(34,211,238,0.07),rgba(255,255,255,0.018))] px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPushControls((current) => !current)}
                                        className="flex w-full items-center gap-3 rounded-[1.35rem] border border-white/8 bg-black/22 px-3 py-3 text-left shadow-[0_14px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:bg-white/[0.045]"
                                        aria-expanded={showPushControls}
                                    >
                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-200/16 bg-cyan-300/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_20px_rgba(0,0,0,0.2)]">
                                            <Smartphone className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/62">
                                                Mobile push
                                            </span>
                                            <span className="mt-1 block truncate text-sm font-black text-white">
                                                {pushEnabled ? 'Alerts are on' : pushCanRegister ? 'Enable browser alerts' : 'Setup needed'}
                                            </span>
                                        </span>
                                        <span className="rounded-full border border-cyan-200/14 bg-cyan-300/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-50/70">
                                            {pushHeadline}
                                        </span>
                                        <ChevronDown
                                            className={`h-4 w-4 shrink-0 text-white/45 transition-transform ${showPushControls ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    {pushMessage && (
                                        <p className="mt-2 px-2 text-[11px] font-bold text-cyan-100/76">
                                            {pushMessage}
                                        </p>
                                    )}
                                    <AnimatePresence initial={false}>
                                        {showPushControls && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-3 space-y-3 rounded-[1.35rem] border border-white/8 bg-black/18 p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="min-w-0 text-xs leading-relaxed text-white/48">
                                                            {pushStatusText}
                                                        </p>
                                                        {vapidPublicKey ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => void (pushEnabled ? disablePushSubscription() : syncPushSubscription())}
                                                                disabled={pushBusy || (!pushEnabled && !pushCanRegister)}
                                                                className="shrink-0 rounded-full border border-cyan-300/24 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-400/15 active:scale-[0.98] disabled:opacity-50"
                                                            >
                                                                {pushBusy ? 'Working' : (pushEnabled ? 'Turn off' : 'Turn on')}
                                                            </button>
                                                        ) : (
                                                            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                                                                Soon
                                                            </span>
                                                        )}
                                                    </div>

                                                    {pushEnabled && (
                                                        <>
                                                            <div className="flex flex-wrap gap-2">
                                                                {PUSH_TOPIC_LABELS.map((topic) => {
                                                                    const active = pushTopics.includes(topic.id);
                                                                    return (
                                                                        <button
                                                                            key={topic.id}
                                                                            type="button"
                                                                            onClick={() => void togglePushTopic(topic.id)}
                                                                            disabled={pushBusy}
                                                                            className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition active:scale-[0.98] ${
                                                                                active
                                                                                    ? 'border-cyan-300/35 bg-cyan-400/12 text-cyan-100'
                                                                                    : 'border-white/10 bg-white/5 text-white/42'
                                                                            }`}
                                                                        >
                                                                            {topic.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            <p className="rounded-[1rem] border border-white/8 bg-white/[0.035] px-3 py-2 text-[11px] font-semibold leading-relaxed text-white/48">
                                                                Nearby alerts use a quiet {nearbyRadiusKm} km radius by default.
                                                            </p>

                                                            <div className="grid gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void sendTestPush()}
                                                                    disabled={pushTesting || pushBusy || !pushCanDeliver}
                                                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/14 active:scale-[0.98] disabled:opacity-50"
                                                                >
                                                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                                                    {pushTesting ? 'Sending' : pushCanDeliver ? 'Test push' : 'Needs keys'}
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            <div className="border-b border-white/5 bg-[linear-gradient(180deg,rgba(16,185,129,0.055),rgba(255,255,255,0.018))] px-3 py-3">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-100/80">
                                            <MessageCircle className="h-3.5 w-3.5" />
                                            Chats
                                            {inboxUnreadCount > 0 ? (
                                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] tracking-[0.08em] text-white">
                                                    {inboxUnreadCount > 9 ? '9+' : inboxUnreadCount}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-400">
                                            Bids, support, venue replies.
                                        </p>
                                    </div>
                                    <Link
                                        href="/chat"
                                        onClick={() => setIsOpen(false)}
                                        className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-300/15"
                                    >
                                        Open
                                    </Link>
                                </div>

                                {inboxSummary?.threads.length ? (
                                    <div className="space-y-2">
                                        {inboxSummary.threads.slice(0, 2).map((thread) => (
                                            <Link
                                                key={thread.id}
                                                href={thread.href}
                                                onClick={() => setIsOpen(false)}
                                                className="block rounded-2xl border border-white/8 bg-black/24 px-3 py-3 transition hover:bg-white/[0.045] active:scale-[0.99]"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="truncate text-sm font-black text-white">
                                                                {thread.subject}
                                                            </h4>
                                                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
                                                                {thread.type === 'SUPPORT' ? 'Support' : thread.type.toLowerCase()}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 line-clamp-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">
                                                            {thread.counterpartLabel}
                                                        </p>
                                                    </div>
                                                    {thread.unreadCount > 0 ? (
                                                        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-2 text-[10px] font-black text-white">
                                                            {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {thread.lastMessage ? (
                                                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-400">
                                                        {thread.lastMessage.mine ? 'You: ' : ''}
                                                        {thread.lastMessage.body}
                                                    </p>
                                                ) : (
                                                    <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                                        No messages yet.
                                                    </p>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                                        <p className="text-sm font-black text-white">No chats yet.</p>
                                        <p className="mt-1 text-xs leading-relaxed text-white/42">
                                            Messages will land here.
                                        </p>
                                    </div>
                                )}

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <Link
                                        href="/chat"
                                        onClick={() => setIsOpen(false)}
                                        className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white/62 transition hover:bg-white/[0.09] hover:text-white"
                                    >
                                        All chats
                                    </Link>
                                    <Link
                                        href="/chat?support=1&subject=BaseDare%20Support"
                                        onClick={() => setIsOpen(false)}
                                        className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100/75 transition hover:bg-yellow-300/15"
                                    >
                                        Start support
                                    </Link>
                                </div>
                            </div>

                            {secondaryActionItems.length > 0 && (
                                <div className="border-b border-white/5 bg-white/[0.025] px-3 py-3">
                                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/46">
                                            Up next
                                        </p>
                                        <Link
                                            href="/action-center"
                                            onClick={() => setIsOpen(false)}
                                            className="text-[10px] font-black uppercase tracking-[0.16em] text-yellow-100/58 transition hover:text-yellow-100"
                                        >
                                            View all
                                        </Link>
                                    </div>
                                    <div className="space-y-2">
                                        {secondaryActionItems.map((item) => (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                className="block rounded-[1.2rem] border border-white/8 bg-black/20 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.075)] transition hover:bg-white/[0.04] active:scale-[0.99]"
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
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* List */}
                            <div className="p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                {notifications.length === 0 ? (
                                    <div className="flex min-h-[9rem] flex-col items-center justify-center p-6 text-center">
                                        <BellRing className="w-8 h-8 text-white/20 mb-3" />
                                        <p className="text-sm text-gray-400">
                                            {actionItems.length > 0 ? 'Nothing else needs you.' : 'All caught up.'}
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
