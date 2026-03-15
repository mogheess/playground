import AsciiCursor from "@/components/AsciiCursor";
import AsciiField from "@/components/AsciiField";
import BuildCard from "@/components/BuildCard";
import GlitchText from "@/components/GlitchText";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import About from "@/components/About";
import Footer from "@/components/Footer";
import { builds } from "@/data/builds";

export default function Home() {
  return (
    <>
      <AsciiField />
      <AsciiCursor />
      <Navbar />

      <div className="relative z-10 min-h-screen">
        <Hero />

        <section id="pieces" className="max-w-5xl mx-auto px-6 pb-32">
          <div className="flex items-center gap-4 mb-10">
            <span className="text-xs tracking-[0.25em] uppercase text-muted">
              <GlitchText text="pieces" />
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted/60 font-light">
              {builds.length}
            </span>
          </div>

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
        </section>

        <About />
        <Footer />
      </div>
    </>
  );
}
