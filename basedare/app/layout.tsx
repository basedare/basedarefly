import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./global.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import Footer from "@/components/Footer";
import LivePotBubble from "@/components/LivePotBubble";
import LivePotPortal from "@/components/LivePotPortal";
import { LiquidFilter } from "@/components/ui/LiquidFilter";
import ClientLoader from "@/components/ClientLoader";
import BackgroundLayers from "@/components/BackgroundLayers";
import { Toaster } from "@/components/ui/toaster";

// FIXED PATH
import { IgnitionProvider } from "@/app/context/IgnitionContext";

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
        <LiquidFilter />
        <div className="fixed inset-0 -z-50 pointer-events-none bg-gradient-to-b from-black via-[#050510] to-black md:hidden" />
        <div className="hidden md:block">
          <BackgroundLayers />
        </div>
        
        <ClientLoader>
          <Providers>
            <IgnitionProvider>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <MobileNavbar />
                <main className="flex-grow pt-24 pb-24 md:pb-0">
                  {children}
                </main>
                <Footer />
              </div>
              <LivePotPortal>
                <LivePotBubble />
              </LivePotPortal>
            </IgnitionProvider>
            <Toaster />
          </Providers>
        </ClientLoader>
      </body>
    </html>
  );
}
