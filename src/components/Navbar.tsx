"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const themeListeners = new Set<() => void>();

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  return () => themeListeners.delete(callback);
}

function getThemeSnapshot(): "dark" | "light" {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

export default function Navbar() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => "dark" as const
  );
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    themeListeners.forEach((listener) => listener());
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-10 transition-all duration-300 ${
        scrolled
          ? "py-4 bg-background/70 backdrop-blur-md border-b border-border"
          : "py-6 bg-transparent border-b border-transparent"
      }`}
    >
      <a
        href="#about"
        className="animate-fade-in text-[13px] text-secondary tracking-[0.15em] uppercase hover:text-foreground transition-colors duration-300"
        style={{ animationDelay: "200ms" }}
      >
        about
      </a>
      <a
        href="https://github.com/mogheess/"
        target="_blank"
        rel="noopener noreferrer"
        className="animate-fade-in text-[13px] text-secondary tracking-[0.15em] uppercase hover:text-foreground transition-colors duration-300"
        style={{ animationDelay: "300ms" }}
      >
        github
      </a>
      <button
        onClick={toggle}
        className="animate-fade-in text-[13px] text-secondary tracking-[0.15em] uppercase hover:text-foreground transition-colors duration-300"
        style={{ animationDelay: "400ms" }}
        aria-label="toggle theme"
      >
        {theme === "dark" ? "light" : "dark"}
      </button>
    </nav>
  );
}
