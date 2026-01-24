'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Loader2, Clock, CheckCircle, Share2 } from "lucide-react";

function shareDareOnX(dare: Dare, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://basedare.xyz';
    const dareUrl = `${baseUrl}/dare/${dare.short_id}`;

    const text = `🎯 $${dare.stake_amount?.toLocaleString() || '0'} USDC bounty on @${dare.streamer_name}

"${dare.description}"

Think they'll do it? 👇

#BaseDare #Base`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(dareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
}

interface Dare {
    id: string;
    description: string;
    stake_amount: number;
    streamer_name: string;
    status: string;
    expires_at: string | null;
    short_id: string;
}

function formatTimeLeft(expiresAt: string | null): string {
    if (!expiresAt) return 'No deadline';
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    return 'Soon';
}

function LiveDareFeed({ dares, loading, error }: { dares: Dare[]; loading: boolean; error: string | null }) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="text-purple-500 animate-spin mb-4" size={48} />
                <p className="text-gray-400">Loading live dares...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    if (dares.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Zap className="text-gray-600 mb-4" size={48} />
                <h2 className="text-2xl font-bold text-white mb-2">No Active Dares</h2>
                <p className="text-gray-400 max-w-md">
                    Be the first to challenge a streamer and start the chaos!
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
            {dares.map((dare) => (
                <Link
                    key={dare.id}
                    href={`/dare/${dare.short_id}`}
                    className="aspect-[7/10] bg-neutral-900 border border-purple-500/30 rounded-2xl flex flex-col justify-end p-4
                               shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_40px_rgba(250,204,21,0.3)]
                               transition-all duration-300 transform hover:scale-[1.02] cursor-pointer group relative overflow-hidden"
                >
                    {/* Share Button */}
                    <button
                        onClick={(e) => shareDareOnX(dare, e)}
                        className="absolute top-3 right-3 z-20 p-2 bg-black/60 hover:bg-black/80 border border-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        title="Share on X"
                    >
                        <Share2 className="w-4 h-4 text-white" />
                    </button>

                    <div className="relative z-10 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="bg-purple-600/50 text-white border-purple-400">
                                ${dare.stake_amount?.toLocaleString() || '0'} USDC
                            </Badge>
                            {dare.status === 'VERIFIED' ? (
                                <Badge variant="secondary" className="bg-green-600/50 text-white border-green-400">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Verified
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-yellow-600/50 text-white border-yellow-400">
                                    <Clock className="w-3 h-3 mr-1" /> {formatTimeLeft(dare.expires_at)}
                                </Badge>
                            )}
                        </div>
                        <h3 className="text-xl font-black text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                            {dare.description}
                        </h3>
                        <p className="text-sm text-gray-400">
                            Target: <span className="text-purple-400">@{dare.streamer_name}</span>
                        </p>
                    </div>

                    {/* Electric Glow Effect */}
                    <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                         style={{
                            background: 'radial-gradient(circle at center, rgba(250, 204, 21, 0.2) 0%, transparent 60%)',
                            filter: 'blur(30px)'
                         }}
                    />
                </Link>
            ))}
        </div>
    );
}

export default function DaresPage() {
    const [dares, setDares] = useState<Dare[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDares() {
            try {
                setLoading(true);
                const res = await fetch('/api/dares');
                if (!res.ok) throw new Error('Failed to fetch dares');
                const data = await res.json();
                setDares(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load dares');
            } finally {
                setLoading(false);
            }
        }

        fetchDares();
    }, []);

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 relative overflow-hidden bg-transparent text-white">

            {/* Background Chaos */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-20 left-0 w-full h-[600px] bg-gradient-to-b from-yellow-900/10 via-black to-black" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
            </div>

            <div className="max-w-7xl mx-auto z-10 space-y-12 relative">

                {/* HERO HEADLINE */}
                <div className="text-center space-y-4 pt-10">
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 font-mono uppercase tracking-widest mb-2">
                        <Zap className="w-3 h-3 mr-1" /> Live Feed
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter leading-none">
                        <span className="block text-white">THE DEGEN</span>
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                            COLOSSEUM
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        View active challenges, fund a bounty, and call the shot. If they don't complete it, you get a full refund.
                    </p>
                </div>

                {/* LIVE POT/CARDS CONTAINER */}
                <div className="relative">
                    <LiveDareFeed dares={dares} loading={loading} error={error} />
                </div>

                {/* CTA FOOTER */}
                <div className="pt-12 text-center">
                    <Link href="/" className="inline-flex items-center">
                        <span className="text-purple-400 text-sm font-mono uppercase tracking-widest hover:text-purple-300 transition-colors">
                            Don&apos;t see a Dare you like?
                        </span>
                        <span className="ml-2 font-black text-yellow-400 hover:text-yellow-300 flex items-center">
                            Create a New Bounty <ArrowRight className="w-4 h-4 ml-1" />
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

