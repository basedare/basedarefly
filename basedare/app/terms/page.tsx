import React from "react";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Terms of Service | BaseDare",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-purple-100">
      
      {/* BACKGROUND BLUR */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
      </div>

      <div className="flex-1 py-20 relative z-10 mt-12">
        <div className="container mx-auto px-6 max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-black text-center mb-12 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <div className="space-y-8 text-lg leading-relaxed text-gray-300">
            <p className="text-white">Last updated: November 09, 2025</p>
            <p>BASEDARE is a dare platform on Base blockchain. By using this site you agree:</p>
            <ul className="list-disc pl-8 space-y-4 marker:text-purple-500">
              <li>No illegal dares (drugs, violence, etc.) — <span className="text-red-400 font-bold">instant ban</span></li>
              <li>All bounties paid in <span className="text-yellow-400 font-bold">$BARE</span></li>
              <li>10% platform fee on all completed dares</li>
              <li>We can revoke any dare at any time</li>
              <li>No refunds on expired dares</li>
              <li>PeeBear is watching you</li>
            </ul>
            <p className="text-center mt-16 text-2xl font-bold text-white animate-pulse">
              Have fun. Get based. Don&apos;t get pissed on.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}


