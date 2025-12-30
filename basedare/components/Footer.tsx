'use client';
import React from 'react';
import Link from 'next/link';
import { Twitter, Github, MessageCircle, Zap, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative z-10 bg-black/80 border-t border-purple-500/30 shadow-[0_-4px_20px_rgba(168,85,247,0.1)]">
      <div className="container mx-auto px-6 py-16 relative z-10">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          
          {/* BRAND IDENTITY */}
          <div className="col-span-2 space-y-6">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="w-10 h-10 bg-[#FFD700] rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,215,0,0.3)] group-hover:shadow-[0_0_30px_rgba(255,215,0,0.6)] transition-all">
                <Zap className="w-6 h-6 fill-black" />
              </div>
              <span className="text-3xl font-black italic tracking-tighter text-white">
                BASE<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">DARE</span>
              </span>
            </Link>
            <p className="text-gray-500 font-mono text-sm max-w-sm leading-relaxed">
              The first decentralized attention marketplace. Built on Base L2. 
              We monetize viral chaos through atomic settlement layers.
            </p>
            
            {/* SYSTEM STATUS */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-green-500 bg-green-900/10 border border-green-500/20 px-3 py-1.5 rounded-full w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              PROTOCOL OPERATIONAL v2.0.4
            </div>
          </div>

          {/* NAVIGATION */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" /> Platform
            </h4>
            <ul className="space-y-3">
              {[
                { name: 'Dashboard', path: '/dashboard' },
                { name: 'Create Dare', path: '/create' },
                { name: 'Verify', path: '/verify' },
                { name: 'Leaderboard', path: '/leaderboard' }
              ].map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.path} 
                    className="text-gray-400 hover:text-[#FFD700] transition-colors font-mono text-xs uppercase tracking-wide flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-[1px] bg-[#FFD700] transition-all duration-300" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COMMUNITY */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" /> Network
            </h4>
            <div className="flex gap-3 mb-6">
              {[
                { Icon: Twitter, href: 'https://twitter.com/basedare' },
                { Icon: MessageCircle, href: '#' },
                { Icon: Github, href: '#' }
              ].map(({ Icon, href }, i) => (
                <a 
                  key={i} 
                  href={href} 
                  target={href !== '#' ? '_blank' : undefined}
                  rel={href !== '#' ? 'noopener noreferrer' : undefined}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all group"
                >
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-white transition-colors">
              Documentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* LEGAL ROW */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-gray-600 font-mono uppercase tracking-wider">
          <div>&copy; 2025 BASEDARE PROTOCOL. POWERED BY BASE L2.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-400 transition-colors">Smart Contracts</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Terms of Chaos</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
