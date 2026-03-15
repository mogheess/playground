"use client";

import { useEffect, useRef } from "react";

const CHARS = ".·:+*#%@";

export default function AsciiField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSize = 14;
    let cols: number, rows: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / cellSize);
      rows = Math.floor(canvas.height / cellSize);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouse);

    let accentRGB = "255, 107, 53";
    const updateAccent = () => {
      const hex = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      if (hex && hex.startsWith("#")) {
        accentRGB = `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
      }
    };
    updateAccent();
    const accentInterval = setInterval(updateAccent, 500);

    const animate = () => {
      timeRef.current += 0.008;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${cellSize - 2}px 'JetBrains Mono', monospace`;

      const { x: mx, y: my } = mouseRef.current;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = x * cellSize + cellSize / 2;
          const py = y * cellSize + cellSize / 2;

          const dx = px - mx;
          const dy = py - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const wave =
            Math.sin(x * 0.08 + timeRef.current * 2) *
            Math.cos(y * 0.06 + timeRef.current * 1.5) *
            0.5 +
            0.5;

          const mouseInfluence = Math.max(0, 1 - dist / 200);
          const combined = wave * 0.3 + mouseInfluence * 0.7;

          const charIndex = Math.floor(combined * (CHARS.length - 1));
          const char = CHARS[Math.min(charIndex, CHARS.length - 1)];

          const alpha = 0.02 + combined * 0.08;
          ctx.fillStyle = `rgba(${accentRGB}, ${alpha})`;
          ctx.fillText(char, px, py);
        }
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(frameRef.current);
      clearInterval(accentInterval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden
    />
  );
}
