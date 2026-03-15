"use client";

import { useRef, useState, useEffect } from "react";

interface BuildCardProps {
  index: string;
  title: string;
  description: string;
  previewSeed: number;
  image?: string;
  href?: string;
  delay?: number;
}

function AsciiPreview({ seed, hovering }: { seed: number; hovering: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const timeRef = useRef(seed * 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 240;
    canvas.height = 140;

    const chars = [".", "·", ":", "+", "*", "#", "░", "▒"];
    const cellSize = 10;
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);

    let accentRGB = "255, 107, 53";
    const hex = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    if (hex && hex.startsWith("#")) {
      accentRGB = `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
    }

    const animate = () => {
      timeRef.current += hovering ? 0.04 : 0.008;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${cellSize - 1}px 'JetBrains Mono', monospace`;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const n1 = Math.sin((x + seed) * 0.3 + timeRef.current) *
                     Math.cos((y + seed) * 0.4 + timeRef.current * 0.7);
          const n2 = Math.sin((x * y + seed) * 0.01 + timeRef.current * 0.5);
          const val = (n1 + n2) * 0.5 + 0.5;

          const charIdx = Math.floor(val * (chars.length - 1));
          const alpha = 0.08 + val * (hovering ? 0.35 : 0.15);

          ctx.fillStyle = `rgba(${accentRGB}, ${alpha})`;
          ctx.fillText(chars[charIdx], x * cellSize, y * cellSize + cellSize);
        }
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [seed, hovering]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

export default function BuildCard({
  index,
  title,
  description,
  previewSeed,
  image,
  href = "#",
  delay = 0,
}: BuildCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [hovering, setHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <a
      ref={cardRef}
      href={href}
      className="animate-fade-in-up group relative block border border-border rounded-sm overflow-hidden transition-all duration-400 hover:border-border-hover"
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={handleMouseMove}
    >
      {hovering && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, var(--accent-dim), transparent 70%)`,
          }}
        />
      )}

      <div className="relative z-10 flex flex-col sm:flex-row">
        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between min-h-[140px]">
          <div>
            <span className="text-[11px] text-muted font-light tracking-[0.25em] mb-3 block">
              {index}
            </span>

            <h3 className="text-[15px] font-medium tracking-wide text-secondary group-hover:text-foreground transition-colors duration-300 mb-2">
              {title}
            </h3>

            <p className="text-xs text-muted leading-[1.7] font-light group-hover:text-secondary transition-colors duration-500 max-w-xs">
              {description}
            </p>
          </div>

          <div className="flex items-center mt-4">
            <span className="text-[11px] text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
              view
            </span>
          </div>
        </div>

        <div className="w-full sm:w-[200px] h-[120px] sm:h-auto border-t sm:border-t-0 sm:border-l border-border/50 bg-elevated flex items-center justify-center overflow-hidden relative">
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <AsciiPreview seed={previewSeed} hovering={hovering} />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/20 pointer-events-none" />
        </div>
      </div>
    </a>
  );
}
