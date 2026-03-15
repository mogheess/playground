export default function Footer() {
  return (
    <footer className="max-w-5xl mx-auto px-6 pb-12">
      <div className="border-t border-border pt-8 flex items-center justify-between">
        <span className="text-[11px] text-muted/50 tracking-widest">
          © {new Date().getFullYear()}
        </span>
        <span className="text-[11px] text-muted/40 font-light tracking-wider">
          built with obsession
        </span>
      </div>
    </footer>
  );
}
