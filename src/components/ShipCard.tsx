"use client";

import { useRef, useState } from "react";

interface ShipCardProps {
  name: string;
  description: string;
  url?: string;
  type: "ios" | "web" | "library";
  wip?: boolean;
  delay?: number;
}

export default function ShipCard({
  name,
  description,
  url,
  type,
  wip = false,
  delay = 0,
}: ShipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const Wrapper = url ? "a" : "div";
  const linkProps = url
    ? { href: url, target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...linkProps}
      ref={cardRef as React.Ref<HTMLAnchorElement & HTMLDivElement>}
      className="animate-fade-in-up group relative block border border-border rounded-sm overflow-hidden transition-all duration-400 hover:border-border-hover p-5"
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={handleMouseMove}
    >
      {hovering && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, var(--accent-dim), transparent 70%)`,
          }}
        />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[14px] font-medium tracking-wide text-secondary group-hover:text-foreground transition-colors duration-300">
            {name}
          </h3>
          <div className="flex items-center gap-2">
            {wip && (
              <span className="text-[9px] text-accent tracking-[0.2em] uppercase font-medium border border-accent/30 rounded-sm px-2 py-0.5">
                wip
              </span>
            )}
            <span className="text-[9px] text-muted/60 tracking-[0.2em] uppercase font-light">
              {type}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted leading-[1.7] font-light group-hover:text-secondary transition-colors duration-500">
          {description}
        </p>

        {url && (
          <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all duration-300 mt-3 block tracking-wider">
            open →
          </span>
        )}
      </div>
    </Wrapper>
  );
}
