import * as THREE from 'three';

function lacquer(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.12,
    metalness: 0.08,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
  });
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cylinder(r: number, h: number, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Aufrechtklavier mit erkennbarer Silhouette, Klaviatur und Pedalen. */
export function buildPiano3D(g: THREE.Group, w: number, d: number, h: number, color: string): void {
  const body = lacquer(color);
  const bodyDark = lacquer('#0a0a0c');
  const ivory = new THREE.MeshStandardMaterial({ color: '#f0e8d8', roughness: 0.38 });
  const ebony = new THREE.MeshStandardMaterial({ color: '#111114', roughness: 0.35 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c8a030', metalness: 0.92, roughness: 0.28 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#a8b2bc', metalness: 0.9, roughness: 0.18 });

  const baseH = 0.11;
  const bodyH = h - baseH;
  const cheekW = w * 0.1;
  const cabinetD = d * 0.72;
  const keyProtrude = d * 0.34;

  // Sockel
  g.add(box(w * 0.97, baseH, d * 0.9, bodyDark, 0, 0, d * 0.02));

  // Hauptkorpus (ragt nicht bis ganz nach vorne – Klaviatur steht davor)
  g.add(box(w * 0.94, bodyH * 0.88, cabinetD, body, 0, baseH, d / 2 - cabinetD / 2));

  // Seitenwangen
  g.add(box(cheekW, bodyH * 0.68, cabinetD * 0.88, bodyDark, -w / 2 + cheekW / 2 + 0.01, baseH + 0.02, d / 2 - cabinetD / 2));
  g.add(box(cheekW, bodyH * 0.68, cabinetD * 0.88, bodyDark, w / 2 - cheekW / 2 - 0.01, baseH + 0.02, d / 2 - cabinetD / 2));

  // Oberteil / Deckel
  g.add(box(w * 0.9, bodyH * 0.09, cabinetD * 0.92, body, 0, baseH + bodyH * 0.9, d / 2 - cabinetD / 2 + 0.01));
  const lid = box(w * 0.86, bodyH * 0.05, cabinetD * 0.75, body, 0, h * 0.97, d / 2 - cabinetD * 0.35);
  lid.rotation.x = 0.1;
  g.add(lid);

  // Klaviatur-Brett (ragt nach vorne, -Z)
  const kbY = baseH + bodyH * 0.46;
  const kbZ = -d / 2 + keyProtrude * 0.55;
  g.add(box(w * 0.86, 0.035, keyProtrude, bodyDark, 0, kbY, kbZ));

  // Tastenfeld
  const keyW = w * 0.8;
  const keyD = keyProtrude * 0.82;
  g.add(box(keyW, 0.02, keyD, ivory, 0, kbY + 0.028, kbZ - keyProtrude * 0.06));

  // Schwarze Tasten (vereinfacht, aber sichtbar)
  const blackCount = 14;
  const bw = keyW / (blackCount + 2);
  for (let i = 0; i < blackCount; i++) {
    if (i % 3 === 2) continue;
    g.add(box(bw * 0.55, 0.028, keyD * 0.52, ebony, -keyW / 2 + bw * (i + 1.5), kbY + 0.04, kbZ - keyProtrude * 0.18));
  }

  // Klappdeckel über Tasten
  const fall = box(w * 0.82, 0.018, keyProtrude * 0.7, body, 0, kbY + bodyH * 0.14, kbZ - keyProtrude * 0.1);
  fall.rotation.x = -0.32;
  g.add(fall);

  // Notenpult
  g.add(box(w * 0.5, 0.012, d * 0.16, bodyDark, 0, baseH + bodyH * 0.72, -d / 2 + d * 0.12));
  g.add(box(w * 0.46, bodyH * 0.14, 0.022, body, 0, baseH + bodyH * 0.64, -d / 2 + 0.014));

  // Griffleiste
  g.add(box(w * 0.74, 0.016, 0.025, brass, 0, baseH + bodyH * 0.34, -d / 2 + 0.012));

  // Pedalkonsole
  g.add(box(w * 0.42, 0.018, d * 0.14, brass, 0, baseH * 0.65, -d / 2 + d * 0.1));
  for (const px of [-0.1, 0, 0.1]) {
    g.add(cylinder(0.032, 0.012, chrome, px, baseH * 0.52, -d / 2 + d * 0.12));
    g.add(cylinder(0.01, 0.06, brass, px, baseH * 0.42, -d / 2 + d * 0.1));
  }
}
