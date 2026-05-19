'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Loader2, MapPin, Search, Sparkles, Trophy, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import './GlobalSearch.css';

interface SearchResult {
    type: 'place' | 'streamer' | 'dare' | 'action';
    title: string;
    subtitle: string;
    url: string;
    eyebrow?: string;
}

interface SearchResponse {
    places: SearchResult[];
    streamers: SearchResult[];
    dares: SearchResult[];
    actions: SearchResult[];
}

interface GlobalSearchProps {
    defaultOpen?: boolean;
    isDesktopApp?: boolean;
}

export function GlobalSearch({ defaultOpen = false, isDesktopApp = false }: GlobalSearchProps) {
    void isDesktopApp;
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResponse>({ places: [], streamers: [], dares: [], actions: [] });
    const [isLoading, setIsLoading] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Handle Search Debounce
    useEffect(() => {
        if (!query.trim()) {
            setResults({ places: [], streamers: [], dares: [], actions: [] });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                    signal: controller.signal,
                });
                const data = await res.json();

                if (data.success) {
                    setResults({
                        places: data.results?.places ?? [],
                        streamers: data.results?.streamers ?? [],
                        dares: data.results?.dares ?? [],
                        actions: data.results?.actions ?? [],
                    });
                }
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error('Search failed:', err);
            } finally {
                if (controller.signal.aborted) return;
                setIsLoading(false);
            }
        }, 300); // 300ms debounce

        return () => {
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [query]);

    // Handle keyboard shortcut (CMD+K / CTRL+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }

            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const hasResults =
        results.places.length > 0 ||
        results.streamers.length > 0 ||
        results.dares.length > 0 ||
        results.actions.length > 0;
    const hasQuery = query.trim().length > 0;
    const trimmedQuery = query.trim();
    const sections: Array<{
        key: keyof SearchResponse;
        title: string;
        items: SearchResult[];
        icon: React.ComponentType<{ className?: string }>;
    }> = [
        { key: 'places', title: 'Places on the map', items: results.places, icon: MapPin },
        { key: 'actions', title: 'Quick actions', items: results.actions, icon: Sparkles },
        { key: 'streamers', title: 'Creators', items: results.streamers, icon: UserRound },
        { key: 'dares', title: 'Active dares', items: results.dares, icon: Trophy },
    ];

    const renderResults = () => {
        if (!query.trim()) {
            return (
                <div className="p-6 text-center text-sm text-gray-500">
                    Search places, creators, dares, and actions...
                    <div className="mt-2 text-[10px] hidden md:block">Press <kbd className="bg-white/10 px-1 py-0.5 rounded">Cmd + K</kbd> anywhere</div>
                </div>
            );
        }
        if (isLoading) {
            return (
                <div className="p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                </div>
            );
        }
        if (!hasResults) {
            return (
                <div className="p-4">
                    <p className="px-2 pb-3 text-sm text-gray-500">
                        No exact results for &quot;{query}&quot;
                    </p>
                    <Link
                        href={`/map?q=${encodeURIComponent(trimmedQuery)}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-3 text-cyan-50 transition hover:bg-cyan-300/[0.1]"
                    >
                        <MapPin className="h-4 w-4 shrink-0 text-cyan-200" />
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black">Search the map for &quot;{trimmedQuery}&quot;</span>
                            <span className="block text-xs text-cyan-100/54">Open places and nearby intent search</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                    </Link>
                </div>
            );
        }
        return (
            <div className="flex flex-col gap-2">
                {sections.map((section) => {
                    if (section.items.length === 0) return null;
                    const Icon = section.icon;
                    return (
                        <div key={section.key} className="mb-2">
                            <h3 className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                {section.title}
                            </h3>
                            <div className="flex flex-col gap-1">
                                {section.items.map((item, idx) => (
                                    <Link
                                        key={`${section.key}-${idx}-${item.url}`}
                                        href={item.url}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5 active:bg-white/10"
                                    >
                                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-white/62">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold text-white">{item.title}</span>
                                            <span className="block truncate text-xs text-gray-400">{item.subtitle}</span>
                                        </span>
                                        <ArrowRight className="h-4 w-4 shrink-0 text-white/28" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Instead of fixed/absolute overlays that break z-index, the search box expands natively.
    // The dropdown for results hangs directly below it.

    return (
        <div className="relative z-[100] w-full flex justify-end" ref={containerRef}>
            <div className={`searchbox-wrapper ${isOpen ? 'w-[300px] md:w-[400px]' : 'w-10'} transition-all duration-300`}>

                {/* Search Input (Expands) */}
                <div className={`bd-dent-surface bd-dent-surface--soft relative flex items-center h-10 rounded-full border border-white/10 transition-all duration-400 ease-in-out ${isOpen ? 'w-full opacity-100 px-4' : 'w-0 opacity-0 overflow-hidden'
                    }`}>
                    <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search places, creators, dares..."
                        className="w-full bg-transparent border-none py-2 px-3 text-sm text-white focus:outline-none placeholder-gray-500"
                    />
                    {hasQuery && (
                        <button onClick={() => setQuery('')} className="p-1 text-gray-500 hover:text-white flex-shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Search Icon Button (Always visible on the right, turns into Close if open) */}
                <button
                    onClick={() => {
                        if (isOpen) {
                            setIsOpen(false);
                            setQuery('');
                        } else {
                            setIsOpen(true);
                        }
                    }}
                    className={`absolute right-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                        isOpen && hasQuery
                            ? 'opacity-0 pointer-events-none'
                            : isOpen
                                ? 'bg-transparent hover:bg-white/10'
                                : 'bd-dent-surface bd-dent-surface--soft border border-white/10 hover:bg-white/10'
                        }`}
                >
                    {isOpen ? <X className="w-4 h-4 text-white" /> : <Search className="w-4 h-4 text-gray-400 hover:text-white" />}
                </button>
            </div>

            {/* Dropdown Results (Appears below the search box) */}
            {isOpen && (
                <div className="bd-dent-surface bd-dent-surface--soft absolute top-[50px] right-0 w-[calc(100vw-32px)] md:w-[400px] max-w-full border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[70vh] z-[110]">
                    <div className="overflow-y-auto flex-1 p-2">
                        {renderResults()}
                    </div>
                </div>
            )}
        </div>
    );
}
