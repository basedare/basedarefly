'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
    ArrowLeft, CheckCircle, ExternalLink, Zap, Clock,
    Heart, TrendingUp, Target, Award, AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';

// Streamer images from existing assets
const STREAMER_IMAGES: Record<string, string> = {
    kaicenat: '/assets/KAICENAT.jpeg',
    'kai cenat': '/assets/KAICENAT.jpeg',
    adinross: '/assets/adinross.png',
    'adin ross': '/assets/adinross.png',
    ishowspeed: '/assets/Ishowspeed.jpg',
    speed: '/assets/Ishowspeed.jpg',
};

interface CreatorStats {
    total: number;
    completed: number;
    live: number;
    acceptRate: number;
    totalPool: number;
    totalEarned: number;
    minBounty: number;
}

interface RecentDare {
    id: string;
    shortId: string;
    title: string;
    bounty: number;
    status: string;
    expiresAt: string | null;
    createdAt: string;
}

interface CreatorProfile {
    handle: string;
    displayHandle: string;
    verified: boolean;
    twitterHandle: string | null;
    twitchHandle: string | null;
    bio: string | null;
    followerCount: number | null;
    tags: string[];
    stats: CreatorStats;
    recent: RecentDare[];
}

const raisedPanelClass =
    'relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';

const softCardClass =
    'relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.92)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]';

const insetCardClass =
    'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

const sectionLabelClass =
    'inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]';

const pillClass =
    'inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(11,11,18,0.94)_100%)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-300 shadow-[0_12px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]';

function getStatusStyle(status: string) {
    const s = status?.toUpperCase();
    if (s === 'VERIFIED') return 'bg-green-500/15 text-green-400 border-green-500/30';
    if (s === 'EXPIRED' || s === 'FAILED') return 'bg-gray-500/15 text-gray-400 border-gray-400/30';
    if (s === 'PENDING_REVIEW') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/15 text-red-400 border-red-500/30';
}

function getStatusLabel(status: string) {
    const s = status?.toUpperCase();
    if (s === 'VERIFIED') return 'DONE';
    if (s === 'EXPIRED') return 'EXPIRED';
    return 'LIVE';
}

function DareMiniCard({ dare }: { dare: RecentDare }) {
    const router = useRouter();
    const isExpired = dare.status?.toUpperCase() === 'EXPIRED' ||
        (dare.expiresAt && new Date(dare.expiresAt) < new Date());

    return (
        <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            onClick={() => router.push(`/dare/${dare.shortId}`)}
            className={`group cursor-pointer p-3 sm:p-4 rounded-[22px] border transition-all ${insetCardClass} ${isExpired ? 'opacity-55 border-white/[0.05]' : 'hover:border-fuchsia-400/20 hover:shadow-[0_0_0_1px_rgba(217,70,239,0.08),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26),0_16px_28px_rgba(0,0,0,0.18)]'}`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${getStatusStyle(dare.status)}`}>
                    {getStatusLabel(dare.status)}
                </span>
                <span className="text-xs font-black text-green-400">${dare.bounty.toLocaleString()}</span>
            </div>
            <p className="text-xs font-bold text-white/80 leading-tight line-clamp-2 italic uppercase transition-colors group-hover:text-white">{dare.title}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[10px] text-white/30 font-mono">
                    {formatDistanceToNow(new Date(dare.createdAt), { addSuffix: true })}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 transition-colors group-hover:text-fuchsia-200/80">
                    Open
                </span>
            </div>
        </motion.div>
    );
}

function ProfileSkeleton() {
    return (
        <div className="animate-pulse max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-20 space-y-6 relative z-20">
            <div className={`${raisedPanelClass} px-6 py-8 sm:px-8 sm:py-10`}>
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white/10" />
                    <div className="space-y-2 flex-1">
                        <div className="h-6 bg-white/10 rounded w-1/3" />
                        <div className="h-4 bg-white/10 rounded w-1/4" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => <div key={i} className={`${softCardClass} h-20`} />)}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => <div key={i} className={`${softCardClass} h-24`} />)}
            </div>
        </div>
    );
}

export default function CreatorProfilePage() {
    const params = useParams();
    const router = useRouter();
    const tag = params.tag as string;

    const [profile, setProfile] = useState<CreatorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const displayTag = tag.startsWith('@') ? tag : `@${tag}`;
    const plainTag = tag.replace('@', '').toLowerCase();
    const avatarImg = STREAMER_IMAGES[plainTag] || null;

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/creator/${encodeURIComponent(tag)}`);
                const data = await res.json();
                if (res.ok && data.success) {
                    setProfile(data.data);
                } else if (res.status === 404) {
                    // No creator record or dares found — show an empty profile instead of a hard error.
                    setProfile({
                        handle: displayTag,
                        displayHandle: displayTag,
                        verified: false,
                        twitterHandle: null,
                        twitchHandle: null,
                        bio: null,
                        followerCount: null,
                        tags: [],
                        stats: { total: 0, completed: 0, live: 0, acceptRate: 0, totalPool: 0, totalEarned: 0, minBounty: 0 },
                        recent: [],
                    });
                } else {
                    throw new Error(data?.error || 'Failed to load creator profile');
                }
            } catch {
                setError('Failed to load creator profile');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [tag, displayTag]);

    if (loading) return (
        <main className="min-h-screen bg-transparent text-white">
            <LiquidBackground />
            <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
                <GradualBlurOverlay />
            </div>
            <ProfileSkeleton />
        </main>
    );

    if (error) return (
        <main className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center gap-6 px-6">
            <LiquidBackground />
            <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
                <GradualBlurOverlay />
            </div>
            <div className={`${softCardClass} relative z-20 max-w-md p-8 text-center`}>
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h1 className="text-2xl font-black text-white mb-2">Creator Not Found</h1>
                <button onClick={() => router.back()} className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-colors">
                    ← Go Back
                </button>
            </div>
        </main>
    );

    const stats = profile?.stats;

    return (
        <main className="min-h-screen bg-transparent text-white pb-24">
            <LiquidBackground />
            <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
                <GradualBlurOverlay />
            </div>
            <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 pt-6 md:pt-8 space-y-6">
                <div className={`${raisedPanelClass} px-5 py-6 sm:px-8 sm:py-8`}>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />

                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => router.back()}
                                    className={`${pillClass} transition-all duration-300 hover:-translate-x-[2px] hover:border-fuchsia-400/30 hover:text-white`}
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Back
                                </button>
                                <div className={sectionLabelClass}>
                                    <Heart className="w-4 h-4 text-fuchsia-300" />
                                    CREATOR SIGNAL
                                </div>
                            </div>
                            <Link
                                href="/streamers"
                                className={`${pillClass} transition-all duration-300 hover:border-cyan-400/30 hover:text-white`}
                            >
                                All Creators
                            </Link>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                                <div className="relative flex-shrink-0">
                                    {avatarImg ? (
                                        <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border border-white/15 shadow-[0_18px_28px_rgba(0,0,0,0.28),0_0_24px_rgba(168,85,247,0.08)]">
                                            <Image
                                                src={avatarImg}
                                                alt={displayTag}
                                                fill
                                                sizes="112px"
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-purple-600 via-yellow-500 to-red-500 flex items-center justify-center text-4xl font-black text-white shadow-[0_18px_28px_rgba(0,0,0,0.28),0_0_24px_rgba(168,85,247,0.08)] border border-white/10">
                                            {plainTag.slice(0, 1).toUpperCase()}
                                        </div>
                                    )}
                                    {profile?.verified && (
                                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-500 border-2 border-black flex items-center justify-center shadow-[0_10px_18px_rgba(0,0,0,0.25)]">
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">{displayTag}</h1>
                                        {profile?.verified && (
                                            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 uppercase tracking-[0.18em]">
                                                Verified
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5 mt-3">
                                        {profile?.twitterHandle && (
                                            <a
                                                href={`https://twitter.com/${profile.twitterHandle}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`${pillClass} normal-case tracking-normal text-xs hover:text-cyan-200 transition-colors`}
                                            >
                                                𝕏 @{profile.twitterHandle}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        {profile?.twitchHandle && (
                                            <a
                                                href={`https://twitch.tv/${profile.twitchHandle}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`${pillClass} normal-case tracking-normal text-xs hover:text-purple-200 transition-colors`}
                                            >
                                                Twitch {profile.twitchHandle}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        {typeof profile?.followerCount === 'number' && (
                                            <span className={`${pillClass} normal-case tracking-normal text-xs text-white/60`}>
                                                {(profile.followerCount || 0).toLocaleString()} followers
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-white/68">
                                        {profile?.bio || `${displayTag} is live on BaseDare. Browse the current signal, recent dares, and creator momentum from the protocol.`}
                                    </p>

                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                        {(profile?.tags || []).slice(0, 5).map((t) => (
                                            <span key={t} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.09] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                                #{t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className={`${softCardClass} p-4 sm:p-5`}>
                                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                                <p className="text-[10px] uppercase tracking-[0.28em] text-white/35 font-black">Quick Read</p>
                                <div className="mt-4 space-y-3">
                                    <div className={`${insetCardClass} px-4 py-3`}>
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/30 font-black">Live Now</p>
                                        <p className="mt-1 text-2xl font-black text-red-400">{stats?.live ?? 0}</p>
                                    </div>
                                    <div className={`${insetCardClass} px-4 py-3`}>
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/30 font-black">Accept Rate</p>
                                        <p className="mt-1 text-2xl font-black text-yellow-400">{stats?.acceptRate ?? 0}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <motion.div whileHover={{ scale: 1.005 }} className="relative group p-[1.5px] rounded-[26px] overflow-hidden">
                    <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#737373_20%,#fff_25%,#737373_30%,#1a1a1a_50%,#737373_70%,#fff_75%,#737373_80%,#1a1a1a_100%)] group-hover:animate-[spin_3s_linear_infinite] transition-all duration-500" aria-hidden="true" />
                    <button
                        onClick={() => router.push(`/create?streamer=${encodeURIComponent(displayTag)}`)}
                        className="relative w-full flex flex-col items-start justify-between gap-4 rounded-[24px] bg-[linear-gradient(180deg,rgba(7,7,10,0.98)_0%,rgba(3,3,5,1)_100%)] px-6 py-5 text-white transition-colors sm:flex-row sm:items-center"
                    >
                        <div className="text-left">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/35 font-black">Direct Challenge</p>
                            <div className="mt-2 flex items-center gap-3">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                <span className="font-black italic uppercase tracking-wider text-sm sm:text-base">Dare {displayTag}</span>
                            </div>
                        </div>
                        <span className="text-yellow-400 font-mono text-xs font-bold whitespace-nowrap">
                            {stats && stats.minBounty > 0 ? `min ${stats.minBounty} USDC` : 'protocol live'}
                        </span>
                    </button>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { icon: Target, label: 'Total Dares', value: stats?.total ?? 0, color: 'text-white' },
                        { icon: Award, label: 'Completed', value: stats?.completed ?? 0, color: 'text-green-400' },
                        { icon: TrendingUp, label: 'Accept Rate', value: `${stats?.acceptRate ?? 0}%`, color: 'text-yellow-400' },
                        { icon: Heart, label: 'Live Now', value: stats?.live ?? 0, color: 'text-red-400' },
                    ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className={`${softCardClass} p-4 flex flex-col gap-1.5`}>
                            <Icon className={`w-4 h-4 ${color} mb-0.5`} />
                            <span className={`text-2xl font-black ${color}`}>{value}</span>
                            <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">{label}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className={`${softCardClass} p-5`}>
                        <p className="text-[10px] text-green-500/60 uppercase tracking-wider font-bold mb-1">Total Pool</p>
                        <p className="text-xl font-black text-green-400">${(stats?.totalPool ?? 0).toLocaleString()} <span className="text-xs text-green-600">USDC</span></p>
                    </div>
                    <div className={`${softCardClass} p-5`}>
                        <p className="text-[10px] text-purple-500/60 uppercase tracking-wider font-bold mb-1">Total Earned</p>
                        <p className="text-xl font-black text-purple-400">${(stats?.totalEarned ?? 0).toLocaleString()} <span className="text-xs text-purple-600">USDC</span></p>
                    </div>
                </div>

                <div className={`${softCardClass} p-5 sm:p-6`}>
                    <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" /> Recent Dares
                        </h2>
                        <span className={`${pillClass} text-[10px] tracking-[0.2em] text-white/45`}>
                            {(profile?.recent || []).length} logged
                        </span>
                    </div>

                    {(!profile?.recent || profile.recent.length === 0) ? (
                        <div className={`${insetCardClass} py-12 px-6 text-center text-white/25`}>
                            <p className="text-sm font-bold">No dares yet</p>
                            <p className="text-xs mt-1">Be the first to dare {displayTag}!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {profile.recent.map(dare => (
                                <DareMiniCard key={dare.id} dare={dare} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-2 text-center">
                    <Link href="/streamers" className="text-xs text-white/30 hover:text-white/60 transition-colors font-mono">
                        ← Back to creators
                    </Link>
                </div>
            </div>
        </main>
    );
}
