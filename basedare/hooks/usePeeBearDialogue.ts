"use client";
import { useEffect, useState } from "react";
export function usePeeBearDialogue(text: string, active: boolean) {
  const [frame, setFrame] = useState({ text: "", count: 0 });
  const [reduced, setReduced] = useState(true);
  const words = text.split(/\s+/);
  const count = frame.text === text ? frame.count : 0;
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!active || reduced) return;
    let next = 0;
    setFrame({ text, count: 0 });
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      next++;
      setFrame(previous => previous.text === text && previous.count >= text.split(/\s+/).length ? previous : { text, count: next });
      if (next >= text.split(/\s+/).length) clearInterval(timer);
    }, 125);
    return () => clearInterval(timer);
  }, [text, active, reduced]);
  const speaking = active && !reduced && count < words.length;
  return {
    speaking,
    visible: speaking ? words.slice(0, count).join(" ") : text,
    finish: () => setFrame({ text, count: words.length }),
  };
}
