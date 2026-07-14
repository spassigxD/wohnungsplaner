import * as THREE from 'three';
import { fabricTexture } from './textures';
import { cornerSofaLayout, cornerSofaSide } from './cornerSofa';
import type { FurnitureItem } from './model';

function mat(color: string | number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, ...opts });
}

function fabric(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map: fabricTexture(color), roughness: 0.96, metalness: 0 });
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function roundBox(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, tiltX = 0): THREE.Mesh {
  const m = box(w, h, d, material, x, y, z);
  m.rotation.x = tiltX;
  return m;
}

function foot(g: THREE.Group, material: THREE.Material, x: number, z: number): void {
  g.add(box(0.05, 0.04, 0.05, material, x, 0, z));
}

/** Gepolstertes Ecksofa mit Kissen, Rahmen und Armlehnen – kein Klotz-Look. */
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

  const frame = mat('#3a4248', { roughness: 0.9 });
  const body = fabric(item.color);
  const cushion = fabric(item.color);
  const pillow = fabric('#8a939c');

  const skirtH = 0.055;
  const cushionH = 0.13;
  const seatTop = skirtH + cushionH;
  const backH = Math.min(0.42, h * 0.52);
  const backD = Math.min(0.17, seatD * 0.2);
  const armW = Math.min(0.15, seatD * 0.62);
  const armH = Math.min(0.58, h * 0.72);

  const mainBackZ = -hd + seatD - backD * 0.45;
  const mainBackW = w - seatD;
  const mainBackX = side === 'right' ? -seatD / 2 : seatD / 2;
  const chaiseBackX = side === 'right' ? hw - backD * 0.45 : -hw + backD * 0.45;

  // --- Untergestell / Sockel ---
  g.add(box(w - 0.02, skirtH, seatD - 0.02, frame, 0, 0, mainZ));
  g.add(box(seatD - 0.02, skirtH, chaiseLen - 0.02, frame, chaiseX, 0, chaiseZ));

  // Füße
  const footInset = 0.07;
  foot(g, frame, -hw + footInset, mainZ - seatD / 2 + footInset);
  foot(g, frame, hw - footInset, mainZ - seatD / 2 + footInset);
  foot(g, frame, chaiseX, hd - footInset);
  foot(g, frame, chaiseX, -hd + seatD + footInset);

  // --- Sitzkissen (dick, weich) ---
  g.add(box(w - 0.08, cushionH, seatD - 0.1, cushion, 0, skirtH, mainZ + 0.02));
  g.add(box(seatD - 0.08, cushionH, chaiseLen - 0.08, cushion, chaiseX, skirtH, chaiseZ));

  // Eckkissen (Übergang Hauptteil ↔ Chaise)
  const cornerX = side === 'right' ? hw - seatD / 2 : -hw + seatD / 2;
  const cornerZ = -hd + seatD / 2;
  g.add(box(seatD - 0.1, cushionH * 0.95, seatD - 0.1, cushion, cornerX, skirtH, cornerZ));

  // --- Rückenkissen (auf Sitz, leicht geneigt – keine Wand) ---
  const backY = seatTop;
  g.add(roundBox(mainBackW - 0.06, backH, backD, body, mainBackX, backY, mainBackZ, -0.1));
  g.add(roundBox(backD, backH, chaiseLen - 0.1, body, chaiseBackX, backY, chaiseZ, -0.06));

  // Kopfkissen andeuten
  const pillowW = Math.min(0.42, mainBackW / 3.2);
  const pillowH = 0.22;
  const pillowD = 0.1;
  const pillowY = seatTop + backH * 0.55;
  g.add(box(pillowW, pillowH, pillowD, pillow, mainBackX - mainBackW * 0.22, pillowY, mainBackZ - 0.02));
  g.add(box(pillowW, pillowH, pillowD, pillow, mainBackX + mainBackW * 0.22, pillowY, mainBackZ - 0.02));

  // --- Armlehnen (gepolstert, niedriger als Rücken) ---
  const outerArmX = side === 'right' ? -hw + armW / 2 : hw - armW / 2;
  g.add(box(armW, armH, seatD - 0.04, body, outerArmX, skirtH, mainZ));
  g.add(box(armW - 0.02, armH * 0.92, armW, body, chaiseX, skirtH, hd - armW / 2));

  // Armlehnen-Auflage oben (abgerundeter Eindruck)
  g.add(box(armW + 0.02, 0.05, seatD - 0.08, cushion, outerArmX, skirtH + armH, mainZ));
  g.add(box(armW, 0.05, armW + 0.02, cushion, chaiseX, skirtH + armH, hd - armW / 2));
}
