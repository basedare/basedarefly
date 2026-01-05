'use client';

import React from 'react';
import { Twitter, Shield, FileText, Activity, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full relative z-50 overflow-hidden">
      {/* LIQUID GLASS BACKDROP - Matching Navbar style */}
      <div 
        className="absolute inset-0 glass-surface glass-surface--fallback"
        style={{
          '--glass-frost': '0.02',
          '--glass-saturation': '1.8',
        } as React.CSSProperties}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-12 shadow-2xl"
             style={{
               boxShadow: '0 8px 32px rgba(0,0,0,0.37), inset 0 2px 20px rgba(255,255,255,0.05)',
               background: 'rgba(255,255,255,0.03)'
             }}>
          
          <div className="grid md:grid-cols-4 gap-12 text-center md:text-left">
            
            {/* COL 1: LOGO + IDENTITY */}
            <div className="col-span-1 md:col-span-2">
              {/* BASEDDARE LOGO - Image */}
              <div className="mb-6">
                <img 
                  src="/assets/basedare-logo.png" 
                  alt="BaseDare" 
                  className="h-32 md:h-40 w-auto mb-4 drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]"
                />
                <p className="text-xs text-gray-500 font-mono leading-relaxed max-w-sm mt-3">
                  The decentralized protocol for verifiable social chaos. 
                  Smart contract settlement on Base L2. 
                  <br /><span className="text-purple-500/50">Code is Law. Dares are Forever.</span>
                </p>
              </div>
              
              {/* SYSTEM STATUS */}
              <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-green-900/10 border border-green-500/20 rounded-full">
                <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 bg-green-500 rounded-full blur animate-ping" />
                </div>
                <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest">
                  BASE MAINNET: ONLINE
                </span>
              </div>
            </div>

            {/* COL 2: CONNECT */}
            <div>
               <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6 border-l-2 border-purple-500 pl-3">
                 Connect
               </h3>
               <a 
                  href="https://x.com/basedare_xyz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 text-gray-400 hover:text-[#1DA1F2] transition-colors mb-4"
               >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[#1DA1F2] transition-colors">
                    <Twitter className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono uppercase tracking-wider">Twitter / X</span>
               </a>
               <a 
                  href="#" 
                  className="group flex items-center gap-3 text-gray-400 hover:text-[#5865F2] transition-colors"
               >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[#5865F2] transition-colors">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono uppercase tracking-wider">Discord</span>
               </a>
            </div>

            {/* COL 3: LEGAL */}
            <div>
               <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6 border-l-2 border-[#FFD700] pl-3">
                 Legal
               </h3>
               <ul className="space-y-4">
                 <li>
                   <Link href="/faq" className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-purple-400 transition-colors uppercase tracking-wider group">
                      <HelpCircle className="w-3 h-3 group-hover:text-purple-400" />
                      FAQ
                   </Link>
                 </li>
                 <li>
                   <Link href="/terms" className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-[#FFD700] transition-colors uppercase tracking-wider group">
                      <FileText className="w-3 h-3 group-hover:text-[#FFD700]" />
                      Terms of Chaos
                   </Link>
                 </li>
                 <li>
                   <Link href="/privacy" className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-cyan-400 transition-colors uppercase tracking-wider group">
                      <Shield className="w-3 h-3 group-hover:text-cyan-400" />
                      Privacy Policy
                   </Link>
                 </li>
               </ul>
            </div>
          </div>

          {/* COPYRIGHT — TINY & ELEGANT */}
          <div className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-gray-500 text-sm">
              © 2026 BaseDare Protocol Labs. Built by degens who actually deliver.
            </p>
            
            <div className="mt-6 flex justify-center gap-8 text-gray-400 text-xs">
              <Link href="/terms" className="hover:text-yellow-400 transition">
                Terms & Conditions
              </Link>
              <span className="text-white/30">•</span>
              <Link href="/privacy" className="hover:text-yellow-400 transition">
                Privacy Policy
              </Link>
            </div>

            <div className="mt-4 text-right">
              <a 
                href="https://x.com/basedare_xyz" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#00ff41] hover:text-[#00ff41]/80 transition"
                style={{ textShadow: '0 0 10px rgba(0, 255, 65, 0.5)' }}
              >
                Questions? DM @basedare on X · Built on Base ⚡
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
