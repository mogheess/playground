import { notFound } from "next/navigation";
import { builds } from "@/data/builds";
import { getBuildComponent } from "@/builds/registry";
import BuildShell from "@/components/BuildShell";

const FULLSCREEN_SLUGS = ["voxel-logos", "pixel-animator", "image-reveal"];

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return builds.map((b) => ({ slug: b.slug }));
}

export default async function BuildPage({ params }: Props) {
  const { slug } = await params;
  const build = builds.find((b) => b.slug === slug);
  if (!build) notFound();

  const Component = await getBuildComponent(slug);
  const isFullscreen = FULLSCREEN_SLUGS.includes(slug);

  return (
    <BuildShell title={build.title} description={build.description} fullscreen={isFullscreen}>
      {Component ? (
        <Component />
      ) : (
        <div className="flex items-center justify-center h-[60vh] text-muted text-xs tracking-wider">
          coming soon
        </div>
      )}
    </BuildShell>
  );
}
