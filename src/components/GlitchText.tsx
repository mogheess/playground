"use client";

import { useEffect, useState } from "react";

interface GlitchTextProps {
  text: string;
  className?: string;
}

const GLITCH_CHARS = "!<>-_\\/[]{}—=+*^?#________";

export default function GlitchText({ text, className = "" }: GlitchTextProps) {
  const [display, setDisplay] = useState(text);
  const [isGlitching, setIsGlitching] = useState(true);

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((char, i) => {
            if (i < iteration) return char;
            if (char === " ") return " ";
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          })
          .join("")
      );

      if (iteration >= text.length) {
        clearInterval(interval);
        setIsGlitching(false);
      }

      iteration += 1 / 2;
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className={`${className} ${isGlitching ? "animate-flicker" : ""}`}>
      {display}
    </span>
  );
}
