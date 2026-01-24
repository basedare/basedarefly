export default function LivePot({ amount }: { amount?: string }) {
  return (
    <div className="relative group mx-auto max-w-fit mb-12">
      {/* Radiant Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000" />
      
      <div className="relative px-8 py-6 bg-black/80 backdrop-blur-xl rounded-2xl leading-none flex items-center border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-[0.3em] mb-2">
            Creator Rewards Pool
          </span>
          <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-400 to-purple-500 italic tracking-tighter">
            {amount || "$42,069"}
          </span>
        </div>
      </div>
    </div>
  );
}