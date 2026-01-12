'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

// Mock App and Media classes to prevent runtime errors since OGL is not fully implemented yet
// In a real scenario, these would be imported from the OGL library or local modules
class Media {
  width: number = 0;
  constructor(public item: any, public index: number) {
    this.width = 300; // Mock width
  }
}

class App {
  scroll = { current: 0 };
  medias: any[] = [];
  destroy = () => {};

  constructor(container: any, config: any) {
    this.medias = config.items.map((item: any, i: number) => new Media(item, i));
  }
}

export default function CircularGallery({ 
  items, 
  onCenter, 
  bend = 3, 
  textColor = '#ffffff', 
  borderRadius = 0.05, 
  font = 'bold 30px Figtree', 
  scrollSpeed = 2, 
  scrollEase = 0.05 
}: any) { 
  const containerRef = useRef(null); 
  const appRef = useRef<any>(null); 
  const prevIndexRef = useRef<number | null>(null); 
  // Fallback state for visual list when WebGL isn't ready
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { 
    // 1. Initialize the WebGL App 
    const app = new App(containerRef.current, { 
      items, 
      bend, 
      textColor, 
      borderRadius, 
      font, 
      scrollSpeed, 
      scrollEase 
    }); 
    
    appRef.current = app; 

    // 2. TITAN OPTIMIZATION: Debounced Polling Loop 
    // This prevents the "Cannot update unmounted component" error 
    const checkInterval = setInterval(() => { 
      if (!app?.scroll || !app.medias || app.medias.length === 0) return; 
      
      // Calculate average item width (handling potential variable widths) 
      const totalWidth = app.medias.reduce((acc: number, m: any) => acc + (m.width || 0), 0); 
      const itemWidth = totalWidth / app.medias.length || 1; 
      
      // Determine centered index from scroll position 
      const scrollPos = Math.abs(app.scroll.current); 
      const rawIndex = Math.round(scrollPos / itemWidth) % items.length; 
      const safeIndex = isNaN(rawIndex) ? 0 : rawIndex; 
      
      // Only fire callback if the index has ACTUALLY changed 
      if (safeIndex !== prevIndexRef.current && onCenter && items[safeIndex]) { 
        onCenter(items[safeIndex]); 
        prevIndexRef.current = safeIndex; 
        setActiveIndex(safeIndex); // Update local state for fallback UI
      } 
    }, 200); // Check every 200ms 

    // 3. Cleanup 
    return () => { 
      clearInterval(checkInterval); 
      if (app.destroy) app.destroy(); 
    }; 
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, onCenter]); 

  // 4. Initial Mount Safety 
  // Pushes the first state update to the next tick to ensure parent is ready 
  useEffect(() => { 
    if (onCenter && items.length > 0) { 
      const t = setTimeout(() => { 
        onCenter(items[0]); 
        prevIndexRef.current = 0; 
      }, 0); 
      return () => clearTimeout(t); 
    } 
  }, []); // Run once on mount 

  // Mock interaction handler for the fallback list
  const handleItemClick = (index: number) => {
    setActiveIndex(index);
    prevIndexRef.current = index;
    onCenter?.(items[index]);
  };

  return (
    <div className="circular-gallery absolute inset-0 flex items-center justify-center pointer-events-auto" ref={containerRef}>
        {/* Placeholder Visuals (Keeping the cool spinny things) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="w-[600px] h-[600px] border border-cyan-500/10 rounded-full animate-spin-slow" />
           <div className="w-[400px] h-[400px] border border-cyan-500/20 rounded-full animate-reverse-spin-slow absolute" />
        </div>

        {/* Fallback List - Visible until OGL takes over fully */}
        <div className="flex gap-4 overflow-x-auto max-w-4xl px-8 py-12 snap-x hide-scrollbar z-10">
          {items.map((item: any, index: number) => (
            <div 
              key={item.id}
              onClick={() => handleItemClick(index)}
              className={`
                min-w-[200px] h-[280px] bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl 
                flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-300 snap-center
                hover:border-cyan-500/50 hover:bg-black/60
                ${index === activeIndex ? 'scale-110 border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'opacity-60 scale-90'}
              `}
            >
              <div className="w-20 h-20 bg-gray-800 rounded-full mb-4 overflow-hidden">
                {item.image ? (
                   <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black" />
                )}
              </div>
              <h3 className="text-white font-bold text-center text-sm mb-2">{item.title}</h3>
              <p className="text-cyan-400 font-mono text-xs">{item.bounty} USDC</p>
            </div>
          ))}
        </div>
    </div>
  ); 
}