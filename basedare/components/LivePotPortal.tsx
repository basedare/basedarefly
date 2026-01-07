'use client';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export default function LivePotPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent SSR crashes or Hydration mismatches
  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed bottom-6 right-6 z-[9999] pointer-events-none"
      // pointer-events-none on wrapper ensures we don't block clicks on the page behind the pot
    >
      <div className="pointer-events-auto">
        {/* pointer-events-auto re-enables clicking specifically on the Pot */}
        {children}
      </div>
    </div>,
    document.body
  );
}

