'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import './GlobalSearch.css';

interface SearchResult {
    type: 'streamer' | 'dare';
    title: string;
    subtitle: string;
    url: string;
}

interface SearchResponse {
    streamers: SearchResult[];
    dares: SearchResult[];
}

interface GlobalSearchProps {
    isDesktopApp?: boolean;
}

export function GlobalSearch({ isDesktopApp = false }: GlobalSearchProps) {
    void isDesktopApp;
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResponse>({ streamers: [], dares: [] });
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
            setResults({ streamers: [], dares: [] });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const timeoutId = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();

                if (data.success) {
                    setResults(data.results);
                }
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setIsLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
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

    const hasResults = results.streamers.length > 0 || results.dares.length > 0;

    const renderResults = () => {
        if (!query.trim()) {
            return (
                <div className="p-6 text-center text-sm text-gray-500">
                    Type to search creators and bounties...
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
                <div className="p-6 text-center text-sm text-gray-500">
                    No results found for &quot;{query}&quot;
                </div>
            );
        }
        return (
            <div className="flex flex-col gap-2">
                {results.streamers.length > 0 && (
                    <div className="mb-2">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-3 py-1">Creators</h3>
                        <div className="flex flex-col gap-1">
                            {results.streamers.map((s, idx) => (
                                <Link key={`s-${idx}`} href={s.url} onClick={() => setIsOpen(false)}
                                    className="flex flex-col px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors">
                                    <span className="text-sm font-bold text-white">{s.title}</span>
                                    <span className="text-xs text-gray-400">{s.subtitle}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                {results.dares.length > 0 && (
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-3 py-1">Active Dares</h3>
                        <div className="flex flex-col gap-1">
                            {results.dares.map((d, idx) => (
                                <Link key={`d-${idx}`} href={d.url} onClick={() => setIsOpen(false)}
                                    className="flex flex-col px-3 py-2.5 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors">
                                    <span className="text-sm font-bold text-white truncate">{d.title}</span>
                                    <span className="text-xs text-purple-400">{d.subtitle}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Instead of fixed/absolute overlays that break z-index, the search box expands natively.
    // The dropdown for results hangs directly below it.

    return (
        <div className="relative z-[100] w-full flex justify-end" ref={containerRef}>
            <div className={`searchbox-wrapper ${isOpen ? 'w-[300px] md:w-[400px]' : 'w-10'} transition-all duration-300`}>

                {/* Search Input (Expands) */}
                <div className={`relative flex items-center h-10 transition-all duration-400 ease-in-out ${isOpen ? 'w-full opacity-100 bg-black/50 backdrop-blur-xl border border-white/20 rounded-full px-4' : 'w-0 opacity-0 overflow-hidden'
                    }`}>
                    <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search creators or dares..."
                        className="w-full bg-transparent border-none py-2 px-3 text-sm text-white focus:outline-none placeholder-gray-500"
                    />
                    {query && (
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
                    className={`absolute right-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isOpen ? 'bg-transparent hover:bg-white/10' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        }`}
                >
                    {isOpen ? <X className="w-4 h-4 text-white" /> : <Search className="w-4 h-4 text-gray-400 hover:text-white" />}
                </button>
            </div>

            {/* Dropdown Results (Appears below the search box) */}
            {isOpen && (
                <div className="absolute top-[50px] right-0 w-[calc(100vw-32px)] md:w-[400px] max-w-full bg-[#121214]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] z-[110]">
                    <div className="overflow-y-auto flex-1 p-2">
                        {renderResults()}
                    </div>
                </div>
            )}
        </div>
    );
}
