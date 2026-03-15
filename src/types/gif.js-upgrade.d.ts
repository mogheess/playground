declare module "gif.js-upgrade" {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    workerScript?: string;
    width?: number;
    height?: number;
    transparent?: number;
    repeat?: number;
  }

  interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
  }

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      element: HTMLCanvasElement | HTMLImageElement | ImageData,
      options?: AddFrameOptions
    ): void;
    on(event: "finished", callback: (blob: Blob) => void): void;
    on(event: "progress", callback: (progress: number) => void): void;
    render(): void;
    abort(): void;
  }

  export default GIF;
}
