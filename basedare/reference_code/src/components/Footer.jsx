import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Footer() {
  return (
    <footer className="relative mt-32 overflow-hidden bg-gradient-to-t from-black via-black/40 to-transparent" style={{ zIndex: 10 }}>
      {/* LIQUID GLASS BACKDROP */}
      <div className="absolute inset-0 -z-10"
           style={{
             background: 'radial-gradient(ellipse at bottom, rgba(138,43,226,0.15) 0%, transparent 70%)',
             backdropFilter: 'blur(40px)',
             WebkitBackdropFilter: 'blur(40px)'
           }} />

      {/* FROSTED GLASS CARD */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-12 shadow-2xl"
             style={{
               boxShadow: '0 8px 32px rgba(0,0,0,0.37), inset 0 2px 20px rgba(255,255,255,0.05)',
               background: 'rgba(255,255,255,0.03)'
             }}>
          
          <div className="grid md:grid-cols-4 gap-12 text-center md:text-left">
            {/* LOGO + TAGLINE */}
            <div>
              <h3 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                BASEDARE
              </h3>
              <p className="mt-3 text-gray-400 text-lg">
                Dare or Drink The Bag™
              </p>
            </div>

            {/* LINKS */}
            <div>
              <h4 className="text-xl font-bold text-white mb-4">App</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to={createPageUrl("Home")} className="hover:text-yellow-400 transition">Home</Link></li>
                <li><Link to={createPageUrl("Leaderboard")} className="hover:text-yellow-400 transition">Leaderboard</Link></li>
                <li><Link to={createPageUrl("CreateDare")} className="hover:text-yellow-400 transition">Create Dare</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xl font-bold text-white mb-4">Community</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="https://twitter.com/basedare" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">Twitter</a></li>
                <li><a href="https://t.me/basedare" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">Telegram</a></li>
                <li><Link to={createPageUrl("About")} className="hover:text-yellow-400 transition">The Piss Story</Link></li>
              </ul>
            </div>

            {/* LIVE POT TEASER */}
            <div className="text-center md:text-right">
              <p className="text-5xl font-black text-yellow-400">$86,227</p>
              <p className="text-gray-400 mt-2">TOTAL BOUNTY POT</p>
              <p className="text-red-500 text-sm mt-4 animate-pulse font-bold">
                FAROKH: 21h 12m LEFT
              </p>
            </div>
          </div>

          {/* COPYRIGHT — TINY & ELEGANT */}
          <div className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-gray-500 text-sm">
              © 2025 BASEDARE. Built by degens who actually deliver.
            </p>
            
            <div className="mt-6 flex justify-center gap-8 text-gray-400 text-xs">
              <Link to={createPageUrl("Terms")} className="hover:text-yellow-400 transition">
                Terms & Conditions
              </Link>
              <span className="text-white/30">•</span>
              <Link to={createPageUrl("Privacy")} className="hover:text-yellow-400 transition">
                Privacy Policy
              </Link>
            </div>

            <div className="mt-4 text-right">
              <a 
                href="https://twitter.com/basedare" 
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