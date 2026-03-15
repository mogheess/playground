"use client";

import { useEffect, useRef } from "react";

const TRAIL_CHARS = "·:+*░▒▫○◇";

interface Particle {
  x: number;
  y: number;
  char: string;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
}

export default function AsciiCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let spawnAccum = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      const speed = Math.sqrt(dx * dx + dy * dy);
      lastPosRef.current = { x: e.clientX, y: e.clientY };

      spawnAccum += speed;
      const spawnThreshold = 12;

      while (spawnAccum >= spawnThreshold) {
        spawnAccum -= spawnThreshold;
        const angle = Math.random() * Math.PI * 2;
        const drift = Math.random() * 0.8 + 0.2;
        particlesRef.current.push({
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          char: TRAIL_CHARS[Math.floor(Math.random() * TRAIL_CHARS.length)],
          life: 0,
          maxLife: 35 + Math.random() * 25,
          vx: Math.cos(angle) * drift,
          vy: Math.sin(angle) * drift - 0.3,
        });
      }

      if (particlesRef.current.length > 120) {
        particlesRef.current = particlesRef.current.slice(-120);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;

        const progress = p.life / p.maxLife;
        if (progress >= 1) return false;

        const opacity = (1 - progress) * 0.35;
        const size = 10 + progress * 3;

        ctx.font = `${size}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = `rgba(${accentRGB}, ${opacity})`;
        ctx.fillText(p.char, p.x, p.y);

        return true;
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameRef.current);
      clearInterval(accentInterval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9998] pointer-events-none"
      aria-hidden
    />
  );
}
