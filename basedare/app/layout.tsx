import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./global.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import Footer from "@/components/Footer";
import LivePotBubble from "@/components/LivePotBubble";
import { LiquidFilter } from "@/components/ui/LiquidFilter";
import CosmicLayer from "@/components/CosmicLayer";
import HyperspaceBackground from "@/components/HyperspaceBackground";
import ClientLoader from "@/components/ClientLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BaseDare | Force Streamers",
  description: "Stake or Die.",
};

export default function RootLayout({ 
  children 
}: Readonly<{ 
  children: React.ReactNode; 
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#020204] text-white min-h-screen overflow-x-hidden`}>
        {/* SVG Filter for Refractive Glass Effect */}
        <LiquidFilter />
        
        {/* LAYER 0 & 1: Deep Space Nebula + Flying Stars */}
        <CosmicLayer />
        
        {/* LAYER 2: Purple Plexus Network */}
        <HyperspaceBackground />
        
        <ClientLoader>
          <Providers>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <MobileNavbar />
              <main className="flex-grow pt-24 pb-24 md:pb-0">
                {children}
              </main>
              
              <Footer />
            </div>
            
            {/* Render the fixed Live Pot Bubble */}
            <LivePotBubble />
          </Providers>
        </ClientLoader>
      </body>
    </html>
  );
}
