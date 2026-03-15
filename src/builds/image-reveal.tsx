"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type RevealMode = "circle" | "slider" | "gradient";

function generatePlaceholder(hue: number, label: string, dark: boolean): string {
  const cv = document.createElement("canvas");
  cv.width = 1200;
  cv.height = 800;
  const ctx = cv.getContext("2d")!;

  const bg = dark ? `hsl(${hue}, 20%, 8%)` : `hsl(${hue}, 60%, 55%)`;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 800);

  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 1200;
    const y = Math.random() * 800;
    const r = 20 + Math.random() * 120;
    const alpha = dark ? 0.03 + Math.random() * 0.06 : 0.05 + Math.random() * 0.1;
    const h2 = hue + (Math.random() - 0.5) * 40;
    const l = dark ? 5 + Math.random() * 15 : 40 + Math.random() * 30;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${h2}, 50%, ${l}%, ${alpha})`;
    ctx.fill();
  }

  ctx.fillStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)";
  ctx.font = "bold 120px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 600, 400);

  return cv.toDataURL("image/jpeg", 0.9);
}

export default function ImageReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const topImgRef = useRef<HTMLImageElement | null>(null);
  const bottomImgRef = useRef<HTMLImageElement | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothRef = useRef({ x: 0.5, y: 0.5 });
  const animRef = useRef(0);

  const [mode, setMode] = useState<RevealMode>("circle");
  const [radius, setRadius] = useState(150);
  const [loaded, setLoaded] = useState(false);

  const loadImages = useCallback((topSrc: string, bottomSrc: string) => {
    setLoaded(false);
    let loadCount = 0;
    const onLoad = () => {
      loadCount++;
      if (loadCount >= 2) setLoaded(true);
    };

    const tImg = new Image();
    tImg.crossOrigin = "anonymous";
    tImg.onload = onLoad;
    tImg.onerror = onLoad;
    tImg.src = topSrc;
    topImgRef.current = tImg;

    const bImg = new Image();
    bImg.crossOrigin = "anonymous";
    bImg.onload = onLoad;
    bImg.onerror = onLoad;
    bImg.src = bottomSrc;
    bottomImgRef.current = bImg;
  }, []);

  useEffect(() => {
    loadImages("/topimage.png", "/bottomimage.png");
  }, [loadImages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
    };
    container.addEventListener("pointermove", onPointerMove);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const CROP_BOTTOM = 0.14;

    function getBox(cw: number, ch: number, img: HTMLImageElement | null) {
      if (!img || !img.naturalWidth || !img.naturalHeight)
        return { bx: 0, by: 0, bw: cw, bh: ch };

      const iw = img.naturalWidth;
      const ih = img.naturalHeight * (1 - CROP_BOTTOM);
      const aspect = iw / ih;

      const pad = 160;
      const maxW = cw - pad * 2;
      const maxH = ch - pad * 2;

      let bw: number, bh: number;
      if (maxW / maxH > aspect) {
        bh = maxH;
        bw = bh * aspect;
      } else {
        bw = maxW;
        bh = bw / aspect;
      }

      const bx = (cw - bw) / 2;
      const by = (ch - bh) / 2;
      return { bx, by, bw, bh };
    }

    function drawInBox(
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      bx: number, by: number, bw: number, bh: number
    ) {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const cropH = ih * CROP_BOTTOM;
      ctx.drawImage(img, 0, 0, iw, ih - cropH, bx, by, bw, bh);
    }

    function render() {
      animRef.current = requestAnimationFrame(render);
      if (!container) return;

      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      const top = topImgRef.current;
      const bottom = bottomImgRef.current;

      const styles = getComputedStyle(document.documentElement);
      const bgColor = styles.getPropertyValue("--bg").trim() || "#050505";
      const overlayLine = styles.getPropertyValue("--overlay-line").trim() || "rgba(255,255,255,0.15)";
      const overlayFill = styles.getPropertyValue("--overlay-fill").trim() || "rgba(255,255,255,0.5)";

      smoothRef.current.x = lerp(smoothRef.current.x, mouseRef.current.x, 0.08);
      smoothRef.current.y = lerp(smoothRef.current.y, mouseRef.current.y, 0.08);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      const { bx, by, bw, bh } = getBox(w, h, top);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.clip();

      if (top && top.complete && top.naturalWidth) {
        drawInBox(ctx, top, bx, by, bw, bh);
      }

      if (!bottom || !bottom.complete || !bottom.naturalWidth) {
        ctx.restore();
        return;
      }

      const mx = smoothRef.current.x * w;
      const my = smoothRef.current.y * h;

      if (mode === "circle") {
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, radius, 0, Math.PI * 2);
        ctx.clip();
        drawInBox(ctx, bottom, bx, by, bw, bh);
        ctx.restore();

        ctx.strokeStyle = overlayLine;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, my, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (mode === "slider") {
        ctx.save();
        ctx.beginPath();
        ctx.rect(mx, by, bx + bw - mx, bh);
        ctx.clip();
        drawInBox(ctx, bottom, bx, by, bw, bh);
        ctx.restore();

        ctx.strokeStyle = overlayLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx, by);
        ctx.lineTo(mx, by + bh);
        ctx.stroke();

        const triH = 10;
        ctx.fillStyle = overlayFill;
        ctx.beginPath();
        ctx.moveTo(mx - triH, my - triH);
        ctx.lineTo(mx - 2, my);
        ctx.lineTo(mx - triH, my + triH);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(mx + triH, my - triH);
        ctx.lineTo(mx + 2, my);
        ctx.lineTo(mx + triH, my + triH);
        ctx.closePath();
        ctx.fill();
      } else if (mode === "gradient") {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, radius * 1.5);
        grad.addColorStop(0, overlayFill.replace("0.5", "1"));
        grad.addColorStop(0.6, overlayFill.replace("0.5", "0.4"));
        grad.addColorStop(1, overlayFill.replace("0.5", "0"));

        const tempCv = document.createElement("canvas");
        tempCv.width = Math.max(1, Math.round(w));
        tempCv.height = Math.max(1, Math.round(h));
        const tempCtx = tempCv.getContext("2d")!;
        tempCtx.beginPath();
        tempCtx.roundRect(bx, by, bw, bh, 6);
        tempCtx.clip();
        drawInBox(tempCtx, bottom, bx, by, bw, bh);

        tempCtx.globalCompositeOperation = "destination-in";
        tempCtx.fillStyle = grad;
        tempCtx.fillRect(0, 0, w, h);

        ctx.drawImage(tempCv, 0, 0);
      }

      ctx.restore();

      const borderLine = styles.getPropertyValue("--grid-line").trim() || "rgba(255,255,255,0.04)";
      ctx.strokeStyle = borderLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.stroke();
    }

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      container.removeEventListener("pointermove", onPointerMove);
    };
  }, [mode, radius, loaded]);

  const handleUpload = useCallback((which: "top" | "bottom") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        if (which === "top") {
          topImgRef.current = img;
        } else {
          bottomImgRef.current = img;
        }
      };
      img.src = url;
    };
    input.click();
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-background">
      <div ref={containerRef} className="w-full h-full relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: "none" }}
        />

        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-30">
            <span className="text-xs text-faint tracking-wider">loading images...</span>
          </div>
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 z-20 px-6 py-5 flex items-center justify-between pointer-events-none">
        <Link
          href="/"
          className="text-[11px] text-muted tracking-[0.2em] uppercase hover:text-secondary transition-colors pointer-events-auto"
        >
          back
        </Link>
        <h1 className="text-sm font-medium text-foreground tracking-wide">
          image-reveal
        </h1>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="max-w-3xl mx-auto px-6 pb-6">
          <div className="flex items-center justify-center gap-6 flex-wrap pointer-events-auto">
            <div className="flex items-center gap-1">
              {(["circle", "slider", "gradient"] as RevealMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 text-[10px] tracking-wider uppercase transition-all border rounded-sm ${
                    mode === m
                      ? "border-border-hover text-foreground bg-surface"
                      : "border-transparent text-faint hover:text-secondary"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {mode !== "slider" && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-faint tracking-wider uppercase">size</span>
                <input
                  type="range"
                  min={50}
                  max={400}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-24 accent-muted h-1"
                />
                <span className="text-[11px] text-muted font-mono w-8">{radius}</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleUpload("top")}
                className="px-3 py-1.5 text-[10px] tracking-wider uppercase text-faint hover:text-secondary border border-border rounded-sm hover:border-border-hover transition-all"
              >
                top img
              </button>
              <button
                onClick={() => handleUpload("bottom")}
                className="px-3 py-1.5 text-[10px] tracking-wider uppercase text-faint hover:text-secondary border border-border rounded-sm hover:border-border-hover transition-all"
              >
                bottom img
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
