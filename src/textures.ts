import * as THREE from 'three';

// Prozedural erzeugte Canvas-Texturen, damit Materialien in 3D natürlicher wirken.
// Alle Texturen werden pro Farbe gecacht.

const cache = new Map<string, THREE.CanvasTexture>();

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return [canvas, canvas.getContext('2d')!];
}

function finishTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function parseHex(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** Farbe aufhellen/abdunkeln: factor 1 = unverändert, <1 dunkler, >1 heller. */
function shade(hex: string, factor: number): string {
  const [r, g, b] = parseHex(hex);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Deterministischer Pseudozufall, damit Texturen bei jedem Aufbau gleich aussehen
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Parkettboden: horizontale Dielen mit Farbvariation und Maserung. Kachel = 2 m x 2 m. */
export function woodFloorTexture(baseHex: string): THREE.CanvasTexture {
  const key = `floor:${baseHex}`;
  if (cache.has(key)) return cache.get(key)!;

  const size = 512;
  const [canvas, ctx] = makeCanvas(size);
  const rand = rng(42);
  const rowH = 64; // 25 cm Dielenbreite
  const plankW = 256; // 1 m Dielenlänge

  for (let row = 0; row < size / rowH; row++) {
    const offset = (row % 2) * (plankW / 2) + Math.floor(rand() * 40);
    for (let x = -plankW; x < size + plankW; x += plankW) {
      const tone = 0.88 + rand() * 0.22;
      ctx.fillStyle = shade(baseHex, tone);
      ctx.fillRect(x + offset, row * rowH, plankW, rowH);
      // Maserung: feine dunklere Linien
      ctx.strokeStyle = shade(baseHex, tone * 0.9);
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 5; i++) {
        const y = row * rowH + 4 + rand() * (rowH - 8);
        ctx.beginPath();
        ctx.moveTo(x + offset + 4, y);
        ctx.bezierCurveTo(
          x + offset + plankW * 0.3, y + (rand() - 0.5) * 8,
          x + offset + plankW * 0.6, y + (rand() - 0.5) * 8,
          x + offset + plankW - 4, y + (rand() - 0.5) * 6
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Stoßfuge am Dielenende (dezent)
      ctx.fillStyle = 'rgba(50,32,16,0.3)';
      ctx.fillRect(x + offset - 1, row * rowH, 1, rowH);
    }
  }
  // Längsfugen (dezent)
  ctx.fillStyle = 'rgba(50,32,16,0.35)';
  for (let row = 0; row <= size / rowH; row++) ctx.fillRect(0, row * rowH - 1, size, 1);

  const tex = finishTexture(canvas);
  cache.set(key, tex);
  return tex;
}

/** Holzmaserung für Möbel (Tische, Schränke, Bettrahmen). */
export function woodGrainTexture(baseHex: string): THREE.CanvasTexture {
  const key = `wood:${baseHex}`;
  if (cache.has(key)) return cache.get(key)!;

  const size = 256;
  const [canvas, ctx] = makeCanvas(size);
  const rand = rng(7);

  ctx.fillStyle = shade(baseHex, 1);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    const x = rand() * size;
    const tone = 0.85 + rand() * 0.3;
    ctx.strokeStyle = shade(baseHex, tone);
    ctx.lineWidth = 1 + rand() * 3;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.bezierCurveTo(
      x + (rand() - 0.5) * 30, size * 0.33,
      x + (rand() - 0.5) * 30, size * 0.66,
      x + (rand() - 0.5) * 20, size + 10
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = finishTexture(canvas);
  cache.set(key, tex);
  return tex;
}

/** Stoff: feines Gewebe-Muster für Sofas, Betten, Teppiche. */
export function fabricTexture(baseHex: string): THREE.CanvasTexture {
  const key = `fabric:${baseHex}`;
  if (cache.has(key)) return cache.get(key)!;

  const size = 128;
  const [canvas, ctx] = makeCanvas(size);
  const rand = rng(13);

  ctx.fillStyle = shade(baseHex, 1);
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % size;
    const py = Math.floor(i / 4 / size);
    const weave = ((px + py) % 2) * 10 - 5;
    const noise = (rand() - 0.5) * 22;
    d[i] = Math.max(0, Math.min(255, d[i] + weave + noise));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + weave + noise));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + weave + noise));
  }
  ctx.putImageData(img, 0, 0);

  const tex = finishTexture(canvas);
  tex.repeat.set(3, 3);
  cache.set(key, tex);
  return tex;
}

/** Feiner Putz für Wände und Decken. */
export function plasterTexture(baseHex: string): THREE.CanvasTexture {
  const key = `plaster:${baseHex}`;
  if (cache.has(key)) return cache.get(key)!;

  const size = 256;
  const [canvas, ctx] = makeCanvas(size);
  const rand = rng(99);

  ctx.fillStyle = shade(baseHex, 1);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const tone = 0.94 + rand() * 0.12;
    ctx.fillStyle = shade(baseHex, tone);
    ctx.globalAlpha = 0.35;
    const r = 0.5 + rand() * 2;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const tex = finishTexture(canvas);
  cache.set(key, tex);
  return tex;
}

/** Weicher Himmel-Verlauf als Hintergrund. */
export function skyTexture(): THREE.CanvasTexture {
  const key = 'sky';
  if (cache.has(key)) return cache.get(key)!;

  const [canvas, ctx] = makeCanvas(512);
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#6fa3d8');
  grad.addColorStop(0.55, '#a8c8e8');
  grad.addColorStop(0.8, '#e8eef2');
  grad.addColorStop(1, '#f2ece2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = finishTexture(canvas);
  cache.set(key, tex);
  return tex;
}
