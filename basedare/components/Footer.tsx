'use client';

import React from 'react';
import { Twitter, Shield, FileText, HelpCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { useView } from '@/app/context/ViewContext';

export default function Footer() {
  const { isControlMode } = useView();

  return (
    <footer id="site-footer" className="w-full relative z-50 overflow-hidden">
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
              {/* BASEDDARE LOGO - Image with noir filter in Control mode */}
              <div className="mb-6">
                <img
                  src="/assets/BASEDAREGOO.png"
                  alt="BaseDare"
                  className={`h-10 max-h-[40px] w-auto mb-4 object-contain md:h-[56px] md:max-h-none transition-all duration-500 ${
                    isControlMode
                      ? 'drop-shadow-[0_0_30px_rgba(100,100,100,0.4)]'
                      : 'drop-shadow-[0_0_30px_rgba(255,215,0,0.4)]'
                  }`}
                  style={{
                    filter: isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95)' : undefined,
                    WebkitFilter: isControlMode ? 'grayscale(1) contrast(1.1) brightness(0.95)' : undefined,
                  }}
                />
                <p className="text-xs text-gray-500 font-mono leading-relaxed max-w-sm mt-3">
                  The decentralized protocol for verifiable social chaos. 
                  Smart contract settlement on Base L2. 
                  <br /><span className="text-purple-500/50">Code is Law. Dares are Forever.</span>
                </p>
              </div>
              
              {/* WAITLIST BUTTON */}
              <div className="mt-6">
                <Link 
                  href="/waitlist"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-black italic uppercase rounded-xl hover:bg-purple-400 transition-all transform hover:scale-105 active:scale-[0.98] tracking-tighter text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                >
                  <span>Enter the Vault</span>
                  <span className="text-purple-600">→</span>
                </Link>
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
                   <Link href="/about" className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-emerald-400 transition-colors uppercase tracking-wider group">
                      <Info className="w-3 h-3 group-hover:text-emerald-400" />
                      About
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
                className="text-xs text-zinc-700 hover:text-zinc-900 transition"
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
