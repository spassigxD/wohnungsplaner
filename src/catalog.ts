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
  entry('sofa_corner', 'Übereck-Sofa', 'Wohnen', 260, 200, 80, '#5f6f7a'),
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
  // Küche
  entry('kitchen', 'Küchenzeile (240 cm)', 'Küche', 240, 62, 90, '#9aa5a1'),
  entry('kitchen_island', 'Kücheninsel', 'Küche', 120, 80, 90, '#a0a8a4'),
  entry('kitchen_base_60', 'Unterschrank 60 cm', 'Küche', 60, 60, 90, '#9aa5a1'),
  entry('kitchen_base_80', 'Unterschrank 80 cm', 'Küche', 80, 60, 90, '#9aa5a1'),
  entry('kitchen_sink_base', 'Spülenunterschrank', 'Küche', 80, 60, 90, '#9aa5a1'),
  entry('kitchen_corner', 'Eckunterschrank', 'Küche', 90, 90, 90, '#9aa5a1'),
  entry('kitchen_drawer', 'Schubladenschrank 60 cm', 'Küche', 60, 60, 90, '#9aa5a1'),
  entry('kitchen_oven', 'Backofenschrank 60 cm', 'Küche', 60, 60, 90, '#9aa5a1'),
  entry('kitchen_dishwasher', 'Geschirrspüler', 'Küche', 60, 60, 82, '#cfd4d8'),
  entry('kitchen_trash', 'Müllauszug', 'Küche', 40, 60, 90, '#8a8f8c'),
  entry('kitchen_wall_60', 'Oberschrank 60 cm', 'Küche', 60, 35, 72, '#b5bdb9', { elevation: 138 }),
  entry('kitchen_wall_80', 'Oberschrank 80 cm', 'Küche', 80, 35, 72, '#b5bdb9', { elevation: 138 }),
  entry('kitchen_open_shelf', 'Offenes Küchenregal', 'Küche', 80, 30, 180, '#c9bda9'),
  entry('kitchen_hood', 'Dunstabzugshaube', 'Küche', 90, 50, 40, '#d8dbde', { elevation: 150 }),
  entry('kitchen_hob', 'Kochfeld', 'Küche', 60, 50, 8, '#23262a', { elevation: 90 }),
  entry('kitchen_sink', 'Küchenspüle', 'Küche', 80, 50, 20, '#d8dde0', { elevation: 85 }),
  entry('kitchen_stove', 'Standherd 60 cm', 'Küche', 60, 60, 85, '#d0d4d8'),
  entry('kitchen_microwave', 'Mikrowelle', 'Küche', 60, 45, 38, '#d0d4d8', { elevation: 100 }),
  entry('kitchen_breakfast_bar', 'Frühstückstheke', 'Küche', 120, 40, 110, '#a0a8a4'),
  entry('fridge', 'Kühlschrank', 'Küche', 60, 65, 180, '#d8dbde'),
  entry('kitchen_fridge_tall', 'Kühlschrank hoch', 'Küche', 70, 65, 200, '#d8dbde'),
  entry('kitchen_freezer', 'Gefrierschrank', 'Küche', 60, 65, 150, '#d8dbde'),
  entry('kitchen_fridge_side', 'Side-by-Side Kühlschrank', 'Küche', 90, 70, 180, '#d8dbde'),
  entry('kitchen_wine_cooler', 'Weinkühlschrank', 'Küche', 60, 60, 85, '#3a2c38'),
  entry('kitchen_washing_machine', 'Waschmaschine', 'Küche', 60, 60, 85, '#e8ebee'),
  entry('kitchen_dryer', 'Trockner', 'Küche', 60, 60, 85, '#e8ebee'),
  // Bad
  entry('bathtub', 'Badewanne', 'Bad', 170, 75, 58, '#f4f4f2'),
  entry('shower', 'Dusche', 'Bad', 90, 90, 200, '#dfe6ea'),
  entry('sink', 'Waschbecken', 'Bad', 60, 45, 85, '#f4f4f2'),
  entry('toilet', 'WC', 'Bad', 38, 62, 42, '#f4f4f2'),
  // Türen
  entry('door_room', 'Zimmertür', 'Türen', 80, 12, 200, '#8b6f47'),
  entry('door_apartment', 'Wohnungstür', 'Türen', 90, 12, 200, '#6b5238'),
  entry('door_wide', 'Breite Tür', 'Türen', 100, 12, 200, '#7a6040'),
  entry('door_double', 'Doppeltür', 'Türen', 160, 12, 200, '#6b5238'),
];

export function getCatalogEntry(type: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.type === type);
}

export const CATEGORIES = [...new Set(CATALOG.map((e) => e.category))];
