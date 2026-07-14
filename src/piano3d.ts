import * as THREE from 'three';

function lacquer(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Aufrechtklavier – schlicht und von vorne sofort erkennbar:
 * schwarzer Korpus, weiße Tasten unten, Pedale.
 */
export function buildPiano3D(g: THREE.Group, w: number, d: number, h: number, color: string): void {
  const black = lacquer(color);
  const ivory = new THREE.MeshStandardMaterial({ color: '#f2ead8', roughness: 0.4 });
  const ebony = new THREE.MeshStandardMaterial({ color: '#111116', roughness: 0.35 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c9a832', metalness: 0.9, roughness: 0.3 });

  const frontZ = -d / 2;

  // Korpus (ein Block, leicht zurückgesetzt hinten)
  g.add(box(w * 0.94, h * 0.96, d * 0.82, black, 0, h * 0.02, d * 0.06));

  // Weiße Klaviatur – breiter Streifen an der Vorderseite
  const keyH = h * 0.11;
  const keyD = d * 0.22;
  g.add(box(w * 0.84, keyH, keyD, ivory, 0, keyH / 2 + h * 0.01, frontZ + keyD / 2 + 0.01));

  // Schwarze Tasten
  const keyW = w * 0.8;
  const n = 10;
  const bw = keyW / n;
  for (let i = 0; i < n; i++) {
    if (i % 3 === 2) continue;
    g.add(box(bw * 0.5, keyH * 0.65, keyD * 0.55, ebony, -keyW / 2 + bw * (i + 0.75), keyH * 0.82, frontZ + keyD * 0.35));
  }

  // Notenablage (schmales Brett über den Tasten)
  g.add(box(w * 0.5, h * 0.22, 0.02, black, 0, h * 0.38, frontZ + 0.012));

  // Pedalkonsole
  g.add(box(w * 0.36, h * 0.025, d * 0.1, brass, 0, h * 0.04, frontZ + d * 0.07));
  for (const px of [-0.09, 0, 0.09]) {
    g.add(box(0.05, h * 0.018, 0.06, brass, px, h * 0.055, frontZ + d * 0.09));
  }
}
