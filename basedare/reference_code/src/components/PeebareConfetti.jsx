import React from 'react';

export function triggerPeebareConfetti() {
  const colors = ['#FFD700', '#FFB800', '#FF6B00', '#FFC933'];
  const confettiCount = 200;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    const isDroplet = Math.random() > 0.5;
    
    confetti.style.cssText = `
      position: fixed;
      width: ${isDroplet ? '6px' : Math.random() * 12 + 6 + 'px'};
      height: ${isDroplet ? '12px' : Math.random() * 12 + 6 + 'px'};
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: 50%;
      top: 30%;
      opacity: 1;
      pointer-events: none;
      z-index: 9999;
      border-radius: ${isDroplet ? '50% 50% 50% 0' : Math.random() > 0.5 ? '50%' : '0'};
      transform: rotate(45deg);
      box-shadow: 0 0 10px ${colors[Math.floor(Math.random() * colors.length)]};
    `;
    document.body.appendChild(confetti);
    
    const angle = (Math.PI * 2 * i) / confettiCount;
    const velocity = 12 + Math.random() * 18;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity - 8;
    
    let x = 0;
    let y = 0;
    let opacity = 1;
    let rotation = Math.random() * 360;
    let vyFinal = vy;
    
    const animate = () => {
      vyFinal += 0.4;
      y += vyFinal;
      x += vx;
      opacity -= 0.01;
      rotation += 10;
      
      confetti.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
      confetti.style.opacity = opacity;
      
      if (opacity > 0 && y < window.innerHeight) {
        requestAnimationFrame(animate);
      } else {
        confetti.remove();
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  // Peebare sound effect (optional)
  const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-arcade-bonus-alert-767.mp3');
  audio.play().catch(err => console.log('Audio play failed:', err));
}

export default function PeebareConfetti() {
  return null;
}