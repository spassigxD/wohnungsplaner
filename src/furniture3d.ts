import * as THREE from 'three';
import type { FurnitureItem } from './model';
import { getCatalogEntry } from './catalog';
import { woodGrainTexture, fabricTexture } from './textures';
import { cornerSofaLayout, cornerSofaSide } from './cornerSofa';
import {
  buildBreakfastBar,
  buildKitchenBaseCabinet,
  buildKitchenFridge,
  buildKitchenHob,
  buildKitchenHood,
  buildKitchenIsland,
  buildKitchenLine,
  buildKitchenMicrowave,
  buildKitchenOpenShelf,
  buildKitchenSink,
  buildKitchenStove,
  buildKitchenWallCabinet,
  buildKitchenWineCooler,
} from './kitchen3d';

// Alle Maße hier in Metern. Ursprung der Gruppe: Bodenmitte des Möbels
// (bei Deckenmontage: Befestigungspunkt an der Decke, Lampe hängt nach unten).
// Vorderseite der Möbel zeigt in lokale -Z-Richtung.

function mat(color: string | number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...opts });
}

/** Holz mit Maserung (Tische, Schränke, Rahmen). */
function wood(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map: woodGrainTexture(color), roughness: 0.65, metalness: 0.02 });
}

/** Stoff mit Gewebestruktur (Sofas, Matratzen, Teppiche). */
function fabric(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map: fabricTexture(color), roughness: 0.95, metalness: 0 });
}

/** Glänzende Keramik (WC, Waschbecken, Badewanne). */
function ceramic(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 });
}

/** Chrom für Armaturen. */
function chrome(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#c8ced4', metalness: 0.9, roughness: 0.22 });
}

function sphere(r: number, material: THREE.Material, x = 0, y = 0, z = 0, scaleY = 1, scaleZ = 1): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material);
  m.position.set(x, y, z);
  m.scale.set(1, scaleY, scaleZ);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
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
      const frame = wood('#6b5138');
      g.add(box(w, h * 0.45, d, frame));
      g.add(box(w * 0.97, h * 0.35, d * 0.97, fabric(c), 0, h * 0.45));
      g.add(box(w, h * 0.9, 0.06, frame, 0, 0, d / 2 - 0.03)); // Kopfteil hinten
      const pillowW = item.type === 'bed' ? w * 0.42 : w * 0.8;
      const pillow = fabric('#f5f2ea');
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
      const base = fabric(c);
      const armW = Math.min(0.18, w * 0.12);
      g.add(box(w, h * 0.45, d, base)); // Sitzfläche
      g.add(box(w, h, d * 0.28, base, 0, 0, d / 2 - d * 0.14)); // Rückenlehne
      g.add(box(armW, h * 0.75, d, base, -w / 2 + armW / 2, 0));
      g.add(box(armW, h * 0.75, d, base, w / 2 - armW / 2, 0));
      break;
    }
    case 'sofa_corner':
    case 'sofa_corner_left': {
      const base = fabric(c);
      const side = cornerSofaSide(item.type);
      const layout = cornerSofaLayout(item.width, item.depth, side);
      const seatD = layout.seatDepth / 100;
      const hw = w / 2;
      const hd = d / 2;
      const chaiseLen = layout.chaise.h / 100;
      const chaiseX = layout.chaise.cx / 100;
      const chaiseZ = layout.chaise.cy / 100;
      const mainZ = layout.main.cy / 100;
      const backT = seatD * 0.24;
      const armW = Math.min(0.17, seatD * 0.7);
      const seatH = h * 0.44;
      const backH = h * 0.88;
      const mainBackZ = -hd + seatD - backT / 2;

      // Sitzflächen: Hauptteil (volle Breite) + Chaiselongue hinten
      g.add(box(w, seatH, seatD, base, 0, 0, mainZ));
      g.add(box(seatD, seatH, chaiseLen, base, chaiseX, 0, chaiseZ));

      // L-förmige Rückenlehne
      const mainBackW = w - seatD;
      const mainBackX = side === 'right' ? -seatD / 2 : seatD / 2;
      g.add(box(mainBackW, backH, backT, base, mainBackX, 0, mainBackZ));
      const chaiseBackX = side === 'right' ? hw - backT / 2 : -hw + backT / 2;
      g.add(box(backT, backH, chaiseLen, base, chaiseBackX, 0, chaiseZ));

      // Armlehnen an den offenen Enden
      const outerArmX = side === 'right' ? -hw + armW / 2 : hw - armW / 2;
      g.add(box(armW, h * 0.72, seatD, base, outerArmX, 0, mainZ));
      g.add(box(armW, h * 0.72, armW, base, chaiseX, 0, hd - armW / 2));

      // Sitzkissen
      const pad = 0.03;
      g.add(box(w - pad * 2, 0.065, seatD - backT - pad, base, 0, seatH, mainZ - backT * 0.1));
      g.add(
        box(seatD - backT - pad, 0.065, chaiseLen - pad, base,
          chaiseX + (side === 'right' ? -backT * 0.1 : backT * 0.1), seatH, chaiseZ)
      );
      break;
    }
    case 'chair': {
      const m = wood(c);
      const seatH = h * 0.5;
      g.add(box(w, 0.04, d, m, 0, seatH));
      g.add(box(w, h - seatH, 0.04, m, 0, seatH, d / 2 - 0.02)); // Lehne hinten
      const legR = 0.02;
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.add(cylinder(legR, legR, seatH, m, lx * (w / 2 - 0.04), 0, lz * (d / 2 - 0.04), 8));
      }
      break;
    }
    case 'dining_table':
    case 'desk':
    case 'coffee_table': {
      const m = wood(c);
      const topT = 0.04;
      g.add(box(w, topT, d, m, 0, h - topT));
      const legS = 0.05;
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.add(box(legS, h - topT, legS, m, lx * (w / 2 - legS), 0, lz * (d / 2 - legS)));
      }
      break;
    }
    case 'shelf': {
      const m = wood(c);
      const t = 0.025;
      g.add(box(t, h, d, m, -w / 2 + t / 2, 0));
      g.add(box(t, h, d, m, w / 2 - t / 2, 0));
      g.add(box(w, t, d, m, 0, 0));
      const boards = 4;
      for (let i = 1; i <= boards; i++) {
        g.add(box(w - t * 2, t, d, m, 0, (h / boards) * i - t));
      }
      break;
    }
    case 'wardrobe': {
      const body = wood(c);
      const light = mat('#ddd4c6', { roughness: 0.62 });
      const plinthH = 0.08;
      const corniceH = 0.06;
      const doorCount = 3;
      const gap = 0.008;
      const doorW = (w - gap * (doorCount - 1)) / doorCount;

      g.add(box(w, plinthH, d + 0.02, mat('#4a4038'), 0, 0));
      g.add(box(w, h - plinthH - corniceH, d, body, 0, plinthH));
      g.add(box(w + 0.05, corniceH, d + 0.03, body, 0, h - corniceH));

      for (let i = 0; i < doorCount; i++) {
        const x = -w / 2 + doorW * (i + 0.5) + gap * i;
        g.add(box(doorW, h - plinthH - corniceH - 0.04, 0.025, light, x, plinthH + 0.02, -d / 2 + 0.015));
        g.add(box(0.09, 0.014, 0.025, chrome(), x + doorW * 0.28, h * 0.52, -d / 2 - 0.02));
      }
      g.add(box(0.02, h - plinthH - corniceH - 0.06, d * 0.92, mat('#4a4038'), 0, plinthH, 0));
      g.add(box(w * 0.92, 0.02, d * 0.55, mat('#5a4f45'), 0, h - plinthH - 0.12, 0));
      break;
    }
    case 'sideboard':
    case 'lowboard': {
      const body = wood(c);
      g.add(box(w, h, d, body));
      const line = mat('#00000055', { transparent: true, opacity: 0.35 });
      const doors = Math.max(2, Math.round(w / 0.5));
      for (let i = 1; i < doors; i++) {
        g.add(box(0.006, h * 0.92, 0.005, line, -w / 2 + (w / doors) * i, h * 0.04, -d / 2 - 0.002));
      }
      break;
    }
    case 'kitchen':
      buildKitchenLine(g, w, h, d, c);
      break;
    case 'kitchen_island':
      buildKitchenIsland(g, w, h, d, c);
      break;
    case 'kitchen_base_60':
      buildKitchenBaseCabinet(g, w, h, d, c, { doors: 1 });
      break;
    case 'kitchen_base_80':
      buildKitchenBaseCabinet(g, w, h, d, c, { doors: 2 });
      break;
    case 'kitchen_sink_base':
      buildKitchenBaseCabinet(g, w, h, d, c, { doors: 2, sink: true });
      break;
    case 'kitchen_corner':
      buildKitchenBaseCabinet(g, w, h, d, c, { doors: 2 });
      g.add(box(w * 0.42, h * 0.92, d * 0.42, mat(c, { roughness: 0.5 }), w * 0.29, 0, d * 0.29));
      break;
    case 'kitchen_drawer':
      buildKitchenBaseCabinet(g, w, h, d, c, { doors: 1, drawer: true });
      break;
    case 'kitchen_oven':
      buildKitchenBaseCabinet(g, w, h, d, c, { doors: 1, oven: true, hob: true });
      break;
    case 'kitchen_dishwasher':
      buildKitchenBaseCabinet(g, w, h, d, c, { doors: 1, dishwasher: true, countertop: true });
      break;
    case 'kitchen_trash':
      buildKitchenBaseCabinet(g, w, h, d, c, { doors: 1, trash: true });
      break;
    case 'kitchen_wall_60':
    case 'kitchen_wall_80':
      buildKitchenWallCabinet(g, w, h, d, c);
      break;
    case 'kitchen_open_shelf':
      buildKitchenOpenShelf(g, w, h, d, c);
      break;
    case 'kitchen_hood':
      buildKitchenHood(g, w, h, d, c);
      break;
    case 'kitchen_hob':
      buildKitchenHob(g, w, h, d);
      break;
    case 'kitchen_sink':
      buildKitchenSink(g, w, h, d, c);
      break;
    case 'kitchen_stove':
      buildKitchenStove(g, w, h, d, c);
      break;
    case 'kitchen_microwave':
      buildKitchenMicrowave(g, w, h, d, c);
      break;
    case 'kitchen_breakfast_bar':
      buildBreakfastBar(g, w, h, d, c);
      break;
    case 'kitchen_fridge_tall':
    case 'fridge':
    case 'kitchen_freezer':
      buildKitchenFridge(g, w, h, d, c);
      break;
    case 'kitchen_fridge_side':
      buildKitchenFridge(g, w, h, d, c, true);
      break;
    case 'kitchen_wine_cooler':
      buildKitchenWineCooler(g, w, h, d, c);
      break;
    case 'kitchen_washing_machine':
    case 'kitchen_dryer': {
      g.add(box(w, h, d, mat(c, { metalness: 0.35, roughness: 0.4 })));
      g.add(box(w * 0.82, h * 0.55, 0.03, mat('#e4e8eb', { metalness: 0.45 }), 0, h * 0.45, -d / 2 - 0.012));
      g.add(box(w * 0.55, 0.02, 0.02, chrome(), 0, h * 0.12, -d / 2 - 0.02));
      if (item.type === 'kitchen_washing_machine') {
        g.add(cylinder(0.22, 0.22, 0.03, mat('#c8ced4', { metalness: 0.7 }), 0, h * 0.45, -d / 2 - 0.02, 24));
      }
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
      // Terrakotta-Topf mit Rand und Erde
      const terracotta = mat('#b5654a', { roughness: 0.85 });
      const potH = h * 0.2;
      g.add(cylinder(w * 0.3, w * 0.22, potH, terracotta, 0, 0, 0, 24));
      g.add(cylinder(w * 0.33, w * 0.33, potH * 0.18, terracotta, 0, potH * 0.85, 0, 24));
      g.add(cylinder(w * 0.28, w * 0.28, 0.01, mat('#3a2c20', { roughness: 1 }), 0, potH - 0.008, 0, 20));
      // Stamm mit zwei Ästen
      const bark = mat('#7a5a3c', { roughness: 0.95 });
      g.add(cylinder(0.014, 0.02, h * 0.45, bark, 0, potH * 0.9, 0, 10));
      const branch1 = cylinder(0.009, 0.013, h * 0.28, bark, 0, 0, 0, 8);
      branch1.position.set(w * 0.05, h * 0.5, 0.01);
      branch1.rotation.z = -0.5;
      const branch2 = cylinder(0.009, 0.013, h * 0.24, bark, 0, 0, 0, 8);
      branch2.position.set(-w * 0.04, h * 0.45, -0.02);
      branch2.rotation.set(0.35, 0, 0.45);
      g.add(branch1, branch2);
      // Blattwerk: mehrere Kugeln in zwei Grüntönen
      const leafDark = mat(c, { roughness: 1 });
      const light = `#${new THREE.Color(c).lerp(new THREE.Color('#d8e8a0'), 0.3).getHexString()}`;
      const leafLight = mat(light, { roughness: 1 });
      const blobs: [number, number, number, number, boolean][] = [
        // [x/w, y/h, z/w, Radius/w, heller Ton?]
        [0, 0.72, 0, 0.42, false],
        [0.22, 0.63, 0.12, 0.3, true],
        [-0.2, 0.6, -0.08, 0.28, false],
        [0.1, 0.85, -0.14, 0.3, true],
        [-0.14, 0.86, 0.12, 0.26, false],
        [0.02, 0.95, 0.02, 0.24, true],
        [-0.26, 0.72, 0.16, 0.2, true],
        [0.28, 0.78, -0.05, 0.2, false],
      ];
      for (const [bx, by, bz, br, isLight] of blobs) {
        g.add(sphere(w * br, isLight ? leafLight : leafDark, w * bx, h * by, w * bz, 0.82, 1));
      }
      // Einzelne abstehende Blätter (flache Ellipsoide)
      const leafPositions: [number, number, number, number][] = [
        [0.4, 0.55, 0.1, 0.8],
        [-0.38, 0.62, -0.12, -0.7],
        [0.05, 0.5, 0.4, 0.2],
        [-0.1, 0.55, -0.38, -0.3],
      ];
      for (const [lx, ly, lz, rot] of leafPositions) {
        const leaf = sphere(w * 0.2, leafDark, w * lx, h * ly, w * lz, 0.18, 0.5);
        leaf.rotation.set(0.3, rot, rot * 0.4);
        g.add(leaf);
      }
      break;
    }
    case 'rug': {
      const rug = box(w, Math.max(h, 0.012), d, fabric(c));
      rug.castShadow = false;
      g.add(rug);
      break;
    }
    case 'bathtub': {
      const shell = ceramic(c);
      const rim = 0.05;
      // Wanne: Außenkörper + überstehender Rand + Innenraum
      g.add(box(w, h - 0.03, d, shell));
      g.add(box(w + 0.03, 0.035, d + 0.03, shell, 0, h - 0.035));
      g.add(box(w - rim * 2.5, 0.01, d - rim * 2.5, ceramic('#e2e6e8'), 0, h - 0.03, 0));
      // Wasser
      const water = new THREE.MeshPhysicalMaterial({
        color: '#6fb0d4',
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity: 0.75,
      });
      g.add(box(w - rim * 3, 0.015, d - rim * 3, water, 0, h - 0.09));
      // Armatur am linken Wannenende
      const metal = chrome();
      const spoutX = -w / 2 + 0.12;
      g.add(cylinder(0.016, 0.016, 0.16, metal, spoutX, h - 0.02, 0, 12));
      const spout = cylinder(0.013, 0.013, 0.14, metal, 0, 0, 0, 12);
      spout.position.set(spoutX + 0.06, h + 0.13, 0);
      spout.rotation.z = Math.PI / 2;
      g.add(spout);
      g.add(sphere(0.022, metal, spoutX, h + 0.02, 0.09));
      g.add(sphere(0.022, metal, spoutX, h + 0.02, -0.09));
      break;
    }
    case 'shower': {
      const metal = chrome();
      // Duschtasse mit Rand und Abfluss
      g.add(box(w, 0.07, d, ceramic('#eef0f2')));
      g.add(box(w - 0.1, 0.012, d - 0.1, ceramic('#dde1e4'), 0, 0.07));
      g.add(cylinder(0.035, 0.035, 0.005, mat('#5a6067', { metalness: 0.8, roughness: 0.3 }), 0, 0.082, 0, 16));
      // Glaswände (links + vorne) mit Chromkante oben
      const glass = new THREE.MeshPhysicalMaterial({
        color: '#cfe4ee',
        transparent: true,
        opacity: 0.22,
        roughness: 0.05,
        metalness: 0,
      });
      g.add(box(0.008, h - 0.07, d, glass, -w / 2 + 0.01, 0.07));
      g.add(box(w, h - 0.07, 0.008, glass, 0, 0.07, -d / 2 + 0.01));
      g.add(box(0.02, 0.02, d, metal, -w / 2 + 0.01, h - 0.02));
      g.add(box(w, 0.02, 0.02, metal, 0, h - 0.02, -d / 2 + 0.01));
      // Duschsäule hinten rechts: Stange, Brausekopf, Mischbatterie, Handbrause
      const colX = w / 2 - 0.08;
      const colZ = d / 2 - 0.08;
      g.add(cylinder(0.014, 0.014, h - 0.15, metal, colX, 0.07, colZ, 12));
      const arm = cylinder(0.011, 0.011, 0.3, metal, 0, 0, 0, 10);
      arm.position.set(colX - 0.14, h - 0.1, colZ - 0.14);
      arm.rotation.set(Math.PI / 2, 0, Math.PI / 4);
      g.add(arm);
      g.add(cylinder(0.1, 0.085, 0.02, metal, colX - 0.27, h - 0.13, colZ - 0.27, 20)); // Kopfbrause
      g.add(cylinder(0.035, 0.045, 0.09, metal, colX, 1.1, colZ, 12)); // Mischbatterie
      const hand = cylinder(0.02, 0.012, 0.16, metal, 0, 0, 0, 10);
      hand.position.set(colX - 0.05, 1.32, colZ - 0.05);
      hand.rotation.z = 0.4;
      g.add(hand);
      break;
    }
    case 'toilet': {
      const body = ceramic(c);
      // Spülkasten hinten mit Drücker
      g.add(box(w, 0.4, 0.15, body, 0, h * 0.75, d / 2 - 0.075));
      g.add(box(w * 0.3, 0.012, 0.08, chrome(), 0, h * 0.75 + 0.4, d / 2 - 0.08));
      // Fuß (elliptisch) und Becken
      const foot = cylinder(w * 0.24, w * 0.3, h * 0.6, body, 0, 0, -d * 0.08, 18);
      foot.scale.z = 1.5;
      g.add(foot);
      const bowl = cylinder(w * 0.48, w * 0.36, h * 0.4, body, 0, h * 0.55, -d * 0.1, 20);
      bowl.scale.z = 1.35;
      g.add(bowl);
      // Sitzring + geschlossener Deckel
      const seat = new THREE.Mesh(new THREE.TorusGeometry(w * 0.4, 0.022, 10, 24), ceramic('#fbfbf9'));
      seat.rotation.x = Math.PI / 2;
      seat.scale.y = 1.3; // nach Rotation: Tiefe
      seat.position.set(0, h * 0.96, -d * 0.1);
      seat.castShadow = true;
      g.add(seat);
      const lid = cylinder(w * 0.44, w * 0.44, 0.018, ceramic('#f6f6f3'), 0, h * 0.97, -d * 0.1, 20);
      lid.scale.z = 1.3;
      g.add(lid);
      break;
    }
    case 'sink': {
      const body = ceramic(c);
      const basinH = 0.16;
      // Standfuß (konisch) und ovales Becken
      g.add(cylinder(0.055, 0.09, h - basinH, body, 0, 0, d * 0.05, 16));
      const basin = cylinder(w / 2, w * 0.3, basinH, body, 0, h - basinH, 0, 22);
      basin.scale.z = d / w;
      g.add(basin);
      const inner = cylinder(w * 0.4, w * 0.25, 0.012, ceramic('#e8ebec'), 0, h - 0.012, 0, 20);
      inner.scale.z = d / w;
      g.add(inner);
      // Armatur hinten: Säule + gebogener Auslauf + Griff
      const metal = chrome();
      g.add(cylinder(0.013, 0.013, 0.14, metal, 0, h - 0.01, d / 2 - 0.09, 12));
      const spout = cylinder(0.01, 0.01, 0.1, metal, 0, 0, 0, 10);
      spout.position.set(0, h + 0.125, d / 2 - 0.14);
      spout.rotation.x = Math.PI / 2;
      g.add(spout);
      g.add(sphere(0.018, metal, 0.05, h + 0.06, d / 2 - 0.09));
      // Spiegel darüber (an der Wandseite)
      const mirror = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.95, 0.6, 0.015),
        new THREE.MeshStandardMaterial({ color: '#c4d8de', metalness: 1, roughness: 0.04 })
      );
      mirror.position.set(0, h + 0.65, d / 2 - 0.008);
      g.add(mirror);
      break;
    }
    case 'piano': {
      const lacquer = mat('#101014', { roughness: 0.16, metalness: 0.28 });
      const lacquerDark = mat('#1c1a18', { roughness: 0.22, metalness: 0.18 });
      const ivory = mat('#f2ece0', { roughness: 0.42 });
      const ebony = mat('#08080a', { roughness: 0.38 });
      const brass = mat('#b8942a', { metalness: 0.92, roughness: 0.32 });
      const pedalChrome = mat('#9aa4ae', { metalness: 0.88, roughness: 0.2 });

      const baseH = 0.07;
      const bodyH = h - baseH;
      const keyDepth = d * 0.44;

      // Sockel
      g.add(box(w * 0.98, baseH, d * 0.94, lacquerDark, 0, 0, 0));

      // Hauptgehäuse
      g.add(box(w * 0.95, bodyH * 0.9, d * 0.9, lacquer, 0, baseH, 0));

      // Seitenwangen (Cheeks)
      const cheekW = w * 0.09;
      const cheekD = d * 0.52;
      g.add(box(cheekW, bodyH * 0.72, cheekD, lacquerDark, -w / 2 + cheekW / 2 + 0.015, baseH, -d * 0.06));
      g.add(box(cheekW, bodyH * 0.72, cheekD, lacquerDark, w / 2 - cheekW / 2 - 0.015, baseH, -d * 0.06));

      // Oberteil / Klappschutz
      g.add(box(w * 0.92, bodyH * 0.1, d * 0.84, lacquer, 0, baseH + bodyH * 0.9, d * 0.02));
      const hood = box(w * 0.88, bodyH * 0.07, d * 0.62, lacquer, 0, h * 0.97, d * 0.04);
      hood.rotation.x = 0.12;
      g.add(hood);

      // Klappdeckel über der Klaviatur
      const fall = box(w * 0.84, 0.022, d * 0.36, lacquerDark, 0, baseH + bodyH * 0.54, -d / 2 + d * 0.2);
      fall.rotation.x = -0.22;
      g.add(fall);

      // Klaviatur
      const kb = new THREE.Group();
      kb.position.set(0, baseH + bodyH * 0.5, -d / 2 + keyDepth * 0.48);
      kb.rotation.x = -0.19;
      const whiteCount = 38;
      const keyW = (w * 0.82) / whiteCount;
      for (let i = 0; i < whiteCount; i++) {
        const x = -w * 0.41 + keyW * i + keyW / 2;
        kb.add(box(keyW * 0.9, 0.016, keyDepth * 0.82, ivory, x, 0, 0));
        const note = i % 7;
        if (i < whiteCount - 1 && [0, 1, 3, 4, 5].includes(note)) {
          kb.add(box(keyW * 0.58, 0.026, keyDepth * 0.48, ebony, x + keyW * 0.5, 0.011, -keyDepth * 0.14));
        }
      }
      g.add(kb);

      // Notenaufleger
      g.add(box(w * 0.52, 0.014, d * 0.18, lacquerDark, 0, baseH + bodyH * 0.74, -d / 2 + d * 0.13));
      g.add(box(w * 0.48, bodyH * 0.16, 0.025, lacquer, 0, baseH + bodyH * 0.66, -d / 2 + 0.018));

      // Pedalkonsolen
      g.add(box(0.025, 0.09, 0.035, brass, -0.13, baseH * 0.55, -d / 2 + d * 0.09));
      g.add(box(0.025, 0.09, 0.035, brass, 0.13, baseH * 0.55, -d / 2 + d * 0.09));
      for (const px of [-0.09, 0, 0.09]) {
        g.add(cylinder(0.028, 0.028, 0.014, pedalChrome, px, baseH * 0.42, -d / 2 + d * 0.11, 14));
      }

      // Griffleiste unter der Klaviatur
      g.add(box(w * 0.78, 0.018, 0.03, brass, 0, baseH + bodyH * 0.38, -d / 2 + 0.02));
      break;
    }
    default: {
      const entry = getCatalogEntry(item.type);
      g.add(box(w, h, d, mat(entry?.color ?? c)));
    }
  }

  return g;
}
