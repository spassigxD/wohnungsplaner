import * as THREE from 'three';
import type { FurnitureItem } from './model';
import { getCatalogEntry } from './catalog';

// Alle Maße hier in Metern. Ursprung der Gruppe: Bodenmitte des Möbels
// (bei Deckenmontage: Befestigungspunkt an der Decke, Lampe hängt nach unten).
// Vorderseite der Möbel zeigt in lokale -Z-Richtung.

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

export function buildFurniture(item: FurnitureItem): THREE.Group {
  const g = new THREE.Group();
  const w = item.width / 100;
  const d = item.depth / 100;
  const h = item.height / 100;
  const c = item.color;

  switch (item.type) {
    case 'bed':
    case 'bed_single': {
      const frame = mat('#6b5138');
      g.add(box(w, h * 0.45, d, frame));
      g.add(box(w * 0.97, h * 0.35, d * 0.97, mat(c), 0, h * 0.45));
      g.add(box(w, h * 0.9, 0.06, frame, 0, 0, d / 2 - 0.03)); // Kopfteil hinten
      const pillowW = item.type === 'bed' ? w * 0.42 : w * 0.8;
      const pillow = mat('#f5f2ea');
      if (item.type === 'bed') {
        g.add(box(pillowW, 0.09, 0.42, pillow, -w * 0.25, h * 0.8, d / 2 - 0.3));
        g.add(box(pillowW, 0.09, 0.42, pillow, w * 0.25, h * 0.8, d / 2 - 0.3));
      } else {
        g.add(box(pillowW, 0.09, 0.42, pillow, 0, h * 0.8, d / 2 - 0.3));
      }
      break;
    }
    case 'sofa':
    case 'armchair': {
      const base = mat(c);
      const armW = Math.min(0.18, w * 0.12);
      g.add(box(w, h * 0.45, d, base)); // Sitzfläche
      g.add(box(w, h, d * 0.28, base, 0, 0, d / 2 - d * 0.14)); // Rückenlehne
      g.add(box(armW, h * 0.75, d, base, -w / 2 + armW / 2, 0));
      g.add(box(armW, h * 0.75, d, base, w / 2 - armW / 2, 0));
      break;
    }
    case 'chair': {
      const wood = mat(c);
      const seatH = h * 0.5;
      g.add(box(w, 0.04, d, wood, 0, seatH));
      g.add(box(w, h - seatH, 0.04, wood, 0, seatH, d / 2 - 0.02)); // Lehne hinten
      const legR = 0.02;
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.add(cylinder(legR, legR, seatH, wood, lx * (w / 2 - 0.04), 0, lz * (d / 2 - 0.04), 8));
      }
      break;
    }
    case 'dining_table':
    case 'desk':
    case 'coffee_table': {
      const wood = mat(c);
      const topT = 0.04;
      g.add(box(w, topT, d, wood, 0, h - topT));
      const legS = 0.05;
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.add(box(legS, h - topT, legS, wood, lx * (w / 2 - legS), 0, lz * (d / 2 - legS)));
      }
      break;
    }
    case 'shelf': {
      const wood = mat(c);
      const t = 0.025;
      g.add(box(t, h, d, wood, -w / 2 + t / 2, 0));
      g.add(box(t, h, d, wood, w / 2 - t / 2, 0));
      g.add(box(w, t, d, wood, 0, 0));
      const boards = 4;
      for (let i = 1; i <= boards; i++) {
        g.add(box(w - t * 2, t, d, wood, 0, (h / boards) * i - t));
      }
      break;
    }
    case 'wardrobe':
    case 'sideboard':
    case 'lowboard':
    case 'kitchen': {
      const body = mat(c);
      g.add(box(w, h, d, body));
      // Türfugen andeuten
      const line = mat('#00000055', { transparent: true, opacity: 0.35 });
      const doors = Math.max(2, Math.round(w / 0.5));
      for (let i = 1; i < doors; i++) {
        g.add(box(0.006, h * 0.92, 0.005, line, -w / 2 + (w / doors) * i, h * 0.04, -d / 2 - 0.002));
      }
      if (item.type === 'kitchen') {
        g.add(box(w, 0.03, d + 0.02, mat('#3c3f42'), 0, h - 0.03, 0)); // Arbeitsplatte
        g.add(box(0.55, 0.02, 0.5, mat('#23262a', { metalness: 0.6, roughness: 0.3 }), -w * 0.25, h, 0)); // Kochfeld
        g.add(box(0.5, 0.14, 0.4, mat('#d8dde0', { metalness: 0.4, roughness: 0.3 }), w * 0.25, h - 0.16, 0)); // Spüle
      }
      break;
    }
    case 'fridge': {
      g.add(box(w, h, d, mat(c, { metalness: 0.35, roughness: 0.4 })));
      g.add(box(0.025, 0.35, 0.025, mat('#8a9095', { metalness: 0.7, roughness: 0.3 }), w * 0.35, h * 0.55, -d / 2 - 0.02));
      break;
    }
    case 'tv':
    case 'monitor': {
      const screenH = h;
      const panel = mat('#181c20', { roughness: 0.4 });
      const standH = item.type === 'monitor' ? 0.1 : 0.12;
      // Standfuß
      g.add(box(w * 0.35, 0.02, Math.max(d, 0.18), mat('#22262a'), 0, 0));
      g.add(box(0.05, standH, 0.04, mat('#22262a'), 0, 0.02, 0.02));
      // Panel
      const p = box(w, screenH - standH, 0.03, panel, 0, standH, 0.03);
      g.add(p);
      // Leuchtende Bildfläche vorne
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.94, (screenH - standH) * 0.88),
        new THREE.MeshStandardMaterial({
          color: '#1a2f4a',
          emissive: item.type === 'tv' ? '#2a5a8f' : '#3a6a9f',
          emissiveIntensity: 0.9,
          roughness: 0.3,
        })
      );
      screen.position.set(0, standH + (screenH - standH) / 2, 0.03 - 0.016);
      screen.rotation.y = Math.PI;
      g.add(screen);
      break;
    }
    case 'pc': {
      g.add(box(w, h, d, mat('#1a1e24', { roughness: 0.5 })));
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.5, 0.01, 0.005),
        new THREE.MeshStandardMaterial({ color: '#20f0ff', emissive: '#20f0ff', emissiveIntensity: 2 })
      );
      led.position.set(0, h * 0.85, -d / 2 - 0.003);
      g.add(led);
      break;
    }
    case 'lamp_floor':
    case 'lamp_table': {
      const metal = mat('#4a4f55', { metalness: 0.6, roughness: 0.4 });
      g.add(cylinder(Math.max(w, d) / 2 * 0.7, Math.max(w, d) / 2 * 0.7, 0.02, metal));
      g.add(cylinder(0.012, 0.012, h * 0.78, metal, 0, 0.02));
      const shadeH = h * 0.22;
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2 * 0.7, w / 2, shadeH, 24, 1, true),
        new THREE.MeshStandardMaterial({
          color: item.color,
          emissive: '#ffd890',
          emissiveIntensity: 0.7,
          side: THREE.DoubleSide,
          roughness: 0.9,
        })
      );
      shade.position.y = h - shadeH / 2;
      g.add(shade);
      const light = new THREE.PointLight('#ffd9a0', 12, 8, 1.8);
      light.position.y = h - shadeH / 2;
      g.add(light);
      break;
    }
    case 'lamp_ceiling': {
      // Ursprung = Deckenpunkt, hängt nach unten (item.height = Pendellänge)
      const cordLen = Math.max(0.05, h - 0.22);
      const cord = cylinder(0.005, 0.005, cordLen, mat('#222'), 0, -cordLen);
      g.add(cord);
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, w / 2, 0.22, 24, 1, true),
        new THREE.MeshStandardMaterial({
          color: item.color,
          emissive: '#ffe0a0',
          emissiveIntensity: 0.6,
          side: THREE.DoubleSide,
          roughness: 0.9,
        })
      );
      shade.position.y = -cordLen - 0.11;
      g.add(shade);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 16, 12),
        new THREE.MeshStandardMaterial({ color: '#fff6dd', emissive: '#fff0c0', emissiveIntensity: 3 })
      );
      bulb.position.y = -cordLen - 0.18;
      g.add(bulb);
      const light = new THREE.PointLight('#ffe8c0', 25, 12, 1.6);
      light.position.y = -cordLen - 0.2;
      g.add(light);
      break;
    }
    case 'lamp_ceiling_flat': {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2, w / 2 * 0.9, h, 24),
        new THREE.MeshStandardMaterial({ color: item.color, emissive: '#fff4d8', emissiveIntensity: 1.5 })
      );
      disc.position.y = -h / 2;
      g.add(disc);
      const light = new THREE.PointLight('#fff0d0', 20, 10, 1.6);
      light.position.y = -h - 0.05;
      g.add(light);
      break;
    }
    case 'plant': {
      g.add(cylinder(w * 0.28, w * 0.22, h * 0.22, mat('#8a5a3a')));
      const leaves = mat(c, { roughness: 1 });
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(w * 0.5, 12, 10), leaves);
      s1.position.y = h * 0.55;
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(w * 0.38, 12, 10), leaves);
      s2.position.set(w * 0.15, h * 0.82, 0.05);
      g.add(s1, s2);
      break;
    }
    case 'rug': {
      const rug = box(w, Math.max(h, 0.012), d, mat(c, { roughness: 1 }));
      rug.castShadow = false;
      g.add(rug);
      break;
    }
    case 'bathtub': {
      const white = mat(c, { roughness: 0.25 });
      g.add(box(w, h, d, white));
      const water = mat('#7fb8d8', { roughness: 0.1, metalness: 0.1 });
      g.add(box(w * 0.85, 0.02, d * 0.75, water, 0, h - 0.1));
      break;
    }
    case 'shower': {
      g.add(box(w, 0.06, d, mat('#e8eaec', { roughness: 0.3 })));
      const glass = new THREE.MeshStandardMaterial({
        color: '#bcd8e8',
        transparent: true,
        opacity: 0.3,
        roughness: 0.1,
      });
      g.add(box(0.01, h - 0.06, d, glass, -w / 2 + 0.01, 0.06));
      g.add(box(w, h - 0.06, 0.01, glass, 0, 0.06, -d / 2 + 0.01));
      g.add(cylinder(0.01, 0.01, h - 0.3, mat('#9aa5ad', { metalness: 0.7 }), w / 2 - 0.08, 0.06, d / 2 - 0.08, 8));
      break;
    }
    case 'toilet': {
      const white = mat(c, { roughness: 0.25 });
      g.add(box(w, h * 0.5, d * 0.5, white, 0, 0, d * 0.2)); // Spülkasten hinten
      g.add(cylinder(w / 2, w / 2 * 0.7, h * 0.9, white, 0, 0, -d * 0.15, 16));
      g.add(cylinder(w / 2 + 0.01, w / 2 + 0.01, 0.03, white, 0, h * 0.9, -d * 0.15, 16));
      break;
    }
    case 'sink': {
      const white = mat(c, { roughness: 0.25 });
      g.add(cylinder(0.08, 0.1, h - 0.15, white)); // Standfuß
      g.add(box(w, 0.15, d, white, 0, h - 0.15));
      g.add(cylinder(0.012, 0.012, 0.15, mat('#9aa5ad', { metalness: 0.8, roughness: 0.2 }), 0, h - 0.02, d / 2 - 0.08, 8));
      break;
    }
    default: {
      const entry = getCatalogEntry(item.type);
      g.add(box(w, h, d, mat(entry?.color ?? c)));
    }
  }

  return g;
}
