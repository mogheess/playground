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
            i&apos;m moghees, a fullstack engineer. most of what you see here
            are things i find interesting, small ideas i want to explore, or
            stuff i build with claude to see how far i can push an idea in a
            sitting.
          </p>

          <p className="text-sm text-secondary leading-[1.8] font-light">
            none of this is meant to be production software. it&apos;s more like
            a sketchbook for the web. some of these will be rough, some might
            actually work well. the point is just to keep building and learning.
          </p>

          <p className="text-sm text-muted leading-[1.8] font-light mt-6">
            if something here catches your eye or you want to talk, find me on{" "}
            <a
              href="https://github.com/moghees"
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
