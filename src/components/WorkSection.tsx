"use client";

import { useState } from "react";
import BuildCard from "@/components/BuildCard";
import ShipCard from "@/components/ShipCard";
import GlitchText from "@/components/GlitchText";
import { builds } from "@/data/builds";
import { ships } from "@/data/ships";

type Tab = "pieces" | "ships";

export default function WorkSection() {
  const [tab, setTab] = useState<Tab>("pieces");

  const count = tab === "pieces" ? builds.length : ships.length;

  return (
    <section id="pieces" className="max-w-5xl mx-auto px-6 pb-32">
      <div className="flex items-center gap-4 mb-10">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("pieces")}
            className={`text-xs tracking-[0.25em] uppercase transition-colors duration-300 px-1 ${
              tab === "pieces" ? "text-foreground" : "text-muted hover:text-secondary"
            }`}
          >
            {tab === "pieces" ? <GlitchText text="pieces" /> : "pieces"}
          </button>
          <span className="text-muted/30 text-xs">/</span>
          <button
            onClick={() => setTab("ships")}
            className={`text-xs tracking-[0.25em] uppercase transition-colors duration-300 px-1 ${
              tab === "ships" ? "text-foreground" : "text-muted hover:text-secondary"
            }`}
          >
            {tab === "ships" ? <GlitchText text="ships" /> : "ships"}
          </button>
        </div>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted/60 font-light">
          {count}
        </span>
      </div>

      {tab === "pieces" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {builds.map((build, i) => (
            <BuildCard
              key={build.slug}
              {...build}
              href={`/builds/${build.slug}`}
              delay={400 + i * 100}
            />
          ))}
        </div>
      )}

      {tab === "ships" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ships.map((ship, i) => (
            <ShipCard
              key={ship.name}
              {...ship}
              delay={400 + i * 80}
            />
          ))}
        </div>
      )}
    </section>
  );
}
