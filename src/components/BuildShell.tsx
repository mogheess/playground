import Link from "next/link";

interface BuildShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  fullscreen?: boolean;
}

export default function BuildShell({
  title,
  description,
  children,
  fullscreen = false,
}: BuildShellProps) {
  if (fullscreen) {
    return (
      <div className="min-h-screen bg-background relative">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-[11px] text-muted tracking-[0.2em] uppercase hover:text-secondary transition-colors duration-300"
        >
          back
        </Link>
        <div className="text-right">
          <h1 className="text-sm font-medium text-foreground tracking-wide">
            {title}
          </h1>
          <p className="text-[11px] text-muted font-light mt-1 max-w-xs">
            {description}
          </p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 pb-16">{children}</main>
    </div>
  );
}
