'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    ArrowLeft, CheckCircle, ExternalLink, Zap, Clock,
    Heart, TrendingUp, Target, Award, Loader2, AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

const CREATOR_TAGS = ['#IRL', '#Gambling', '#Gaming', '#Food', '#Sports', '#Music', '#React'];

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
    stats: CreatorStats;
    recent: RecentDare[];
}

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
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push(`/dare/${dare.shortId}`)}
            className={`cursor-pointer p-3 rounded-xl border bg-white/[0.03] hover:bg-white/[0.06] transition-all ${isExpired ? 'opacity-50 border-white/[0.05]' : 'border-white/[0.08]'}`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${getStatusStyle(dare.status)}`}>
                    {getStatusLabel(dare.status)}
                </span>
                <span className="text-xs font-black text-green-400">${dare.bounty.toLocaleString()}</span>
            </div>
            <p className="text-xs font-bold text-white/80 leading-tight line-clamp-2 italic uppercase">{dare.title}</p>
            <p className="text-[10px] text-white/30 mt-1.5 font-mono">
                {formatDistanceToNow(new Date(dare.createdAt), { addSuffix: true })}
            </p>
        </motion.div>
    );
}

function ProfileSkeleton() {
    return (
        <div className="animate-pulse max-w-3xl mx-auto px-4 pt-24 space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-white/10" />
                <div className="space-y-2 flex-1">
                    <div className="h-6 bg-white/10 rounded w-1/3" />
                    <div className="h-4 bg-white/10 rounded w-1/4" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl" />)}
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
                const res = await fetch(`/api/creator/${tag}`);
                const data = await res.json();
                if (data.success) {
                    setProfile(data.data);
                } else {
                    // No dares found — show empty profile (creator may exist but have no dares yet)
                    setProfile({
                        handle: displayTag,
                        displayHandle: displayTag,
                        verified: false,
                        twitterHandle: null,
                        twitchHandle: null,
                        stats: { total: 0, completed: 0, live: 0, acceptRate: 0, totalPool: 0, totalEarned: 0, minBounty: 0 },
                        recent: [],
                    });
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
        <main className="min-h-screen bg-black">
            <LiquidBackground />
            <ProfileSkeleton />
        </main>
    );

    if (error) return (
        <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-6">
            <LiquidBackground />
            <div className="relative z-10 text-center">
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
        <main className="min-h-screen bg-black text-white pb-24">
            <LiquidBackground />

            {/* Top nav */}
            <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/[0.06]">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-black text-white">{displayTag}</span>
                {profile?.verified && <CheckCircle className="w-4 h-4 text-blue-400" />}
            </div>

            <div className="relative z-10 max-w-3xl mx-auto px-4 pt-20 space-y-6">

                {/* ── HEADER ── */}
                <div className="flex items-end gap-5 pt-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        {avatarImg ? (
                            <img
                                src={avatarImg}
                                alt={displayTag}
                                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-white/10 shadow-2xl"
                            />
                        ) : (
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-600 via-yellow-500 to-red-500 flex items-center justify-center text-3xl font-black text-white shadow-2xl">
                                {plainTag.slice(0, 1).toUpperCase()}
                            </div>
                        )}
                        {profile?.verified && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 border-2 border-black flex items-center justify-center">
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Name + links */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl md:text-3xl font-black text-white">{displayTag}</h1>
                            {profile?.verified && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 uppercase tracking-wider">
                                    Verified
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                            {profile?.twitterHandle && (
                                <a href={`https://twitter.com/${profile.twitterHandle}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-white/40 hover:text-blue-400 transition-colors">
                                    𝕏 @{profile.twitterHandle}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            )}
                            {profile?.twitchHandle && (
                                <a href={`https://twitch.tv/${profile.twitchHandle}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-white/40 hover:text-purple-400 transition-colors">
                                    🎮 {profile.twitchHandle}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {CREATOR_TAGS.slice(0, 4).map(t => (
                                <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/40">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── DARE THIS CREATOR CTA ── */}
                <motion.div whileHover={{ scale: 1.01 }} className="relative group p-[1.5px] rounded-2xl overflow-hidden">
                    {/* Spinning border on hover */}
                    <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#1a1a1a_0%,#737373_20%,#fff_25%,#737373_30%,#1a1a1a_50%,#737373_70%,#fff_75%,#737373_80%,#1a1a1a_100%)] group-hover:animate-[spin_3s_linear_infinite] transition-all duration-500" aria-hidden="true" />
                    <button
                        onClick={() => router.push(`/create?streamer=${encodeURIComponent(displayTag)}`)}
                        className="relative w-full flex items-center justify-center gap-3 bg-[#050505] px-6 py-4 rounded-[14px] text-white font-black italic uppercase tracking-wider text-sm hover:bg-[#0a0a0a] transition-colors"
                    >
                        <Zap className="w-4 h-4 text-yellow-400" />
                        Dare {displayTag}
                        <span className="text-yellow-400 font-mono text-xs normal-case not-italic font-bold ml-1">
                            {stats && stats.minBounty > 0 ? `(min ${stats.minBounty} USDC)` : ''}
                        </span>
                    </button>
                </motion.div>

                {/* ── STATS GRID ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { icon: Target, label: 'Total Dares', value: stats?.total ?? 0, color: 'text-white' },
                        { icon: Award, label: 'Completed', value: stats?.completed ?? 0, color: 'text-green-400' },
                        { icon: TrendingUp, label: 'Accept Rate', value: `${stats?.acceptRate ?? 0}%`, color: 'text-yellow-400' },
                        { icon: Heart, label: 'Live Now', value: stats?.live ?? 0, color: 'text-red-400' },
                    ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-1">
                            <Icon className={`w-4 h-4 ${color} mb-0.5`} />
                            <span className={`text-2xl font-black ${color}`}>{value}</span>
                            <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Pool earnings */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-green-500/[0.06] border border-green-500/[0.12]">
                        <p className="text-[10px] text-green-500/60 uppercase tracking-wider font-bold mb-1">Total Pool</p>
                        <p className="text-xl font-black text-green-400">${(stats?.totalPool ?? 0).toLocaleString()} <span className="text-xs text-green-600">USDC</span></p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/[0.06] border border-purple-500/[0.12]">
                        <p className="text-[10px] text-purple-500/60 uppercase tracking-wider font-bold mb-1">Total Earned</p>
                        <p className="text-xl font-black text-purple-400">${(stats?.totalEarned ?? 0).toLocaleString()} <span className="text-xs text-purple-600">USDC</span></p>
                    </div>
                </div>

                {/* ── RECENT DARES GRID ── */}
                <div>
                    <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> Recent Dares
                    </h2>

                    {(!profile?.recent || profile.recent.length === 0) ? (
                        <div className="text-center py-12 text-white/20">
                            <p className="text-sm font-bold">No dares yet</p>
                            <p className="text-xs mt-1">Be the first to dare {displayTag}!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {profile.recent.map(dare => (
                                <DareMiniCard key={dare.id} dare={dare} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Back to all dares */}
                <div className="pt-4 text-center">
                    <Link href="/" className="text-xs text-white/25 hover:text-white/50 transition-colors font-mono">
                        ← All Active Bounties
                    </Link>
                </div>
            </div>
        </main>
    );
}
