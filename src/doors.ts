import type { FurnitureItem, Wall } from './model';

export function isDoor(type: string): boolean {
  return type.startsWith('door_');
}

export function wallAngleDeg(wall: Wall): number {
  return (Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180) / Math.PI;
}

export function wallLength(wall: Wall): number {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

export function distToWall(p: { x: number; y: number }, wall: Wall): number {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - wall.x1, p.y - wall.y1);
  let t = ((p.x - wall.x1) * dx + (p.y - wall.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (wall.x1 + t * dx), p.y - (wall.y1 + t * dy));
}

export function projectOnWall(p: { x: number; y: number }, wall: Wall): { t: number; x: number; y: number } {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { t: 0, x: wall.x1, y: wall.y1 };
  const t = Math.max(0, Math.min(1, ((p.x - wall.x1) * dx + (p.y - wall.y1) * dy) / lenSq));
  return { t, x: wall.x1 + t * dx, y: wall.y1 + t * dy };
}

export function nearestWall(
  p: { x: number; y: number },
  walls: Wall[],
  maxDist = 40
): { wall: Wall; dist: number } | null {
  let best: { wall: Wall; dist: number } | null = null;
  for (const wall of walls) {
    const dist = distToWall(p, wall);
    if (dist <= maxDist + wall.thickness / 2 && (!best || dist < best.dist)) {
      best = { wall, dist };
    }
  }
  return best;
}

export function snapDoorToWall(door: FurnitureItem, wall: Wall, snap = 5): void {
  const len = wallLength(wall);
  if (len === 0) return;
  const half = door.width / 2;
  const proj = projectOnWall({ x: door.x, y: door.y }, wall);
  const minT = half / len;
  const maxT = 1 - minT;
  const t = minT <= maxT ? Math.max(minT, Math.min(maxT, proj.t)) : 0.5;
  const snappedT = snap > 0 ? Math.round((t * len) / snap) * snap / len : t;
  const clampedT = Math.max(minT, Math.min(maxT, snappedT));
  door.x = wall.x1 + (wall.x2 - wall.x1) * clampedT;
  door.y = wall.y1 + (wall.y2 - wall.y1) * clampedT;
  door.rotation = ((wallAngleDeg(wall) % 360) + 360) % 360;
}

export function snapDoorToNearestWall(door: FurnitureItem, walls: Wall[], snap = 5): boolean {
  const hit = nearestWall({ x: door.x, y: door.y }, walls);
  if (!hit) return false;
  snapDoorToWall(door, hit.wall, snap);
  return true;
}

/** Platziert eine Tür auf einer bestimmten Wand (z. B. die gerade ausgewählte). */
export function placeDoorOnWall(
  door: FurnitureItem,
  wall: Wall,
  anchor: { x: number; y: number },
  snap = 5
): void {
  door.x = anchor.x;
  door.y = anchor.y;
  snapDoorToWall(door, wall, snap);
}

export function findWallForDoor(door: FurnitureItem, walls: Wall[]): Wall | undefined {
  for (const wall of walls) {
    if (doorOpeningOnWall(door, wall)) return wall;
  }
  return undefined;
}

export function doorOpeningOnWall(
  door: FurnitureItem,
  wall: Wall,
  angleTolerance = 8
): { start: number; end: number } | null {
  if (!isDoor(door.type)) return null;
  const len = wallLength(wall);
  if (len === 0) return null;

  const wAng = wallAngleDeg(wall);
  const diff = Math.abs(((door.rotation - wAng + 180) % 360) - 180);
  if (diff > angleTolerance) return null;
  if (distToWall({ x: door.x, y: door.y }, wall) > wall.thickness / 2 + 8) return null;

  const proj = projectOnWall({ x: door.x, y: door.y }, wall);
  const half = door.width / 2 / len;
  const start = proj.t - half;
  const end = proj.t + half;
  if (end <= 0 || start >= 1) return null;
  return { start: Math.max(0, start), end: Math.min(1, end) };
}

export function getWallOpenings(wall: Wall, furniture: FurnitureItem[]): { start: number; end: number }[] {
  const openings: { start: number; end: number }[] = [];
  for (const item of furniture) {
    const opening = doorOpeningOnWall(item, wall);
    if (opening) openings.push(opening);
  }
  return mergeOpenings(openings);
}

export interface WallSlice {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  height: number;
  color: string;
}

export function splitWallAtOpenings(wall: Wall, openings: { start: number; end: number }[]): WallSlice[] {
  if (openings.length === 0) {
    return [
      {
        x1: wall.x1,
        y1: wall.y1,
        x2: wall.x2,
        y2: wall.y2,
        thickness: wall.thickness,
        height: wall.height,
        color: wall.color,
      },
    ];
  }

  const merged = mergeOpenings(openings);
  const slices: WallSlice[] = [];
  let cursor = 0;
  for (const opening of merged) {
    if (opening.start > cursor + 0.005) {
      slices.push(sliceWall(wall, cursor, opening.start));
    }
    cursor = opening.end;
  }
  if (cursor < 0.995) {
    slices.push(sliceWall(wall, cursor, 1));
  }
  return slices.filter((s) => wallLength(s as Wall) >= 1);
}

function sliceWall(wall: Wall, t0: number, t1: number): WallSlice {
  return {
    x1: wall.x1 + (wall.x2 - wall.x1) * t0,
    y1: wall.y1 + (wall.y2 - wall.y1) * t0,
    x2: wall.x1 + (wall.x2 - wall.x1) * t1,
    y2: wall.y1 + (wall.y2 - wall.y1) * t1,
    thickness: wall.thickness,
    height: wall.height,
    color: wall.color,
  };
}

function mergeOpenings(openings: { start: number; end: number }[]): { start: number; end: number }[] {
  if (openings.length === 0) return [];
  const sorted = [...openings].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end + 0.01) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

export function hitDoor(p: { x: number; y: number }, door: FurnitureItem, zoom = 1): boolean {
  const rad = (-door.rotation * Math.PI) / 180;
  const dx = p.x - door.x;
  const dy = p.y - door.y;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  const pad = 8 / zoom;
  return Math.abs(lx) <= door.width / 2 + pad && Math.abs(ly) <= Math.max(door.depth, 20) / 2 + pad;
}
