"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "breaking interfaces",
  "bending pixels",
  "vibing",
  "shipping things",
];

export default function Hero() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
        setVisible(true);
      }, 350);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-24 sm:pt-32 pb-20 max-w-5xl mx-auto px-6">
      <div className="animate-fade-in-up" style={{ animationDelay: "0ms" }}>
        <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-foreground mb-3">
          moghees
        </h1>
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
          <p
            className={`text-sm text-secondary font-light tracking-wide transition-all duration-300 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            {PHRASES[phraseIndex]}
          </p>
        </div>
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: "240ms" }}>
        <p className="text-sm text-muted leading-[1.8] max-w-md font-light">
          a small collection of things i build, break, and ship. from creative
          experiments to products.
        </p>
      </div>
    </section>
  );
}
