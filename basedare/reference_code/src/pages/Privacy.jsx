import React from "react";
import Footer from "../components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-purple-100">
      <div className="flex-1 py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <h1 className="text-6xl font-black text-center mb-12 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <div className="space-y-8 text-lg leading-relaxed">
            <p>Last updated: November 09, 2025</p>
            <p>BASEDARE collects minimal data to make dares work. Here's what you need to know:</p>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-purple-300 mb-3">What We Collect</h2>
                <ul className="list-disc pl-8 space-y-2">
                  <li>Wallet address (for $BARE payouts)</li>
                  <li>Username and email (for account)</li>
                  <li>Dare activity (what you post, accept, complete)</li>
                  <li>Chat messages (on dare pages)</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-purple-300 mb-3">What We Don't Do</h2>
                <ul className="list-disc pl-8 space-y-2">
                  <li>Sell your data to advertisers</li>
                  <li>Track you across other sites</li>
                  <li>Share your wallet address publicly</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-purple-300 mb-3">Your Rights</h2>
                <ul className="list-disc pl-8 space-y-2">
                  <li>Delete your account anytime</li>
                  <li>Export your dare history</li>
                  <li>Opt out of marketing emails</li>
                </ul>
              </div>
            </div>

            <p className="text-center mt-16 text-xl font-bold text-purple-300">
              Questions? DM us on X: @basedare
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}