'use client';

// components/FuelTheRocket.tsx
export function FuelTheRocket() {
  const donationAddress = "0x60952546f6C6F092CA4866fC7cf6bf12269D002f";

  return (
    <div className="mt-12 mx-auto max-w-4xl relative">
      {/* Glassmorphic container */}
      <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Glassmorphic overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/[0.03] via-transparent to-purple-500/[0.03] pointer-events-none" />

        <div className="relative p-8 text-center">
          <h3 className="text-2xl font-bold text-[#FFD700]">
            Back the Mission <span className="inline-block animate-bounce text-3xl ml-1">🚀</span>
          </h3>
          <p className="mt-3 text-gray-300">
            One dev. Zero VCs. Pure chaos.
            <br />
            <span className="text-white/50">If you believe in what we're building, this is how you get in early.</span>
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="font-mono text-base md:text-lg text-purple-300/80 break-all px-4 py-2 bg-white/5 rounded-xl border border-white/5">
              {donationAddress}
            </div>
            <p className="text-sm text-gray-400">ETH / Base / USDC (same address)</p>

            {/* Liquid Metal Copy Button */}
            <div className="relative group p-[1.5px] rounded-xl overflow-hidden">
              <div
                className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#78350f_0%,#facc15_25%,#78350f_50%,#facc15_75%,#78350f_100%)] animate-[spin_3s_linear_infinite] opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                aria-hidden="true"
              />
              <button
                onClick={() => navigator.clipboard.writeText(donationAddress)}
                className="relative flex items-center justify-center bg-[#050505] backdrop-blur-xl px-6 py-2.5 rounded-[10px] font-bold text-yellow-400 uppercase tracking-wider text-sm transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-transparent to-yellow-500/5 pointer-events-none rounded-[10px]" />
                <span className="relative z-10">Copy Address</span>
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Early Supporter Perks</p>
            <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-400">
              <span className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full backdrop-blur-sm">🏷️ Genesis Tag Priority</span>
              <span className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full backdrop-blur-sm">🔑 Beta Access</span>
              <span className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full backdrop-blur-sm">🏆 Hall of Legends</span>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              DM <span className="text-purple-400">@lizardlarry7</span> on X after sending
            </p>
            <p className="mt-2 text-xs text-gray-600">
              Funds fuel dev (testnet gas, APIs, servers, coffee ☕)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
