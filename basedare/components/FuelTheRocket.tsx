'use client';

// components/FuelTheRocket.tsx
export function FuelTheRocket() {
  const donationAddress = "0x60952546f6C6F092CA4866fC7cf6bf12269D002f";

  return (
    <div className="mt-12 p-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl text-center mx-auto max-w-4xl">
      <h3 className="text-2xl font-bold text-[#FFD700]">
        Back the Mission <span className="inline-block animate-bounce text-3xl ml-1">🚀</span>
      </h3>
      <p className="mt-3 text-gray-300">
        One dev. Zero VCs. Pure chaos.
        <br />
        <span className="text-white/60">If you believe in what we're building, this is how you get in early.</span>
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="font-mono text-base md:text-lg text-purple-300 break-all px-4">
          {donationAddress}
        </div>
        <p className="text-sm text-gray-400">ETH / Base / USDC (same address)</p>
        <button
          onClick={() => navigator.clipboard.writeText(donationAddress)}
          className="px-6 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded-lg transition font-medium"
        >
          Copy Address
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Early Supporter Perks</p>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-400">
          <span className="px-3 py-1 bg-white/5 rounded-full">🏷️ Genesis Tag Priority</span>
          <span className="px-3 py-1 bg-white/5 rounded-full">🔑 Beta Access</span>
          <span className="px-3 py-1 bg-white/5 rounded-full">🏆 Hall of Legends</span>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          DM <span className="text-purple-400">@lizardlarry7</span> on X after sending
        </p>
        <p className="mt-2 text-xs text-gray-600">
          Funds fuel dev (testnet gas, APIs, servers, coffee ☕)
        </p>
      </div>
    </div>
  );
}
