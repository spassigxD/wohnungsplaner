import * as THREE from 'three';

function lacquer(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.08,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
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
 * Aufrechtklavier nach Yamaha/Steinway-Maßen (~150×60×120 cm).
 * Vorderseite (-Z): Tasten, Pedale, Notenpult. Korpus liegt hinten.
 */
export function buildPiano3D(g: THREE.Group, w: number, d: number, h: number, color: string): void {
  const black = lacquer(color);
  const blackDeep = lacquer('#08080a');
  const ivory = new THREE.MeshStandardMaterial({ color: '#eee6d6', roughness: 0.35 });
  const ebony = new THREE.MeshStandardMaterial({ color: '#0c0c10', roughness: 0.3 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c4a028', metalness: 0.94, roughness: 0.25 });

  const baseH = 0.12;
  const bodyH = h - baseH;
  const frontZ = -d / 2;
  const backZ = d / 2 - 0.04;

  // --- Sockel & Beine ---
  g.add(box(w * 0.96, baseH, d * 0.92, blackDeep, 0, 0, 0));
  for (const [lx, lz] of [
    [-w * 0.38, -d * 0.34],
    [w * 0.38, -d * 0.34],
    [-w * 0.38, d * 0.3],
    [w * 0.38, d * 0.3],
  ]) {
    g.add(box(0.055, baseH, 0.055, blackDeep, lx, 0, lz));
  }

  // --- Hauptkorpus (hinten, hoch) ---
  const cabinetD = d * 0.58;
  const cabinetZ = backZ - cabinetD / 2;
  g.add(box(w * 0.93, bodyH * 0.92, cabinetD, black, 0, baseH, cabinetZ));

  // Seitenwangen (breiter als Korpus an Klaviaturhöhe)
  const cheekH = bodyH * 0.55;
  const cheekD = d * 0.48;
  const cheekZ = frontZ + cheekD / 2 + 0.02;
  g.add(box(w * 0.11, cheekH, cheekD, blackDeep, -w / 2 + w * 0.055, baseH + cheekH * 0.42, cheekZ));
  g.add(box(w * 0.11, cheekH, cheekD, blackDeep, w / 2 - w * 0.055, baseH + cheekH * 0.42, cheekZ));

  // Obere Blende
  g.add(box(w * 0.9, bodyH * 0.08, cabinetD * 0.95, black, 0, baseH + bodyH * 0.9, cabinetZ));
  const top = box(w * 0.86, bodyH * 0.05, cabinetD * 0.7, black, 0, h * 0.97, cabinetZ - cabinetD * 0.12);
  top.rotation.x = 0.08;
  g.add(top);

  // --- Klaviatur (Mitte, ragt nach vorne) ---
  const kbY = baseH + bodyH * 0.42;
  const keyD = d * 0.38;
  const keyZ = frontZ + keyD / 2 + 0.01;

  // Vorderwand mit Ausschnitt für Tasten
  g.add(box(w * 0.9, bodyH * 0.38, 0.04, black, 0, baseH + bodyH * 0.58, frontZ + 0.025));

  // Tastenbrett
  g.add(box(w * 0.84, 0.04, keyD, blackDeep, 0, kbY, keyZ));

  // Weiße Tasten (einheitliche Fläche)
  g.add(box(w * 0.78, 0.022, keyD * 0.88, ivory, 0, kbY + 0.03, keyZ - keyD * 0.04));

  // Schwarze Tasten
  const blacks = 13;
  const bw = (w * 0.78) / (blacks + 1);
  for (let i = 0; i < blacks; i++) {
    if (i % 3 === 2) continue;
    g.add(box(bw * 0.52, 0.032, keyD * 0.5, ebony, -w * 0.39 + bw * (i + 1.2), kbY + 0.042, keyZ - keyD * 0.2));
  }

  // Klappdeckel (offen angewinkelt)
  const fall = box(w * 0.8, 0.02, keyD * 0.75, black, 0, kbY + bodyH * 0.2, keyZ - keyD * 0.05);
  fall.rotation.x = -0.42;
  g.add(fall);

  // Griffleiste
  g.add(box(w * 0.7, 0.02, 0.03, brass, 0, baseH + bodyH * 0.3, frontZ + 0.015));

  // --- Notenpult ---
  g.add(box(w * 0.48, 0.012, d * 0.14, blackDeep, 0, baseH + bodyH * 0.7, frontZ + d * 0.1));
  const rack = box(w * 0.44, bodyH * 0.15, 0.02, black, 0, baseH + bodyH * 0.62, frontZ + 0.012);
  rack.rotation.x = -0.15;
  g.add(rack);

  // --- Pedale ---
  g.add(box(w * 0.38, 0.02, d * 0.12, brass, 0, baseH * 0.7, frontZ + d * 0.08));
  for (const px of [-0.1, 0, 0.1]) {
    g.add(box(0.055, 0.014, 0.07, brass, px, baseH * 0.55, frontZ + d * 0.1));
  }
}
