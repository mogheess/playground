"use client";

import { useEffect, useState } from "react";

export default function Navbar() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-10 py-5">
      <a
        href="#about"
        className="animate-fade-in text-[11px] text-secondary tracking-[0.2em] uppercase hover:text-foreground transition-colors duration-300"
        style={{ animationDelay: "200ms" }}
      >
        about
      </a>
      <a
        href="https://github.com/moghees"
        target="_blank"
        rel="noopener noreferrer"
        className="animate-fade-in text-[11px] text-secondary tracking-[0.2em] uppercase hover:text-foreground transition-colors duration-300"
        style={{ animationDelay: "300ms" }}
      >
        github
      </a>
      <button
        onClick={toggle}
        className="animate-fade-in text-[11px] text-secondary tracking-[0.2em] uppercase hover:text-foreground transition-colors duration-300"
        style={{ animationDelay: "400ms" }}
        aria-label="toggle theme"
      >
        {theme === "dark" ? "☀" : "●"}
      </button>
    </nav>
  );
}
