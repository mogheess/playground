import { ComponentType } from "react";

type BuildComponent = ComponentType;

const registry: Record<string, () => Promise<{ default: BuildComponent }>> = {
  "voxel-logos": () => import("./voxel-logos"),
  "pixel-animator": () => import("./pixel-animator"),
  "image-reveal": () => import("./image-reveal"),
};

export async function getBuildComponent(
  slug: string
): Promise<BuildComponent | null> {
  const loader = registry[slug];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}

export function getRegisteredSlugs(): string[] {
  return Object.keys(registry);
}
