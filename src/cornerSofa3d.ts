import * as THREE from 'three';
import { fabricTexture } from './textures';
import { cornerSofaLayout, cornerSofaSide } from './cornerSofa';
import type { FurnitureItem } from './model';

function fabric(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map: fabricTexture(color), roughness: 0.95, metalness: 0 });
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Ecksofa – gleiche Bauweise wie das normale Sofa (3-Sitzer), nur als L-Form.
 * Sitzfläche + Rückenlehne + Armlehnen, keine Einzelmodule.
 */
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

  const base = fabric(item.color);
  const armW = Math.min(0.16, seatD * 0.65);

  // --- Hauptteil (wie 3-Sitzer, Rücken an +Z / Wand) ---
  g.add(box(w, h * 0.45, seatD, base, 0, 0, mainZ));
  g.add(box(w, h, seatD * 0.28, base, 0, 0, mainZ + seatD / 2 - seatD * 0.14));

  // --- Chaiselongue (90° gedreht, Rücken an Außenwand) ---
  g.add(box(seatD, h * 0.45, chaiseLen, base, chaiseX, 0, chaiseZ));
  const chaiseBackX = side === 'right' ? hw - seatD * 0.14 : -hw + seatD * 0.14;
  g.add(box(seatD * 0.28, h, chaiseLen, base, chaiseBackX, 0, chaiseZ));

  // --- Armlehnen ---
  const outerArmX = side === 'right' ? -hw + armW / 2 : hw - armW / 2;
  g.add(box(armW, h * 0.75, seatD, base, outerArmX, 0, mainZ));
  g.add(box(armW, h * 0.75, armW, base, chaiseX, 0, -hd + armW / 2));
}
