'use client';

import { MotionValue, motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export default function RollingCounter({ value, prefix = "$", size = 48 }: { value: number, prefix?: string, size?: number }) {
  // Use the 'size' prop for fontSize instead of the constant
  const fontSize = size; 
  const padding = size * 0.3;
  const height = fontSize + padding;

  return (
    <div className="flex items-center justify-center overflow-hidden leading-none font-mono" style={{ fontSize }}>
      <span className="mr-1 text-[#FACC15] font-black drop-shadow-md">{prefix}</span>
      <Digit place={100000} value={value} height={height} />
      <Digit place={10000} value={value} height={height} />
      <Digit place={1000} value={value} height={height} />
      <span className="mx-1 text-[#FACC15] font-black">,</span>
      <Digit place={100} value={value} height={height} />
      <Digit place={10} value={value} height={height} />
      <Digit place={1} value={value} height={height} />
    </div>
  );
}

function Digit({ place, value, height }: { place: number; value: number; height: number }) {
  let valueRoundedToPlace = Math.floor(value / place);
  let animatedValue = useSpring(valueRoundedToPlace, {
    stiffness: 50, // "Heavy" mechanical feel
    damping: 15,
    mass: 1,
  });

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div style={{ height }} className="relative w-[1ch] tabular-nums font-black text-[#FACC15] drop-shadow-md">
      {[...Array(10)].map((_, i) => (
        <Number key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </div>
  );
}

function Number({ mv, number, height }: { mv: MotionValue; number: number; height: number }) {
  let y = useTransform(mv, (latest) => {
    let placeValue = latest % 10;
    let offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) {
      memo -= 10 * height;
    }
    return memo;
  });

  return (
    <motion.span style={{ y }} className="absolute inset-0 flex items-center justify-center">
      {number}
    </motion.span>
  );
}

