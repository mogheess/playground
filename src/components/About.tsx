export default function About() {
  return (
    <section id="about" className="max-w-5xl mx-auto px-6 pb-24">
      <div className="border-t border-border pt-16">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-xs tracking-[0.25em] uppercase text-muted">
            about
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="max-w-lg space-y-4">
          <p className="text-sm text-secondary leading-[1.8] font-light">
            i&apos;m moghees, a fullstack engineer. i build products,
            experiment with ideas, and sometimes just make things because
            they seem interesting. a lot of what&apos;s here was built with
            claude in a sitting or two for fun.
          </p>

          <p className="text-sm text-secondary leading-[1.8] font-light">
            some of it is rough, some of it is in the app store.
            the point is to keep building.
          </p>

          <p className="text-sm text-muted leading-[1.8] font-light mt-6">
            if something here catches your eye or you want to talk, find me on{" "}
            <a
              href="https://github.com/mogheess"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-foreground transition-colors duration-300"
            >
              github
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
