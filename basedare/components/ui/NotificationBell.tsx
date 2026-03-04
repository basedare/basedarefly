'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
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
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.length;

    const fetchNotifications = async () => {
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
    };

    // Polling every 30s
    useEffect(() => {
        if (address) {
            fetchNotifications();
            const intervalId = setInterval(fetchNotifications, 30000);
            return () => clearInterval(intervalId);
        } else {
            setNotifications([]);
        }
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

                        {/* List */}
                        <div className="overflow-y-auto flex-1 p-2">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <Bell className="w-8 h-8 text-white/20 mb-3" />
                                    <p className="text-sm text-gray-400">You're all caught up!</p>
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
