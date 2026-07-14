import * as THREE from 'three';
import { fabricTexture } from './textures';
import { cornerSofaLayout, cornerSofaSide } from './cornerSofa';
import type { FurnitureItem } from './model';

function fabric(color: string, lighter = false): THREE.MeshStandardMaterial {
  const c = lighter ? lighten(color, 1.12) : color;
  return new THREE.MeshStandardMaterial({ map: fabricTexture(c), roughness: 0.94, metalness: 0 });
}

function legMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#2a2a2e', metalness: 0.55, roughness: 0.35 });
}

function lighten(hex: string, f: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const c = (v: number) => Math.min(255, Math.round(v * f));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function leg(g: THREE.Group, x: number, z: number): void {
  g.add(box(0.04, 0.14, 0.04, legMat(), x, 0, z));
}

function addSeatCushion(g: THREE.Group, cx: number, cz: number, mw: number, md: number, y: number, mat: THREE.Material, gap = 0.025): void {
  g.add(box(mw - gap, 0.11, md - gap, mat, cx, y, cz));
}

function addBackCushionMain(g: THREE.Group, cx: number, cz: number, bw: number, y: number, mat: THREE.Material, backZ: number): void {
  const backH = 0.38;
  const backD = 0.14;
  const m = box(bw - 0.02, backH, backD, mat, cx, y + 0.02, backZ + backD * 0.3);
  m.rotation.x = 0.1;
  g.add(m);
}

function addBackCushionChaise(
  g: THREE.Group,
  cz: number,
  moduleD: number,
  y: number,
  mat: THREE.Material,
  backX: number,
  side: 'left' | 'right'
): void {
  const backH = 0.38;
  const backD = 0.14;
  const m = box(backD, backH, moduleD - 0.02, mat, backX, y + 0.02, cz);
  m.rotation.z = side === 'right' ? -0.08 : 0.08;
  g.add(m);
}

/** Modulares Ecksofa nach Referenz: Hauptteil an Rückwand, Chaise nach vorne, einzelne Kissen. */
export function buildCornerSofa3D(g: THREE.Group, item: FurnitureItem): void {
  const w = item.width / 100;
  const d = item.depth / 100;
  const h = item.height / 100;
  const side = cornerSofaSide(item.type);
  const layout = cornerSofaLayout(item.width, item.depth, side);

  const seatD = layout.seatDepth / 100;
  const hw = w / 2;
  const hd = d / 2;
  const chaiseLen = layout.chaise.h / 100;
  const chaiseX = layout.chaise.cx / 100;
  const chaiseZ = layout.chaise.cy / 100;
  const mainZ = layout.main.cy / 100;

  const body = fabric(item.color);
  const cushion = fabric(item.color, true);
  const backMat = fabric(item.color);
  const pillow = fabric('#9aa3ad');

  const legH = 0.14;
  const seatY = legH;
  const armW = 0.14;
  const armH = Math.min(0.52, h * 0.65);

  const mainBackZ = hd - seatD * 0.55;
  const chaiseBackX = side === 'right' ? hw - seatD * 0.55 : -hw + seatD * 0.55;

  // Beine
  const inset = 0.08;
  leg(g, -hw + inset, mainZ - seatD / 2 + inset);
  leg(g, hw - seatD + inset, mainZ - seatD / 2 + inset);
  leg(g, chaiseX, -hd + inset);
  leg(g, chaiseX, hd - seatD + inset);

  // Untergestell
  g.add(box(w - seatD + 0.02, 0.05, seatD - 0.02, body, -seatD / 2, legH - 0.05, mainZ));
  g.add(box(seatD - 0.02, 0.05, chaiseLen - 0.02, body, chaiseX, legH - 0.05, chaiseZ));

  // Hauptteil: 3 Sitzkissen
  const mainModules = 3;
  const modW = (w - seatD) / mainModules;
  for (let i = 0; i < mainModules; i++) {
    const cx = -hw + seatD / 2 + modW * (i + 0.5);
    addSeatCushion(g, cx, mainZ, modW, seatD, seatY, cushion);
    addBackCushionMain(g, cx, mainZ, modW, seatY, backMat, mainBackZ);
  }

  // Eckmodul
  const cornerX = chaiseX;
  const cornerZ = hd - seatD - seatD / 2;
  addSeatCushion(g, cornerX, cornerZ, seatD, seatD, seatY, cushion, 0.02);
  addBackCushionMain(g, cornerX, cornerZ, seatD, seatY, backMat, mainBackZ);

  // Chaise: 2 Module
  const chaiseModules = 2;
  const modD = chaiseLen / chaiseModules;
  for (let i = 0; i < chaiseModules; i++) {
    const cz = -hd + modD * (i + 0.5);
    addSeatCushion(g, chaiseX, cz, seatD, modD, seatY, cushion);
    addBackCushionChaise(g, cz, modD, seatY, backMat, chaiseBackX, side);
  }

  // Armlehne links
  const outerArmX = side === 'right' ? -hw + armW / 2 : hw - armW / 2;
  g.add(box(armW, armH, seatD - 0.03, body, outerArmX, legH, mainZ));
  g.add(box(armW + 0.02, 0.06, seatD - 0.06, cushion, outerArmX, legH + armH, mainZ));

  // Armlehne vorne (Chaise-Ende)
  g.add(box(armW - 0.01, armH * 0.9, armW, body, chaiseX, legH, -hd + armW / 2));
  g.add(box(armW, 0.05, armW + 0.02, cushion, chaiseX, legH + armH * 0.9, -hd + armW / 2));

  // Dekokissen
  g.add(box(0.38, 0.2, 0.1, pillow, -hw * 0.35, seatY + 0.42, mainBackZ - 0.04));
  g.add(box(0.32, 0.18, 0.09, pillow, chaiseX, seatY + 0.4, -hd + chaiseLen * 0.35));
}
