import * as THREE from 'three';

function mat(color: string | number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...opts });
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cylinder(rTop: number, rBottom: number, h: number, material: THREE.Material, x = 0, y = 0, z = 0, segments = 20): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const chrome = () => mat('#c8ced4', { metalness: 0.9, roughness: 0.22 });
const countertop = () => mat('#3c3f42', { roughness: 0.45 });
const appliance = (color: string) => mat(color, { metalness: 0.35, roughness: 0.4 });
const cabinet = (color: string) => mat(color, { roughness: 0.5 });

function addDoorLines(g: THREE.Group, w: number, h: number, d: number, doors: number): void {
  const line = mat('#00000055', { transparent: true, opacity: 0.35 });
  for (let i = 1; i < doors; i++) {
    g.add(box(0.006, h * 0.92, 0.005, line, -w / 2 + (w / doors) * i, h * 0.04, -d / 2 - 0.002));
  }
}

function addHandles(g: THREE.Group, w: number, h: number, d: number, doors: number): void {
  const handle = chrome();
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + (w / doors) * (i + 0.5);
    g.add(box(0.08, 0.012, 0.02, handle, x, h * 0.45, -d / 2 - 0.025));
  }
}

export function buildKitchenBaseCabinet(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  color: string,
  opts: { doors?: number; countertop?: boolean; hob?: boolean; sink?: boolean; oven?: boolean; dishwasher?: boolean; drawer?: boolean; trash?: boolean } = {}
): void {
  const body = cabinet(color);
  const doors = opts.doors ?? Math.max(1, Math.round(w / 0.6));
  g.add(box(w, h * 0.92, d, body));
  addDoorLines(g, w, h * 0.92, d, doors);
  addHandles(g, w, h * 0.92, d, doors);

  if (opts.countertop !== false) {
    g.add(box(w, 0.03, d + 0.02, countertop(), 0, h - 0.03, 0));
  }
  if (opts.hob) {
    g.add(box(Math.min(0.55, w * 0.85), 0.02, 0.5, mat('#23262a', { metalness: 0.6, roughness: 0.3 }), 0, h, 0));
  }
  if (opts.sink) {
    g.add(box(Math.min(0.5, w * 0.7), 0.14, 0.4, mat('#d8dde0', { metalness: 0.4, roughness: 0.3 }), 0, h - 0.16, 0));
    g.add(cylinder(0.012, 0.012, 0.16, chrome(), 0, h + 0.05, -d * 0.15, 12));
  }
  if (opts.oven) {
    g.add(box(w * 0.85, h * 0.55, 0.04, mat('#1a1c1f', { metalness: 0.5, roughness: 0.35 }), 0, h * 0.35, -d / 2 - 0.015));
    g.add(box(w * 0.55, 0.02, 0.02, chrome(), 0, h * 0.12, -d / 2 - 0.02));
  }
  if (opts.dishwasher) {
    g.add(box(w * 0.88, h * 0.78, 0.03, mat('#cfd4d8', { metalness: 0.55, roughness: 0.35 }), 0, h * 0.4, -d / 2 - 0.012));
    for (let i = 0; i < 3; i++) {
      g.add(box(w * 0.7, 0.008, 0.01, mat('#9aa0a6'), 0, h * (0.2 + i * 0.22), -d / 2 - 0.018));
    }
  }
  if (opts.drawer) {
    for (let i = 0; i < Math.min(4, doors + 1); i++) {
      g.add(box(w * 0.9, 0.008, 0.01, mat('#00000044', { transparent: true, opacity: 0.4 }), 0, h * (0.18 + i * 0.18), -d / 2 - 0.012));
    }
  }
  if (opts.trash) {
    g.add(box(w * 0.75, h * 0.45, 0.03, mat('#4a4f55'), 0, h * 0.45, -d / 2 - 0.01));
  }
}

export function buildKitchenWallCabinet(g: THREE.Group, w: number, h: number, d: number, color: string): void {
  const body = cabinet(color);
  const doors = Math.max(1, Math.round(w / 0.6));
  g.add(box(w, h, d, body));
  addDoorLines(g, w, h, d, doors);
  addHandles(g, w, h, d, doors);
}

export function buildKitchenHood(g: THREE.Group, w: number, h: number, d: number, color: string): void {
  g.add(box(w, h * 0.55, d, appliance(color)));
  g.add(box(w * 0.92, 0.04, d * 0.85, mat('#2a2d30', { metalness: 0.5 }), 0, h * 0.55, 0));
  const filter = mat('#3a3f44', { metalness: 0.3, roughness: 0.6 });
  for (let i = -1; i <= 1; i++) {
    g.add(box(w * 0.22, 0.015, d * 0.7, filter, i * w * 0.28, h * 0.2, 0));
  }
  g.add(box(0.08, h * 0.35, 0.08, chrome(), 0, h * 0.75, 0));
}

export function buildKitchenFridge(g: THREE.Group, w: number, h: number, d: number, color: string, sideBySide = false): void {
  g.add(box(w, h, d, appliance(color)));
  if (sideBySide) {
    g.add(box(0.02, h * 0.92, 0.01, mat('#00000033', { transparent: true, opacity: 0.35 }), 0, h * 0.04, -d / 2 - 0.01));
    g.add(box(0.025, 0.35, 0.025, chrome(), -w * 0.22, h * 0.55, -d / 2 - 0.02));
    g.add(box(0.025, 0.35, 0.025, chrome(), w * 0.22, h * 0.55, -d / 2 - 0.02));
  } else {
    g.add(box(0.025, 0.35, 0.025, chrome(), w * 0.35, h * 0.55, -d / 2 - 0.02));
    g.add(box(w * 0.92, 0.02, 0.01, mat('#00000033', { transparent: true, opacity: 0.35 }), 0, h * 0.72, -d / 2 - 0.01));
  }
}

export function buildKitchenStove(g: THREE.Group, w: number, h: number, d: number, color: string): void {
  g.add(box(w, h * 0.9, d, appliance(color)));
  g.add(box(w * 0.92, 0.03, d * 0.92, mat('#23262a', { metalness: 0.6, roughness: 0.3 }), 0, h * 0.9, 0));
  g.add(box(w * 0.88, h * 0.42, 0.04, mat('#1a1c1f', { metalness: 0.5 }), 0, h * 0.45, -d / 2 - 0.015));
  g.add(box(w * 0.7, 0.02, 0.02, chrome(), 0, h * 0.12, -d / 2 - 0.02));
  for (const x of [-0.16, 0.16]) {
    g.add(cylinder(0.045, 0.045, 0.01, mat('#1a1a1a'), x, h * 0.93, 0, 16));
  }
}

export function buildKitchenIsland(g: THREE.Group, w: number, h: number, d: number, color: string): void {
  buildKitchenBaseCabinet(g, w, h, d, color, { doors: Math.max(2, Math.round(w / 0.6)), hob: true, sink: w >= 1.1 });
}

export function buildKitchenLine(g: THREE.Group, w: number, h: number, d: number, color: string): void {
  buildKitchenBaseCabinet(g, w, h, d, color, { doors: Math.max(3, Math.round(w / 0.6)), hob: true, sink: true });
}

export function buildKitchenMicrowave(g: THREE.Group, w: number, h: number, d: number, color: string): void {
  g.add(box(w, h, d, appliance(color)));
  g.add(box(w * 0.82, h * 0.62, 0.02, mat('#111418', { metalness: 0.4 }), 0, h * 0.2, -d / 2 - 0.01));
  g.add(box(w * 0.55, 0.02, 0.02, mat('#2a2f35'), 0, h * 0.08, -d / 2 - 0.015));
}

export function buildKitchenHob(g: THREE.Group, w: number, h: number, d: number): void {
  g.add(box(w, h, d, mat('#23262a', { metalness: 0.6, roughness: 0.3 })));
  const positions = w > 0.75 ? [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]] : [[-0.14, 0], [0.14, 0]];
  for (const [x, z] of positions) {
    g.add(cylinder(0.09, 0.09, 0.01, mat('#141414'), x, h, z, 20));
    g.add(cylinder(0.055, 0.055, 0.012, mat('#c0392b', { emissive: '#802020', emissiveIntensity: 0.15 }), x, h + 0.005, z, 16));
  }
}

export function buildKitchenSink(g: THREE.Group, w: number, h: number, d: number, color: string): void {
  g.add(box(w, h * 0.35, d, mat(color, { metalness: 0.45, roughness: 0.35 })));
  g.add(box(w * 0.82, h * 0.55, d * 0.75, mat('#d8dde0', { metalness: 0.4, roughness: 0.3 }), 0, h * 0.35, 0));
  g.add(cylinder(0.012, 0.012, 0.18, chrome(), 0, h * 0.55, -d * 0.2, 12));
}

export function buildKitchenWineCooler(g: THREE.Group, w: number, h: number, d: number, color: string): void {
  g.add(box(w, h, d, appliance(color)));
  g.add(box(w * 0.88, h * 0.78, 0.03, mat('#1a2030', { metalness: 0.5 }), 0, h * 0.4, -d / 2 - 0.012));
  g.add(box(0.025, 0.25, 0.025, chrome(), w * 0.35, h * 0.5, -d / 2 - 0.02));
}

export function buildKitchenOpenShelf(g: THREE.Group, w: number, h: number, d: number, color: string): void {
  const wood = mat(color, { roughness: 0.65 });
  const t = 0.025;
  g.add(box(t, h, d, wood, -w / 2 + t / 2, 0));
  g.add(box(t, h, d, wood, w / 2 - t / 2, 0));
  const boards = 5;
  for (let i = 0; i <= boards; i++) {
    g.add(box(w - t * 2, t, d, wood, 0, (h / boards) * i));
  }
}

export function buildBreakfastBar(g: THREE.Group, w: number, h: number, d: number, color: string): void {
  g.add(box(w, h * 0.88, d, cabinet(color)));
  g.add(box(w, 0.04, d + 0.02, countertop(), 0, h * 0.88, 0));
  g.add(box(w * 0.9, 0.02, 0.02, mat('#00000044', { transparent: true, opacity: 0.35 }), 0, h * 0.45, -d / 2 - 0.01));
}
