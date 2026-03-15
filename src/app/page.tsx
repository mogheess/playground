import AsciiCursor from "@/components/AsciiCursor";
import AsciiField from "@/components/AsciiField";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import About from "@/components/About";
import Footer from "@/components/Footer";
import WorkSection from "@/components/WorkSection";

export default function Home() {
  return (
    <>
      <AsciiField />
      <AsciiCursor />
      <Navbar />

      <div className="relative z-10 min-h-screen">
        <Hero />
        <WorkSection />
        <About />
        <Footer />
      </div>
    </>
  );
}
