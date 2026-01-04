'use client';

import React, { useState, useEffect } from "react";
import { Skull, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SHAME_LIST = [
  { id: 1, user: "@CryptoBrad", dare: "Tattoo 'Luna' on forehead", reason: "CHICKENED OUT", penalty: "-500 Rep", initialRep: 850 },
  { id: 2, user: "@PixelArtist", dare: "Delete main NFT collection", reason: "FAILED VERIFICATION", penalty: "BANNED", initialRep: 620 },
  { id: 3, user: "@AlphaMale_00", dare: "Livestream 24h blindfolded", reason: "QUITTED AT 2H", penalty: "-1000 Rep", initialRep: 950 },
];

const BleedParticle = ({ value, delay }: { value: string, delay: number }) => {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 1 }}
      animate={{ 
        y: 400, 
        opacity: 0, 
        scale: 0.5,
        transition: {
          duration: 2.5,
          delay,
          ease: [0.4, 0, 0.6, 1]
        }
      }}
      className="absolute text-red-600 font-black text-xs"
      style={{
        textShadow: '0 0 10px #ff0000',
        left: `${Math.random() * 60}px`,
      }}
    >
      {value}
    </motion.div>
  );
};

interface DamageNumber {
    id: string;
    cardId: number;
    value: number;
    left: number;
}

export default function HallOfShame() {
  const [activeCards, setActiveCards] = useState<number[]>([]);
  const [bleedingCards, setBleedingCards] = useState<{[key: number]: boolean}>({});
  const [stainedCards, setStainedCards] = useState<number[]>([]);
  const [reputation, setReputation] = useState<{[key: number]: number}>({});
  const [criticalCards, setCriticalCards] = useState<number[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [voidedCards, setVoidedCards] = useState<number[]>([]);

  // Initialize reputation
  useEffect(() => {
    const initialRep: {[key: number]: number} = {};
    SHAME_LIST.forEach(item => {
      initialRep[item.id] = item.initialRep;
    });
    setReputation(initialRep);
  }, []);

  const triggerDamage = (id: number) => {
    const damage = Math.floor(Math.random() * 100 + 50);
    const newRep = Math.max(0, (reputation[id] || 1000) - damage);
    
    setReputation(prev => ({ ...prev, [id]: newRep }));
    
    // Dispatch damage event for Live Pot sync
    window.dispatchEvent(new CustomEvent('shameDamage', { detail: { damage, cardId: id } }));
    
    // Critical hit effect if rep goes below 200
    if (newRep < 200 && !criticalCards.includes(id)) {
      setCriticalCards(prev => [...prev, id]);
      // Footer shake on critical
      window.dispatchEvent(new CustomEvent('criticalHit'));
      setTimeout(() => {
        setCriticalCards(prev => prev.filter(cardId => cardId !== id));
      }, 600);
    }
    
    // Voided state when rep hits 0
    if (newRep === 0 && !voidedCards.includes(id)) {
      setVoidedCards(prev => [...prev, id]);
    }

    // Add floating damage number
    const damageId = `${id}-${Date.now()}`;
    setDamageNumbers(prev => [...prev, { 
      id: damageId, 
      cardId: id, 
      value: damage,
      left: Math.random() * 60 + 20
    }]);
    
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== damageId));
    }, 1500);
  };

  const toggleShame = (id: number) => {
    const wasActive = activeCards.includes(id);
    
    setActiveCards(prev => 
      prev.includes(id) 
        ? prev.filter(cardId => cardId !== id) 
        : [...prev, id]
    );

    if (!wasActive) {
      // Trigger damage
      triggerDamage(id);
      
      // Start bleeding
      setBleedingCards(prev => ({ ...prev, [id]: true }));
      
      // Stop bleeding after 3 seconds and add stain
      setTimeout(() => {
        setBleedingCards(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
        setStainedCards(prev => [...prev, id]);
      }, 3000);
    } else {
      // Remove stain when deactivated
      setStainedCards(prev => prev.filter(cardId => cardId !== id));
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-24 pt-32 px-6">
      
      {/* SECTION HEADER */}
      <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
        <h2 className="text-4xl md:text-5xl font-black text-white flex items-center gap-4">
          <Skull className="text-red-600 w-10 h-10 animate-pulse" />
          <span className="tracking-tighter">HALL OF <span className="text-red-600">SHAME</span></span>
        </h2>
        <div className="hidden md:block text-red-900/50 font-black text-6xl opacity-20 select-none">
           FAILURE
        </div>
      </div>

      {/* SHAME GRID - INTERROGATION ROOM */}
      <div className="grid md:grid-cols-3 gap-6 shame-card-container" style={{ perspective: '1200px' }}>
         {SHAME_LIST.map((item, idx) => {
            const isActive = activeCards.includes(item.id);
            const rotations = ['rotate-[-1deg]', 'rotate-[2deg]', 'rotate-[-1.5deg]'];
            
            return (
            <div 
               key={item.id} 
               onClick={() => toggleShame(item.id)}
               className={`shame-card group relative min-h-[280px] rounded-xl overflow-hidden cursor-pointer ${isActive ? 'active shamed-active' : ''} ${criticalCards.includes(item.id) ? 'rep-critical screen-shake' : ''} ${voidedCards.includes(item.id) ? 'voided' : ''}`}
               style={{
                  background: isActive ? '#050505' : '#0a0a0a',
                  border: isActive ? '1px solid #1a1a1a' : '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: isActive 
                     ? '0 50px 100px -20px rgba(255, 0, 0, 0.2), inset 0 20px 40px rgba(0,0,0,0.8)' 
                     : '0 10px 30px rgba(0,0,0,0.3)',
                  transform: isActive 
                     ? `${rotations[idx]} scale(1.02) rotateX(0deg) translateZ(0px)` 
                     : `${rotations[idx]} rotateX(8deg) translateZ(-40px)`,
                  transformStyle: 'preserve-3d',
                  transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)'
               }}
            >
               {/* Localized Background Brightness Reveal */}
               {isActive && (
                  <div 
                     className="absolute -inset-20 -z-10 pointer-events-none"
                     style={{
                        backdropFilter: 'brightness(0.8) saturate(1.2)',
                        background: 'radial-gradient(circle, rgba(255,0,0,0.1) 0%, transparent 70%)',
                        filter: 'blur(30px)'
                     }}
                  />
               )}
               
               {/* Floating Damage Numbers */}
               {damageNumbers.filter(d => d.cardId === item.id).map(damage => (
                  <div 
                     key={damage.id}
                     className="damage-number absolute text-red-500 font-bold text-xl pointer-events-none animate-bounce"
                     style={{ left: `${damage.left}%`, top: '50%' }}
                  >
                     -{damage.value}
                  </div>
               ))}
               
               {/* PHYSICAL LIGHT SLIT - NEON RED */}
               {isActive && (
                  <>
                     <div className="absolute top-0 left-[15%] right-[15%] h-[3px] bg-red-600 blur-[1px] shadow-[0_0_15px_#ff0000,0_5px_20px_rgba(255,0,0,0.8)] z-30" />
                     
                     {/* FOLDING LIGHT SPILL - Angular Beam */}
                     <div 
                        className="absolute inset-0 pointer-events-none z-20"
                        style={{
                           background: 'linear-gradient(to bottom, #ff0000, transparent)',
                           height: '150px',
                           opacity: 0.4,
                           clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)'
                        }}
                     />
                     
                     {/* DEEP LUMEN LAYERS - 3 Light Gradients */}
                     <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-900/30 via-red-900/15 to-transparent pointer-events-none z-20" />
                     <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-red-600/20 via-red-600/8 to-transparent pointer-events-none z-20" />
                     <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-red-500/15 to-transparent pointer-events-none z-20" />
                  </>
               )}
               
               {/* RED OVERLAY ON HOVER */}
               <div className="absolute inset-0 bg-red-900/10 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
               
               {/* INSET CONTENT BOX - Catches Top-Down Light */}
               <div 
                  className="content relative z-10 p-5 flex flex-col min-h-full justify-between transition-all duration-500"
                  style={{
                     filter: isActive 
                        ? 'grayscale(0) sepia(0.5) hue-rotate(-50deg) contrast(1.5)' 
                        : 'grayscale(1) contrast(1.2)'
                  }}
               >
                  {/* Reputation Bar */}
                  <div className="mb-2">
                     <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Reputation</span>
                        <span className="text-xs font-black text-white">{reputation[item.id] || item.initialRep}</span>
                     </div>
                     <div className="rep-bar-container w-full h-1 bg-gray-800 rounded-full overflow-hidden relative">
                        <div 
                           className="rep-bar h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300" 
                           style={{ width: `${((reputation[item.id] || item.initialRep) / 1000) * 100}%` }}
                        />
                        {criticalCards.includes(item.id) && <div className="rep-cracks absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cracked-ground.png')] opacity-50 mix-blend-overlay" />}
                     </div>
                  </div>

                  {/* Top Icon Row */}
                  <div className="flex justify-between items-start mb-3 relative">
                     <button
                        onClick={(e) => {
                           e.stopPropagation();
                           toggleShame(item.id);
                        }}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 -mt-2 group/x"
                     >
                        <XCircle 
                           className={`w-8 h-8 transition-all duration-500 ${
                              isActive 
                                 ? 'text-red-600 opacity-100 rotate-45 drop-shadow-[0_0_10px_#ff0000]' 
                                 : 'text-red-600/50 opacity-50 rotate-0'
                           } group-hover/x:scale-110`} 
                        />
                     </button>

                     <div className="relative">
                        <span className={`text-[10px] font-mono border border-red-900/30 px-2 py-1 rounded bg-black/50 ${
                           bleedingCards[item.id] 
                              ? 'text-red-600 animate-[shake_0.2s_infinite]' 
                              : 'text-red-500'
                        }`}>
                           {item.penalty}
                        </span>

                        {/* Bleeding Particles Container */}
                        <div className="absolute top-0 right-0 w-24 h-64 pointer-events-none overflow-visible">
                           <AnimatePresence>
                              {bleedingCards[item.id] && (
                                 <>
                                    <BleedParticle value="-5" delay={0} />
                                    <BleedParticle value="-10" delay={0.2} />
                                    <BleedParticle value="-1" delay={0.4} />
                                    <BleedParticle value="-15" delay={0.6} />
                                    <BleedParticle value="-3" delay={0.8} />
                                    <BleedParticle value="-8" delay={1} />
                                    <BleedParticle value="-2" delay={1.2} />
                                    <BleedParticle value="-12" delay={1.4} />
                                    <BleedParticle value="-6" delay={1.6} />
                                    <BleedParticle value="-4" delay={1.8} />
                                 </>
                              )}
                           </AnimatePresence>
                        </div>
                     </div>
                  </div>

                  {/* SHADOWBOX INSET - Deep Recessed Content */}
                  <div 
                     className="mt-auto rounded-lg p-4 transition-all duration-500 flex-1 flex flex-col"
                     style={{
                        background: 'rgba(0,0,0,0.4)',
                        boxShadow: isActive 
                           ? 'inset 0 2px 10px rgba(0,0,0,0.9)' 
                           : 'inset 0 1px 5px rgba(0,0,0,0.5)',
                        borderTop: isActive 
                           ? '1px solid rgba(255,0,0,0.15)' 
                           : '1px solid rgba(255,255,255,0.03)'
                     }}
                  >
                     <h3 className="text-lg font-bold text-gray-300 group-hover:text-white mb-2">
                        {item.user}
                     </h3>
                     <p className="text-xs text-gray-500 font-mono mb-3 leading-relaxed flex-1">
                        "{item.dare}"
                     </p>
                     
                     <div className="mt-auto pt-3 border-t border-white/5">
                        <div className="text-[9px] uppercase tracking-widest text-red-700/80 font-bold mb-1">
                           VERDICT
                        </div>
                        <div className="text-xl font-black text-red-600 italic tracking-tighter break-words">
                           {item.reason}
                        </div>
                     </div>
                  </div>
               </div>

               {/* RED STAIN AT BOTTOM */}
               {stainedCards.includes(item.id) && (
               <div 
                  className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                  style={{
                     background: 'linear-gradient(to top, rgba(139, 0, 0, 0.3), transparent)',
                     filter: 'blur(20px)',
                     opacity: 0.6
                  }}
               />
               )}
               
               {/* SCRATCH TEXTURE */}
               <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/scratch-ink.png')] pointer-events-none mix-blend-overlay" />
            </div>
            );
         })}
      </div>

      {/* SHAKE ANIMATION */}
      <style jsx>{`
         @keyframes shake {
            0% { transform: translate(1px, 1px) rotate(0deg); }
            25% { transform: translate(-1px, -1px) rotate(-1deg); }
            50% { transform: translate(-1px, 1px) rotate(1deg); }
            100% { transform: translate(1px, -1px) rotate(0deg); }
         }
         .shame-card-container {
            perspective: 1200px;
         }
      `}</style>
    </div>
  );
}