import React from "react";
import Footer from "../components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-purple-100">
      <div className="flex-1 py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <h1 className="text-6xl font-black text-center mb-12 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <div className="space-y-8 text-lg leading-relaxed">
            <p>Last updated: November 09, 2025</p>
            <p>BASEDARE is a dare platform on Base blockchain. By using this site you agree:</p>
            <ul className="list-disc pl-8 space-y-4">
              <li>No illegal dares (drugs, violence, etc.) — instant ban</li>
              <li>All bounties paid in $BARE</li>
              <li>10% platform fee on all completed dares</li>
              <li>We can revoke any dare at any time</li>
              <li>No refunds on expired dares</li>
              <li>Peebare is watching you</li>
            </ul>
            <p className="text-center mt-16 text-2xl font-bold">Have fun. Get based. Don't get pissed on.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}