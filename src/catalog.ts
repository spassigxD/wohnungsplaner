import type { Mount } from './model';

export interface CatalogEntry {
  type: string;
  label: string;
  category: string;
  width: number; // cm
  depth: number; // cm
  height: number; // cm
  color: string;
  mount: Mount;
  elevation: number; // cm
  emitsLight?: boolean;
}

function entry(
  type: string,
  label: string,
  category: string,
  width: number,
  depth: number,
  height: number,
  color: string,
  opts: Partial<Pick<CatalogEntry, 'mount' | 'elevation' | 'emitsLight'>> = {}
): CatalogEntry {
  return {
    type,
    label,
    category,
    width,
    depth,
    height,
    color,
    mount: opts.mount ?? 'floor',
    elevation: opts.elevation ?? 0,
    emitsLight: opts.emitsLight ?? false,
  };
}

// Alle Standardmaße entsprechen üblichen realen Möbelmaßen (cm).
export const CATALOG: CatalogEntry[] = [
  // Wohnen
  entry('sofa', 'Sofa (3-Sitzer)', 'Wohnen', 220, 95, 80, '#5b7a8c'),
  entry('armchair', 'Sessel', 'Wohnen', 85, 85, 78, '#7d6b5d'),
  entry('dining_table', 'Esstisch', 'Wohnen', 160, 90, 75, '#a07850'),
  entry('coffee_table', 'Couchtisch', 'Wohnen', 110, 60, 45, '#8a6a4f'),
  entry('chair', 'Stuhl', 'Wohnen', 45, 45, 90, '#6b4f39'),
  entry('shelf', 'Regal', 'Wohnen', 80, 35, 180, '#c9bda9'),
  entry('sideboard', 'Kommode / Sideboard', 'Wohnen', 120, 42, 80, '#b39b7d'),
  entry('rug', 'Teppich', 'Wohnen', 200, 140, 1, '#b08968'),
  entry('plant', 'Zimmerpflanze', 'Wohnen', 45, 45, 160, '#3f7a3f'),
  // Schlafen
  entry('bed', 'Doppelbett (160x200)', 'Schlafen', 160, 200, 45, '#7c9ab0'),
  entry('bed_single', 'Einzelbett (90x200)', 'Schlafen', 90, 200, 45, '#9ab07c'),
  entry('wardrobe', 'Kleiderschrank', 'Schlafen', 200, 60, 220, '#c9bda9'),
  // Arbeiten & Technik
  entry('desk', 'Schreibtisch', 'Technik', 140, 70, 75, '#8a6a4f'),
  entry('monitor', 'Monitor 27"', 'Technik', 62, 6, 40, '#14181c', { elevation: 76 }),
  entry('pc', 'PC-Tower', 'Technik', 22, 46, 47, '#1a1e24', { elevation: 0 }),
  entry('tv', 'Fernseher 55"', 'Technik', 123, 8, 71, '#101418', { elevation: 60 }),
  entry('lowboard', 'TV-Lowboard', 'Technik', 160, 42, 45, '#4a3b2f'),
  // Lampen
  entry('lamp_floor', 'Stehlampe', 'Lampen', 40, 40, 165, '#d9c58f', { emitsLight: true }),
  entry('lamp_table', 'Tischlampe', 'Lampen', 25, 25, 45, '#d9c58f', { elevation: 76, emitsLight: true }),
  entry('lamp_ceiling', 'Deckenlampe (Pendel)', 'Lampen', 45, 45, 60, '#f2e6c8', { mount: 'ceiling', emitsLight: true }),
  entry('lamp_ceiling_flat', 'Deckenleuchte (flach)', 'Lampen', 35, 35, 12, '#ffffff', { mount: 'ceiling', emitsLight: true }),
  // Küche & Bad
  entry('kitchen', 'Küchenzeile', 'Küche & Bad', 240, 62, 90, '#9aa5a1'),
  entry('fridge', 'Kühlschrank', 'Küche & Bad', 60, 65, 180, '#d8dbde'),
  entry('bathtub', 'Badewanne', 'Küche & Bad', 170, 75, 58, '#f4f4f2'),
  entry('shower', 'Dusche', 'Küche & Bad', 90, 90, 200, '#dfe6ea'),
  entry('sink', 'Waschbecken', 'Küche & Bad', 60, 45, 85, '#f4f4f2'),
  entry('toilet', 'WC', 'Küche & Bad', 38, 62, 42, '#f4f4f2'),
];

export function getCatalogEntry(type: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.type === type);
}

export const CATEGORIES = [...new Set(CATALOG.map((e) => e.category))];
