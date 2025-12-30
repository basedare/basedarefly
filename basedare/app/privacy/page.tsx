import React from "react";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy | BaseDare",
  description: "How we handle your data on the BaseDare protocol.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-purple-100 relative overflow-hidden">
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed top-0 right-0 w-full h-full pointer-events-none z-0">
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full" />
      </div>

      <div className="flex-1 py-20 relative z-10 mt-12">
        <div className="container mx-auto px-6 max-w-4xl">
          
          <h1 className="text-5xl md:text-6xl font-black text-center mb-12 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          
          <div className="space-y-8 text-lg leading-relaxed text-gray-300">
            <p className="text-white font-medium">Last updated: November 09, 2025</p>
            <p>BASEDARE collects minimal data to make dares work. Here is what you need to know:</p>
            
            <div className="space-y-12">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                <h2 className="text-2xl font-bold text-purple-300 mb-4">What We Collect</h2>
                <ul className="list-disc pl-6 space-y-2 marker:text-purple-500">
                  <li>Wallet address (for <span className="text-[#FFD700]">$BARE</span> payouts)</li>
                  <li>Username and email (for account management)</li>
                  <li>Dare activity (what you post, accept, complete)</li>
                  <li>Chat messages (on dare pages)</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                <h2 className="text-2xl font-bold text-purple-300 mb-4">What We Don&apos;t Do</h2>
                <ul className="list-disc pl-6 space-y-2 marker:text-green-500">
                  <li>Sell your data to advertisers</li>
                  <li>Track you across other sites</li>
                  <li>Share your wallet address publicly (outside of blockchain txs)</li>
                </ul>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                <h2 className="text-2xl font-bold text-purple-300 mb-4">Your Rights</h2>
                <ul className="list-disc pl-6 space-y-2 marker:text-blue-500">
                  <li>Delete your account anytime</li>
                  <li>Export your dare history</li>
                  <li>Opt out of marketing emails</li>
                </ul>
              </div>
            </div>

            <div className="text-center mt-20">
              <p className="text-xl font-bold text-purple-300 mb-4">
                Questions?
              </p>
              <a 
                href="https://twitter.com/basedare" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-3 rounded-full bg-purple-500/20 border border-purple-500 text-purple-200 hover:bg-purple-500 hover:text-white transition-all font-bold"
              >
                DM us on X: @basedare
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}


