import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
import "./global.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LivePotBubble from "@/components/LivePotBubble";
import LivePotPortal from "@/components/LivePotPortal";
import { LiquidFilter } from "@/components/ui/LiquidFilter";
import ClientLoader from "@/components/ClientLoader";
import BackgroundLayers from "@/components/BackgroundLayers";
import { Toaster } from "@/components/ui/toaster";
import MobileLightningFlash from "@/components/MobileLightningFlash";

// FIXED PATH
import { IgnitionProvider } from "@/app/context/IgnitionContext";
import { ViewProvider } from "@/app/context/ViewContext";

// Headlines - Bricolage Grotesque (edgy, variable)
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

// Body - Alpha Lyrae (clean, tech)
const alphaLyrae = localFont({
  src: "../public/fonts/AlphaLyrae-Medium.woff2",
  variable: "--font-alpha",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BaseDare | Force Streamers",
  description: "Fund dares. Watch chaos unfold.",
};

export default function RootLayout({ 
  children 
}: Readonly<{ 
  children: React.ReactNode; 
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${alphaLyrae.variable} ${bricolage.variable} font-sans bg-[#020204] text-white min-h-screen overflow-x-hidden`}>
        <LiquidFilter />
        <div className="fixed inset-0 -z-50 pointer-events-none bg-gradient-to-b from-black via-[#050510] to-black md:hidden" />
        <div className="hidden md:block">
          <BackgroundLayers />
        </div>

        {/* Mobile-only periodic lightning flash */}
        <MobileLightningFlash />

        <ClientLoader>
          <Providers>
            <ViewProvider>
              <IgnitionProvider>
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <main className="flex-grow pt-24">
                    {children}
                  </main>
                  <Footer />
                </div>
                <LivePotPortal>
                  <LivePotBubble />
                </LivePotPortal>
              </IgnitionProvider>
            </ViewProvider>
            <Toaster />
          </Providers>
        </ClientLoader>
      </body>
    </html>
  );
}
