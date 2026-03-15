"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Tool = "draw" | "erase" | "fill" | "pick";

interface Frame {
  id: number;
  data: (string | null)[];
}

const PALETTE = [
  "#000000", "#1d2b53", "#7e2553", "#008751",
  "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8",
  "#ff004d", "#ffa300", "#ffec27", "#00e436",
  "#29adff", "#83769c", "#ff77a8", "#ffccaa",
];

const GRID_SIZES = [8, 16, 24, 32];

function FrameThumb({ frame, gridSize, active, size = 40 }: { frame: Frame; gridSize: number; active: boolean; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const scale = Math.max(1, Math.ceil(size / gridSize));
    cv.width = gridSize * scale;
    cv.height = gridSize * scale;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--surface-dim").trim();
    ctx.fillStyle = bg || "#0d0d0d";
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const c = frame.data[y * gridSize + x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [frame, gridSize, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      className={`block rounded-sm border-2 transition-all bg-surface-dim ${
        active ? "border-highlight" : "border-border hover:border-border-hover"
      }`}
    />
  );
}

let frameIdCounter = 1;

function createEmptyFrame(size: number): Frame {
  return { id: frameIdCounter++, data: new Array(size * size).fill(null) };
}

function floodFill(
  data: (string | null)[],
  size: number,
  startX: number,
  startY: number,
  color: string | null
): (string | null)[] {
  const result = [...data];
  const target = result[startY * size + startX];
  if (target === color) return result;

  const stack: [number, number][] = [[startX, startY]];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const idx = y * size + x;
    if (x < 0 || x >= size || y < 0 || y >= size) continue;
    if (result[idx] !== target) continue;
    result[idx] = color;
    stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return result;
}

function renderFrameToCanvas(
  frame: Frame,
  size: number,
  canvas: HTMLCanvasElement,
  scale: number
) {
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = frame.data[y * size + x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
}

export default function PixelAnimator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gridSize, setGridSize] = useState(16);
  const [frames, setFrames] = useState<Frame[]>(() => [createEmptyFrame(16)]);
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [color, setColor] = useState("#ff004d");
  const [tool, setTool] = useState<Tool>("draw");
  const [onionSkin, setOnionSkin] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(8);
  const [showGrid, setShowGrid] = useState(true);
  const drawingRef = useRef(false);
  const lastCellRef = useRef<string | null>(null);
  const playFrameRef = useRef(0);

  const activeFrame = frames[activeFrameIdx] || frames[0];

  const getCellSize = useCallback(() => {
    const maxCanvas = Math.min(520, typeof window !== "undefined" ? window.innerHeight - 200 : 520);
    return Math.floor(maxCanvas / gridSize);
  }, [gridSize]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const cell = getCellSize();
    const totalSize = cell * gridSize;
    canvas.width = totalSize;
    canvas.height = totalSize;

    const styles = getComputedStyle(document.documentElement);
    const checkerA = styles.getPropertyValue("--checker-a").trim() || "#0d0d0d";
    const checkerB = styles.getPropertyValue("--checker-b").trim() || "#141414";
    const gridLine = styles.getPropertyValue("--grid-line").trim() || "rgba(255,255,255,0.04)";

    ctx.fillStyle = checkerA;
    ctx.fillRect(0, 0, totalSize, totalSize);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? checkerA : checkerB;
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    if (onionSkin && activeFrameIdx > 0 && !playing) {
      const prevFrame = frames[activeFrameIdx - 1];
      if (prevFrame) {
        for (let y = 0; y < gridSize; y++) {
          for (let x = 0; x < gridSize; x++) {
            const c = prevFrame.data[y * gridSize + x];
            if (c) {
              ctx.globalAlpha = 0.2;
              ctx.fillStyle = c;
              ctx.fillRect(x * cell, y * cell, cell, cell);
              ctx.globalAlpha = 1;
            }
          }
        }
      }
    }

    const frame = playing ? frames[playFrameRef.current] : activeFrame;
    if (!frame) return;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const c = frame.data[y * gridSize + x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }

    if (showGrid && !playing) {
      ctx.strokeStyle = gridLine;
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, totalSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(totalSize, i * cell);
        ctx.stroke();
      }
    }
  }, [gridSize, frames, activeFrame, activeFrameIdx, onionSkin, playing, showGrid, getCellSize]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    if (!playing) return;
    playFrameRef.current = 0;
    const interval = setInterval(() => {
      playFrameRef.current = (playFrameRef.current + 1) % frames.length;
      drawCanvas();
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [playing, fps, frames.length, drawCanvas]);

  const getCell = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      const cell = getCellSize();
      const x = Math.floor(px / cell);
      const y = Math.floor(py / cell);
      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return null;
      return { x, y };
    },
    [gridSize, getCellSize]
  );

  const applyTool = useCallback(
    (x: number, y: number) => {
      const key = `${x},${y}`;
      if (tool === "draw" || tool === "erase") {
        if (lastCellRef.current === key) return;
        lastCellRef.current = key;
      }

      setFrames((prev) => {
        const updated = [...prev];
        const frame = { ...updated[activeFrameIdx], data: [...updated[activeFrameIdx].data] };

        if (tool === "draw") {
          frame.data[y * gridSize + x] = color;
        } else if (tool === "erase") {
          frame.data[y * gridSize + x] = null;
        } else if (tool === "fill") {
          frame.data = floodFill(frame.data, gridSize, x, y, color);
        } else if (tool === "pick") {
          const picked = frame.data[y * gridSize + x];
          if (picked) setColor(picked);
          setTool("draw");
          return prev;
        }

        updated[activeFrameIdx] = frame;
        return updated;
      });
    },
    [tool, color, gridSize, activeFrameIdx]
  );

  const onPointerDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (playing) return;
      drawingRef.current = true;
      lastCellRef.current = null;
      const cell = getCell(e);
      if (cell) applyTool(cell.x, cell.y);
    },
    [getCell, applyTool, playing]
  );

  const onPointerMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || playing) return;
      const cell = getCell(e);
      if (cell) applyTool(cell.x, cell.y);
    },
    [getCell, applyTool, playing]
  );

  const onPointerUp = useCallback(() => {
    drawingRef.current = false;
    lastCellRef.current = null;
  }, []);

  const addFrame = useCallback(() => {
    const newFrame = createEmptyFrame(gridSize);
    setFrames((prev) => [...prev, newFrame]);
    setActiveFrameIdx(frames.length);
  }, [gridSize, frames.length]);

  const duplicateFrame = useCallback(() => {
    const dup: Frame = {
      id: frameIdCounter++,
      data: [...activeFrame.data],
    };
    setFrames((prev) => {
      const n = [...prev];
      n.splice(activeFrameIdx + 1, 0, dup);
      return n;
    });
    setActiveFrameIdx(activeFrameIdx + 1);
  }, [activeFrame, activeFrameIdx]);

  const deleteFrame = useCallback(() => {
    if (frames.length <= 1) {
      setFrames([createEmptyFrame(gridSize)]);
      setActiveFrameIdx(0);
      return;
    }
    setFrames((prev) => prev.filter((_, i) => i !== activeFrameIdx));
    setActiveFrameIdx(Math.min(activeFrameIdx, frames.length - 2));
  }, [frames.length, activeFrameIdx, gridSize]);

  const clearFrame = useCallback(() => {
    setFrames((prev) => {
      const updated = [...prev];
      updated[activeFrameIdx] = {
        ...updated[activeFrameIdx],
        data: new Array(gridSize * gridSize).fill(null),
      };
      return updated;
    });
  }, [activeFrameIdx, gridSize]);

  const changeGridSize = useCallback(
    (newSize: number) => {
      if (newSize === gridSize) return;
      setGridSize(newSize);
      setFrames([createEmptyFrame(newSize)]);
      setActiveFrameIdx(0);
      setPlaying(false);
    },
    [gridSize]
  );

  const exportGif = useCallback(async () => {
    const GIF = (await import("gif.js-upgrade")).default;
    const scale = Math.max(4, Math.floor(256 / gridSize));
    const gif = new GIF({
      workers: 2,
      quality: 10,
      workerScript: "/gif.worker.js",
      width: gridSize * scale,
      height: gridSize * scale,
      transparent: 0x000000,
    });

    for (const frame of frames) {
      const cv = document.createElement("canvas");
      renderFrameToCanvas(frame, gridSize, cv, scale);
      gif.addFrame(cv, { delay: 1000 / fps, copy: true });
    }

    gif.on("finished", (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pixel-animation.gif";
      a.click();
      URL.revokeObjectURL(url);
    });

    gif.render();
  }, [frames, gridSize, fps]);

  const exportCSS = useCallback(() => {
    const scale = Math.max(4, Math.floor(256 / gridSize));
    const totalW = gridSize * scale * frames.length;
    const cv = document.createElement("canvas");
    cv.width = totalW;
    cv.height = gridSize * scale;
    const ctx = cv.getContext("2d")!;

    frames.forEach((frame, i) => {
      const tmpCv = document.createElement("canvas");
      renderFrameToCanvas(frame, gridSize, tmpCv, scale);
      ctx.drawImage(tmpCv, i * gridSize * scale, 0);
    });

    cv.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "spritesheet.png";
      a.click();
      URL.revokeObjectURL(url);
    });

    const frameW = gridSize * scale;
    const css = `.sprite {
  width: ${frameW}px;
  height: ${gridSize * scale}px;
  background: url('spritesheet.png') 0 0;
  animation: sprite-anim ${(frames.length / fps).toFixed(2)}s steps(${frames.length}) infinite;
}

@keyframes sprite-anim {
  to { background-position: -${totalW}px 0; }
}`;

    const cssBlob = new Blob([css], { type: "text/css" });
    const cssUrl = URL.createObjectURL(cssBlob);
    const cssA = document.createElement("a");
    cssA.href = cssUrl;
    cssA.download = "sprite-animation.css";
    setTimeout(() => {
      cssA.click();
      URL.revokeObjectURL(cssUrl);
    }, 500);
  }, [frames, gridSize, fps]);

  const toolCursor = tool === "draw" ? "crosshair" : tool === "erase" ? "cell" : tool === "fill" ? "pointer" : "copy";

  return (
    <div className="fixed inset-0 z-0 bg-elevated flex flex-col overflow-hidden select-none">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <Link
          href="/"
          className="text-[11px] text-faint tracking-[0.2em] uppercase hover:text-secondary transition-colors"
        >
          back
        </Link>
        <h1 className="text-sm text-secondary tracking-wide font-medium">pixel-animator</h1>
        <div className="flex items-center gap-2">
          {GRID_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => changeGridSize(s)}
              className={`text-[10px] px-2 py-1 rounded-sm border transition-colors ${
                gridSize === s
                  ? "border-border-hover text-secondary bg-surface"
                  : "border-transparent text-faint hover:text-muted"
              }`}
            >
              {s}x{s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-11 border-r border-border flex flex-col items-center py-3 gap-1 shrink-0">
          {([
            ["draw", "D", "draw"],
            ["erase", "E", "erase"],
            ["fill", "F", "fill"],
            ["pick", "I", "eyedropper"],
          ] as [Tool, string, string][]).map(([t, key, label]) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`relative group w-8 h-8 flex items-center justify-center rounded-sm text-[11px] font-mono transition-all ${
                tool === t
                  ? "bg-highlight text-white"
                  : "text-muted hover:text-foreground hover:bg-surface"
              }`}
            >
              {key}
              <span className="absolute left-full ml-2 px-2 py-1 bg-surface border border-border-hover rounded text-[10px] text-secondary tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30">
                {label}
              </span>
            </button>
          ))}

          <div className="w-5 h-px bg-border my-1" />

          <button
            onClick={() => setOnionSkin(!onionSkin)}
            className={`relative group w-8 h-8 flex items-center justify-center rounded-sm text-[11px] font-mono transition-all ${
              onionSkin
                ? "bg-surface text-foreground border border-border-hover"
                : "text-muted hover:text-foreground hover:bg-surface border border-transparent"
            }`}
          >
            O
            <span className="absolute left-full ml-2 px-2 py-1 bg-surface border border-border-hover rounded text-[10px] text-secondary tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30">
              onion skin
            </span>
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`relative group w-8 h-8 flex items-center justify-center rounded-sm text-[11px] font-mono transition-all ${
              showGrid
                ? "bg-surface text-foreground border border-border-hover"
                : "text-muted hover:text-foreground hover:bg-surface border border-transparent"
            }`}
          >
            G
            <span className="absolute left-full ml-2 px-2 py-1 bg-surface border border-border-hover rounded text-[10px] text-secondary tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30">
              grid
            </span>
          </button>

          <div className="w-5 h-px bg-border my-1" />

          <button
            onClick={clearFrame}
            className="relative group w-8 h-8 flex items-center justify-center rounded-sm text-[11px] font-mono text-muted hover:text-highlight hover:bg-accent-dim transition-all"
          >
            X
            <span className="absolute left-full ml-2 px-2 py-1 bg-surface border border-border-hover rounded text-[10px] text-secondary tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30">
              clear frame
            </span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center relative">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{
              cursor: playing ? "default" : toolCursor,
              imageRendering: "pixelated",
              maxWidth: "90%",
              maxHeight: "90%",
            }}
            className="rounded-sm"
          />
        </div>

        <div className="w-44 border-l border-border flex flex-col shrink-0">
          <div className="px-3 pt-3 pb-2">
            <span className="text-[9px] text-faint tracking-[0.15em] uppercase block mb-2">color</span>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setTool("draw"); }}
                  className="w-7 h-7 rounded-sm border transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "var(--text-primary)" : "var(--border)",
                    transform: color === c ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => { setColor(e.target.value); setTool("draw"); }}
                className="w-7 h-7 border border-border rounded-sm bg-transparent p-0.5 shrink-0"
              />
              <span className="text-[10px] text-faint tracking-wider font-mono">{color.toUpperCase()}</span>
            </div>
          </div>

          <div className="border-t border-border px-3 pt-2 pb-2">
            <span className="text-[9px] text-faint tracking-[0.15em] uppercase block mb-2">playback</span>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setPlaying(!playing)}
                className={`flex-1 py-1.5 text-[10px] tracking-wider uppercase rounded-sm border transition-all ${
                  playing
                    ? "bg-highlight border-highlight text-white"
                    : "border-border-hover text-muted hover:text-secondary hover:border-faint"
                }`}
              >
                {playing ? "stop" : "play"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={24}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="flex-1 accent-highlight h-1"
              />
              <span className="text-[13px] text-secondary font-mono w-12 text-right">{fps} <span className="text-[9px] text-faint">fps</span></span>
            </div>
          </div>

          <div className="border-t border-border px-3 pt-2 pb-3">
            <span className="text-[9px] text-faint tracking-[0.15em] uppercase block mb-2">export</span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={exportGif}
                className="py-1.5 text-[10px] tracking-wider uppercase text-muted hover:text-secondary border border-border rounded-sm hover:border-border-hover transition-all"
              >
                download .gif
              </button>
              <button
                onClick={exportCSS}
                className="py-1.5 text-[10px] tracking-wider uppercase text-muted hover:text-secondary border border-border rounded-sm hover:border-border-hover transition-all"
              >
                css spritesheet
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 mb-2.5">
          <span className="text-[9px] text-faint tracking-[0.2em] uppercase shrink-0">
            frames
          </span>
          <span className="text-[10px] text-muted font-mono">{frames.length}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={addFrame}
              className="h-7 px-2.5 flex items-center gap-1.5 text-muted hover:text-secondary border border-border rounded-sm hover:border-border-hover transition-colors text-[10px] tracking-wider"
            >
              <span className="text-sm">+</span> add
            </button>
            <button
              onClick={duplicateFrame}
              className="h-7 px-2.5 flex items-center gap-1.5 text-muted hover:text-secondary border border-border rounded-sm hover:border-border-hover transition-colors text-[10px] tracking-wider"
            >
              <span>⧉</span> dupe
            </button>
            <button
              onClick={deleteFrame}
              className="h-7 px-2.5 flex items-center gap-1.5 text-muted hover:text-highlight border border-border rounded-sm hover:border-border-hover transition-colors text-[10px] tracking-wider"
            >
              <span>−</span> delete
            </button>
          </div>
        </div>

        <div className="flex items-end gap-2 overflow-x-auto pb-1">
          {frames.map((frame, i) => (
            <button
              key={frame.id}
              onClick={() => { setActiveFrameIdx(i); setPlaying(false); }}
              className="shrink-0 flex flex-col items-center gap-1"
            >
              <FrameThumb
                frame={frame}
                gridSize={gridSize}
                active={i === activeFrameIdx && !playing}
                size={56}
              />
              <span className={`text-[9px] font-mono transition-colors ${
                i === activeFrameIdx && !playing ? "text-highlight" : "text-faint"
              }`}>
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
