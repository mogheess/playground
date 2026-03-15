export interface Build {
  slug: string;
  index: string;
  title: string;
  description: string;
  previewSeed: number;
  image?: string;
}

export const builds: Build[] = [
  {
    slug: "voxel-logos",
    index: "000",
    title: "voxel-logos",
    description:
      "cinematic 3d voxel animation of tech logos. switch between claude, react, typescript, github, and more. paste your own svg.",
    previewSeed: 42,
    image: "/voxels.png",
  },
  {
    slug: "pixel-animator",
    index: "001",
    title: "pixel-animator",
    description:
      "browser-based pixel art animation tool. draw on a grid, create frames, preview with onion skinning, export as gif or css spritesheet.",
    previewSeed: 77,
    image: "/pixel.png",
  },
  {
    slug: "image-reveal",
    index: "002",
    title: "image-reveal",
    description:
      "cursor-driven image comparison. hover to reveal a second image underneath with circle, slider, or gradient mask. upload your own images.",
    previewSeed: 33,
    image: "/imageffectpreview.png",
  },
];
