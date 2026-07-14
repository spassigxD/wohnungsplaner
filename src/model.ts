// Alle Maße im Modell sind in Zentimetern (cm).
// Die 3D-Ansicht rechnet in Meter um (1 Einheit = 1 m), damit alles maßstabsgetreu ist.

import { isDoor, snapDoorToNearestWall } from './doors';

export type Mount = 'floor' | 'ceiling';

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number; // cm
  height: number; // cm
  color: string;
}

export interface FurnitureItem {
  id: string;
  type: string;
  name: string;
  x: number; // Mittelpunkt, cm
  y: number; // Mittelpunkt, cm
  rotation: number; // Grad, im Uhrzeigersinn
  width: number; // cm (Breite, lokale X-Achse)
  depth: number; // cm (Tiefe, lokale Y-Achse)
  height: number; // cm
  elevation: number; // cm über dem Boden (z. B. Monitor auf Tisch, TV an Wand)
  color: string;
  mount: Mount;
}

export interface Apartment {
  walls: Wall[];
  furniture: FurnitureItem[];
  ceilingHeight: number; // cm
  floorColor: string;
  ceilingColor: string;
}

export type Selection =
  | { kind: 'wall'; id: string }
  | { kind: 'furniture'; id: string }
  | null;

export type Tool = 'select' | 'wall';

let uidCounter = 0;
export function uid(): string {
  uidCounter += 1;
  return `${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const STORAGE_KEY = 'wohnungsplaner-apartment-v1';

export class Store {
  apartment: Apartment;
  selection: Selection = null;
  tool: Tool = 'select';
  snap = 5; // cm

  private listeners = new Set<() => void>();
  private saveTimer: number | undefined;

  constructor() {
    this.apartment = this.loadFromStorage() ?? defaultApartment();
  }

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  emit(): void {
    for (const fn of this.listeners) fn();
    this.scheduleSave();
  }

  getWall(id: string): Wall | undefined {
    return this.apartment.walls.find((w) => w.id === id);
  }

  getFurniture(id: string): FurnitureItem | undefined {
    return this.apartment.furniture.find((f) => f.id === id);
  }

  getSelectedWall(): Wall | undefined {
    return this.selection?.kind === 'wall' ? this.getWall(this.selection.id) : undefined;
  }

  getSelectedFurniture(): FurnitureItem | undefined {
    return this.selection?.kind === 'furniture' ? this.getFurniture(this.selection.id) : undefined;
  }

  select(sel: Selection): void {
    this.selection = sel;
    this.emit();
  }

  setTool(tool: Tool): void {
    this.tool = tool;
    if (tool !== 'select') this.selection = null;
    this.emit();
  }

  addWall(wall: Wall): void {
    this.apartment.walls.push(wall);
    this.selection = { kind: 'wall', id: wall.id };
    this.emit();
  }

  addFurniture(item: FurnitureItem): void {
    this.apartment.furniture.push(item);
    this.selection = { kind: 'furniture', id: item.id };
    this.emit();
  }

  removeSelected(): void {
    if (!this.selection) return;
    if (this.selection.kind === 'wall') {
      this.apartment.walls = this.apartment.walls.filter((w) => w.id !== this.selection!.id);
    } else {
      this.apartment.furniture = this.apartment.furniture.filter((f) => f.id !== this.selection!.id);
    }
    this.selection = null;
    this.emit();
  }

  duplicateSelected(): void {
    if (!this.selection) return;
    const offset = this.snap || 50;

    if (this.selection.kind === 'wall') {
      const w = this.getWall(this.selection.id);
      if (!w) return;
      this.addWall({
        ...w,
        id: uid(),
        x1: w.x1 + offset,
        y1: w.y1 + offset,
        x2: w.x2 + offset,
        y2: w.y2 + offset,
      });
      return;
    }

    const f = this.getFurniture(this.selection.id);
    if (!f) return;
    const copy: FurnitureItem = {
      ...f,
      id: uid(),
      x: f.x + offset,
      y: f.y + offset,
    };
    if (isDoor(f.type)) {
      snapDoorToNearestWall(copy, this.apartment.walls, this.snap);
    }
    this.addFurniture(copy);
  }

  reset(): void {
    this.apartment = defaultApartment();
    this.selection = null;
    this.emit();
  }

  exportJson(): string {
    return JSON.stringify(this.apartment, null, 2);
  }

  importJson(json: string): boolean {
    try {
      const data = JSON.parse(json) as Apartment;
      if (!Array.isArray(data.walls) || !Array.isArray(data.furniture)) return false;
      this.apartment = data;
      this.selection = null;
      this.emit();
      return true;
    } catch {
      return false;
    }
  }

  private scheduleSave(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.apartment));
      } catch {
        // Speicher voll oder nicht verfügbar – ignorieren
      }
    }, 400);
  }

  private loadFromStorage(): Apartment | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as Apartment;
      if (!Array.isArray(data.walls) || !Array.isArray(data.furniture)) return null;
      return data;
    } catch {
      return null;
    }
  }
}

// ---------- Beispielwohnung (ca. 8 m x 6 m, maßstabsgetreu) ----------

const OUTER = 24; // Außenwand 24 cm
const INNER = 11.5; // Innenwand 11,5 cm
const WALL_H = 260; // Raumhöhe 2,60 m
const WALL_COLOR = '#efe9dd';

function wall(x1: number, y1: number, x2: number, y2: number, thickness = INNER, color = WALL_COLOR): Wall {
  return { id: uid(), x1, y1, x2, y2, thickness, height: WALL_H, color };
}

function item(
  type: string,
  name: string,
  x: number,
  y: number,
  rotation: number,
  width: number,
  depth: number,
  height: number,
  color: string,
  mount: Mount = 'floor',
  elevation = 0
): FurnitureItem {
  return { id: uid(), type, name, x, y, rotation, width, depth, height, elevation, color, mount };
}

export function defaultApartment(): Apartment {
  const walls: Wall[] = [
    // Außenwände (Rechteck 8 m x 6 m), Haustür unten links (90 cm Öffnung)
    wall(0, 0, 800, 0, OUTER),
    wall(800, 0, 800, 600, OUTER),
    wall(0, 0, 0, 600, OUTER),
    wall(0, 600, 800, 600, OUTER),
    // Innenwand vertikal: trennt Wohnzimmer (links) von Schlafzimmer/Bad (rechts)
    wall(450, 0, 450, 600),
    // Innenwand horizontal: trennt Schlafzimmer (oben) und Bad (unten)
    wall(450, 380, 800, 380),
  ];

  const furniture: FurnitureItem[] = [
    // Wohnzimmer (links)
    item('rug', 'Teppich', 220, 330, 0, 240, 170, 1, '#c2a284'),
    item('sofa', 'Sofa', 220, 430, 0, 220, 95, 80, '#7a8b6f'),
    item('lowboard', 'TV-Lowboard', 220, 190, 180, 180, 42, 45, '#4a3b2f'),
    item('tv', 'Fernseher 65"', 220, 186, 180, 145, 8, 84, '#101418', 'floor', 45),
    item('desk', 'Schreibtisch', 90, 100, 90, 150, 75, 75, '#8a6a4f'),
    item('chair', 'Bürostuhl', 155, 100, 270, 55, 55, 100, '#333a40'),
    item('monitor', 'Monitor 27"', 65, 100, 90, 62, 6, 40, '#14181c', 'floor', 76),
    item('pc', 'PC-Tower', 70, 210, 90, 22, 46, 47, '#1a1e24'),
    item('dining_table', 'Esstisch', 330, 100, 0, 150, 90, 75, '#a07850'),
    item('chair', 'Stuhl', 285, 45, 180, 45, 45, 90, '#6b4f39'),
    item('chair', 'Stuhl', 375, 45, 180, 45, 45, 90, '#6b4f39'),
    item('chair', 'Stuhl', 285, 158, 0, 45, 45, 90, '#6b4f39'),
    item('chair', 'Stuhl', 375, 158, 0, 45, 45, 90, '#6b4f39'),
    item('lamp_floor', 'Stehlampe', 45, 545, 0, 40, 40, 165, '#d9c58f'),
    item('plant', 'Zimmerpflanze', 415, 555, 0, 45, 45, 160, '#3f7a3f'),
    item('lamp_ceiling', 'Deckenlampe', 225, 300, 0, 45, 45, 60, '#f2e6c8', 'ceiling'),
    // Schlafzimmer (rechts oben)
    item('bed', 'Doppelbett', 630, 130, 180, 160, 200, 45, '#93a9bb'),
    item('wardrobe', 'Kleiderschrank', 755, 255, 270, 220, 60, 220, '#cfc4b0'),
    item('sideboard', 'Kommode', 480, 300, 90, 100, 42, 80, '#b39b7d'),
    item('lamp_ceiling', 'Deckenlampe', 625, 200, 0, 40, 40, 50, '#f2e6c8', 'ceiling'),
    // Bad (rechts unten)
    item('bathtub', 'Badewanne', 705, 445, 0, 170, 75, 58, '#f4f4f2'),
    item('sink', 'Waschbecken', 520, 560, 0, 60, 45, 85, '#f4f4f2'),
    item('toilet', 'WC', 640, 555, 0, 38, 62, 42, '#f4f4f2'),
    item('lamp_ceiling', 'Deckenlampe', 625, 490, 0, 30, 30, 25, '#ffffff', 'ceiling'),
    // Türen in bestehenden Wandöffnungen
    item('door_apartment', 'Wohnungstür', 245, 600, 0, 90, 12, 200, '#6b5238'),
    item('door_room', 'Zimmertür', 450, 185, 90, 80, 12, 200, '#8b6f47'),
    item('door_room', 'Zimmertür', 450, 485, 90, 80, 12, 200, '#8b6f47'),
    item('door_room', 'Zimmertür', 450, 565, 90, 80, 12, 200, '#8b6f47'),
  ];

  return {
    walls,
    furniture,
    ceilingHeight: WALL_H,
    floorColor: '#b98d62',
    ceilingColor: '#f6f3ec',
  };
}
