"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { logos, type LogoEntry } from "@/data/logos";
import Link from "next/link";

const VOXEL_SIZE = 0.125;
const SPACING = 0.1375;
const GRID_SIZE = 80;
const MAX_VOXELS = 60000;

interface VoxelData {
  positions: Float32Array;
  depths: Float32Array;
  aoValues: Float32Array;
  count: number;
}

function rasterizeSVGPath(pathData: string, viewBoxSize: number): boolean[][] {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  const p = new Path2D(pathData);
  const scale = GRID_SIZE / viewBoxSize;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fill(p);
  const imageData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
  const grid: boolean[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      grid[y][x] = imageData.data[(y * GRID_SIZE + x) * 4 + 3] > 128;
    }
  }
  return grid;
}

function computeSDF(grid: boolean[][]): number[][] {
  const sdf: number[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    sdf[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!grid[y][x]) { sdf[y][x] = 0; continue; }
      let minDist = Infinity;
      const r = 12;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE || !grid[ny][nx]) {
            minDist = Math.min(minDist, Math.max(Math.abs(dx), Math.abs(dy)));
          }
        }
      }
      sdf[y][x] = minDist;
    }
  }
  return sdf;
}

function generateVoxels(grid: boolean[][], sdf: number[][]): VoxelData {
  const positions: number[] = [];
  const depths: number[] = [];
  const aoValues: number[] = [];
  const halfGrid = GRID_SIZE / 2;
  const maxSDF = 8;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!grid[y][x]) continue;
      const depth = Math.min(sdf[y][x], maxSDF);
      const layers = Math.max(1, Math.ceil(depth * 1.2));
      for (let z = -layers; z <= layers; z++) {
        const isShell = z === -layers || z === layers ||
          x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1 ||
          !grid[y - 1]?.[x] || !grid[y + 1]?.[x] ||
          !grid[y]?.[x - 1] || !grid[y]?.[x + 1];
        if (!isShell && Math.abs(z) < layers - 1) continue;
        positions.push((x - halfGrid) * SPACING, -(y - halfGrid) * SPACING, z * SPACING);
        const nd = depth / maxSDF;
        depths.push(nd);
        const ef = 1.0 - nd * 0.6;
        const zf = Math.abs(z) / Math.max(layers, 1);
        aoValues.push(Math.max(0.3, ef * (0.5 + zf * 0.5)));
        if (positions.length / 3 >= MAX_VOXELS) break;
      }
      if (positions.length / 3 >= MAX_VOXELS) break;
    }
    if (positions.length / 3 >= MAX_VOXELS) break;
  }
  return {
    positions: new Float32Array(positions),
    depths: new Float32Array(depths),
    aoValues: new Float32Array(aoValues),
    count: positions.length / 3,
  };
}

function hexToGlsl(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return `${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}`;
}

function hexToGradient(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const inner = `${Math.round(r * 0.1)}, ${Math.round(g * 0.1)}, ${Math.round(b * 0.1)}`;
  const mid = `${Math.round(r * 0.04)}, ${Math.round(g * 0.04)}, ${Math.round(b * 0.04)}`;
  return `radial-gradient(ellipse at center, rgb(${inner}) 0%, rgb(${mid}) 40%, #050505 100%)`;
}

function parseSvgInput(input: string): { paths: string; viewBox: number } {
  const trimmed = input.trim();

  if (trimmed.startsWith("<")) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    const pathEls = doc.querySelectorAll("path");

    let viewBox = 24;
    if (svgEl) {
      const vb = svgEl.getAttribute("viewBox");
      if (vb) {
        const parts = vb.split(/[\s,]+/).map(Number);
        if (parts.length === 4) viewBox = Math.max(parts[2], parts[3]);
      } else {
        const w = parseFloat(svgEl.getAttribute("width") || "0");
        const h = parseFloat(svgEl.getAttribute("height") || "0");
        if (w > 0 && h > 0) viewBox = Math.max(w, h);
      }
    }

    const allPaths = Array.from(pathEls)
      .map(p => p.getAttribute("d"))
      .filter(Boolean)
      .join(" ");

    return { paths: allPaths, viewBox };
  }

  return { paths: trimmed, viewBox: 24 };
}

const SIMPLEX_GLSL = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

function createMaterial(color: string, glowColor: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.35,
    metalness: 0.15,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uIntro = { value: 0 };

    shader.vertexShader = shader.vertexShader.replace("#include <common>",
      `#include <common>
      attribute float aAO; attribute float aDepth;
      attribute vec3 aScatter; attribute vec3 aTarget; attribute float aDelay;
      uniform float uTime; uniform float uIntro;
      varying float vAO; varying float vEnergy; varying float vDepth; varying float vPulse;
      ${SIMPLEX_GLSL}
      float easeOutElastic(float t){
        if(t<=0.0)return 0.0;if(t>=1.0)return 1.0;
        float p=0.4;return pow(2.0,-10.0*t)*sin((t-p/4.0)*(6.283185/p))+1.0;
      }`
    );

    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>",
      `#include <begin_vertex>
      vAO=aAO; vDepth=aDepth;
      float introProgress=clamp((uIntro-aDelay)/2.0,0.0,1.0);
      float elastic=easeOutElastic(introProgress);
      vec3 worldPos=mix(aScatter,aTarget,elastic);
      if(introProgress>=1.0){
        float n=snoise(vec3(aTarget.xy*0.8,uTime*0.3));
        worldPos.z+=n*0.15;
        worldPos.y+=snoise(vec3(aTarget.xz*0.56,uTime*0.24))*0.08;
      }
      transformed=worldPos+position*${VOXEL_SIZE.toFixed(4)};
      float sweep=sin(uTime*1.5+worldPos.x*0.5+worldPos.y*0.3)*0.5+0.5;
      vEnergy=pow(sweep,4.0)*0.8;
      float dist=length(aTarget.xy);
      float pulseWave=sin(dist*2.0-uTime*4.0)*0.5+0.5;
      float pulseMask=pow(pulseWave,8.0)*smoothstep(0.0,1.0,introProgress);
      float pulseInterval=mod(uTime,5.0);
      float pulseActive=smoothstep(0.0,0.3,pulseInterval)*smoothstep(1.5,0.5,pulseInterval);
      vPulse=pulseMask*pulseActive;`
    );

    shader.fragmentShader = shader.fragmentShader.replace("#include <common>",
      `#include <common>
      varying float vAO; varying float vEnergy; varying float vDepth; varying float vPulse;`
    );

    shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>",
      `#include <dithering_fragment>
      gl_FragColor.rgb*=vAO;
      vec3 glow=vec3(${glowColor});
      gl_FragColor.rgb+=glow*vEnergy*0.6;
      gl_FragColor.rgb+=glow*vDepth*0.08;
      gl_FragColor.rgb+=glow*vPulse*1.2;`
    );

    mat.userData.shader = shader;
  };

  return mat;
}

interface SceneCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  mesh: THREE.InstancedMesh | null;
  material: THREE.MeshStandardMaterial | null;
  clock: THREE.Clock;
  animFrame: number;
  introStart: number;
  orbitAngle: number;
  orbitY: number;
  isDragging: boolean;
  dragStart: { x: number; y: number };
  autoOrbit: boolean;
}

export default function VoxelLogos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneCtx | null>(null);

  const [activeLogo, setActiveLogo] = useState<string>("claude");
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [customSvg, setCustomSvg] = useState("");
  const [customColor, setCustomColor] = useState("#ff6b35");
  const [bgGradient, setBgGradient] = useState("");

  const loadIntoScene = useCallback((color: string, glowColor: string, pathData: string, viewBoxSize: number, ctx: SceneCtx) => {
    if (ctx.mesh) {
      ctx.scene.remove(ctx.mesh);
      ctx.mesh.dispose();
    }
    if (ctx.material) {
      ctx.material.dispose();
    }

    const grid = rasterizeSVGPath(pathData, viewBoxSize);
    const sdf = computeSDF(grid);
    const voxelData = generateVoxels(grid, sdf);

    if (voxelData.count === 0) return;

    const material = createMaterial(color, glowColor);
    ctx.material = material;

    const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);

    geometry.setAttribute("aAO", new THREE.InstancedBufferAttribute(voxelData.aoValues, 1));
    geometry.setAttribute("aDepth", new THREE.InstancedBufferAttribute(voxelData.depths, 1));

    const scatter = new Float32Array(voxelData.count * 3);
    for (let i = 0; i < voxelData.count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 60 + Math.random() * 40;
      scatter[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      scatter[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      scatter[i * 3 + 2] = r * Math.cos(phi);
    }
    geometry.setAttribute("aScatter", new THREE.InstancedBufferAttribute(scatter, 3));
    geometry.setAttribute("aTarget", new THREE.InstancedBufferAttribute(new Float32Array(voxelData.positions), 3));

    const delays = new Float32Array(voxelData.count);
    for (let i = 0; i < voxelData.count; i++) {
      const tx = voxelData.positions[i * 3], ty = voxelData.positions[i * 3 + 1], tz = voxelData.positions[i * 3 + 2];
      delays[i] = Math.sqrt(tx * tx + ty * ty + tz * tz) * 0.15;
    }
    geometry.setAttribute("aDelay", new THREE.InstancedBufferAttribute(delays, 1));

    const mesh = new THREE.InstancedMesh(geometry, material, voxelData.count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < voxelData.count; i++) {
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    ctx.scene.add(mesh);
    ctx.mesh = mesh;
    ctx.introStart = ctx.clock.getElapsedTime();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(0, 0, 42);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight), 1.2, 0.6, 0.3
    ));
    composer.addPass(new OutputPass());

    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    keyLight.position.set(10, 15, 20); scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xffd4b8, 1.8);
    rimLight.position.set(-15, 5, -10); scene.add(rimLight);
    const fillLight = new THREE.DirectionalLight(0xfff0e6, 0.6);
    fillLight.position.set(0, -10, 15); scene.add(fillLight);
    scene.add(new THREE.AmbientLight(0x331a0d, 0.4));

    const ctx: SceneCtx = {
      scene, camera, renderer, composer, mesh: null, material: null,
      clock: new THREE.Clock(), animFrame: 0, introStart: 0,
      orbitAngle: 0, orbitY: 0, isDragging: false,
      dragStart: { x: 0, y: 0 }, autoOrbit: true,
    };
    sceneRef.current = ctx;

    const logo = logos[0];
    const viewBoxSize = logo.id === "claude" ? 100 : 24;
    loadIntoScene(logo.color, logo.glowColor, logo.path, viewBoxSize, ctx);
    setBgGradient(hexToGradient(logo.color));
    setLoading(false);

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).tagName !== "CANVAS") return;
      ctx.isDragging = true;
      ctx.autoOrbit = false;
      ctx.dragStart = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!ctx.isDragging) return;
      const dx = e.clientX - ctx.dragStart.x;
      const dy = e.clientY - ctx.dragStart.y;
      ctx.orbitAngle += dx * 0.005;
      ctx.orbitY = Math.max(-20, Math.min(20, ctx.orbitY - dy * 0.1));
      ctx.dragStart = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = () => { ctx.isDragging = false; };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const animate = () => {
      ctx.animFrame = requestAnimationFrame(animate);
      const elapsed = ctx.clock.getElapsedTime();
      const introElapsed = elapsed - ctx.introStart;

      if (ctx.material?.userData.shader) {
        ctx.material.userData.shader.uniforms.uTime.value = elapsed;
        ctx.material.userData.shader.uniforms.uIntro.value = introElapsed;
      }

      if (ctx.autoOrbit) {
        ctx.orbitAngle = elapsed * 0.08;
        ctx.orbitY = Math.sin(elapsed * 0.15) * 8;
      }

      camera.position.x = Math.cos(ctx.orbitAngle) * 42;
      camera.position.z = Math.sin(ctx.orbitAngle) * 42;
      camera.position.y = ctx.orbitY;
      camera.lookAt(0, 0, 0);

      composer.render();
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      cancelAnimationFrame(ctx.animFrame);
      renderer.dispose();
      if (ctx.material) ctx.material.dispose();
      if (ctx.mesh) {
        ctx.mesh.geometry.dispose();
        ctx.mesh.dispose();
      }
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchLogo = useCallback((logoId: string) => {
    if (logoId === activeLogo || !sceneRef.current) return;
    setTransitioning(true);
    setActiveLogo(logoId);
    const logo = logos.find(l => l.id === logoId);
    if (!logo || !sceneRef.current) return;
    setBgGradient(hexToGradient(logo.color));
    const ctx = sceneRef.current;
    setTimeout(() => {
      if (!sceneRef.current) return;
      const vb = logo.id === "claude" ? 100 : 24;
      loadIntoScene(logo.color, logo.glowColor, logo.path, vb, ctx);
      setTransitioning(false);
    }, 100);
  }, [activeLogo, loadIntoScene]);

  const loadCustomSvg = useCallback(() => {
    if (!customSvg.trim() || !sceneRef.current) return;
    const { paths, viewBox } = parseSvgInput(customSvg);
    if (!paths) return;
    setTransitioning(true);
    setActiveLogo("custom");
    setBgGradient(hexToGradient(customColor));
    const glowColor = hexToGlsl(customColor);
    const ctx = sceneRef.current;
    setTimeout(() => {
      if (!sceneRef.current) return;
      loadIntoScene(customColor, glowColor, paths, viewBox, ctx);
      setTransitioning(false);
    }, 100);
  }, [customSvg, customColor, loadIntoScene]);

  const currentLogo = logos.find(l => l.id === activeLogo);

  return (
    <div className="fixed inset-0 z-0">
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050505]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-4 h-4 bg-[#ff6b35]" style={{ animation: "spin 1s linear infinite" }} />
            <span className="text-xs text-[#666] tracking-wider">computing voxels</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) perspective(100px) rotateX(60deg); } }`}</style>
        </div>
      )}

      <div
        ref={containerRef}
        className={`w-full h-full transition-opacity duration-300 ${transitioning ? "opacity-60" : "opacity-100"}`}
        style={{
          background: bgGradient,
          transition: "background 1s ease",
        }}
      />

      <div className="absolute top-0 left-0 right-0 z-20 px-6 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="text-[11px] text-[#6a6a6a] tracking-[0.2em] uppercase hover:text-[#ccc] transition-colors duration-300"
        >
          back
        </Link>
        <div className="text-right">
          <h1 className="text-sm font-medium text-[#e8e8e8] tracking-wide">
            voxel-logos
          </h1>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="flex items-center justify-center gap-1 flex-wrap px-6 pb-6">
          {logos.map((logo) => (
            <button
              key={logo.id}
              onClick={() => switchLogo(logo.id)}
              className={`px-3 py-1.5 text-[10px] tracking-wider uppercase transition-all duration-300 border rounded-sm ${
                activeLogo === logo.id
                  ? "border-[#444] text-[#eee]"
                  : "border-transparent text-[#666] hover:text-[#bbb]"
              }`}
              style={activeLogo === logo.id && currentLogo ? { borderBottomColor: currentLogo.color } : undefined}
            >
              {logo.name}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute right-5 top-1/2 -translate-y-1/2 z-20">
        <div className="flex flex-col gap-3 bg-[#111111]/60 backdrop-blur-sm border border-[#2a2a2a]/60 rounded-md p-3 w-44 opacity-60 hover:opacity-100 transition-opacity duration-500">
          <span className="text-[9px] text-[#888] tracking-[0.2em] uppercase">custom svg</span>
          <textarea
            value={customSvg}
            onChange={(e) => setCustomSvg(e.target.value)}
            placeholder="paste svg markup or path d= data..."
            rows={4}
            className="bg-transparent border border-[#2a2a2a] rounded-sm px-2 py-1.5 text-[10px] text-[#e0e0e0] tracking-wider resize-none focus:outline-none focus:border-[#444] placeholder:text-[#555]"
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-6 h-6 border border-[#2a2a2a] rounded-sm bg-transparent p-0.5 shrink-0"
            />
            <button
              onClick={loadCustomSvg}
              className="flex-1 py-1.5 text-[10px] tracking-wider uppercase text-[#888] hover:text-[#eee] border border-[#2a2a2a] rounded-sm hover:border-[#444] transition-all duration-300"
            >
              render
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
