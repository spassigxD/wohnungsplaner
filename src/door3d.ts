import * as THREE from 'three';
import type { FurnitureItem, Wall } from './model';
import { findWallForDoor } from './doors';

function mat(color: string | number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...opts });
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export interface Door3DInstance {
  root: THREE.Group;
  leaf: THREE.Group;
  leaf2?: THREE.Group;
  itemId: string;
  open: boolean;
  openAmount: number;
  meshTargets: THREE.Object3D[];
}

export function doorWorldRotation(wall: Wall | undefined, item: FurnitureItem): number {
  if (wall) return -Math.atan2((wall.y2 - wall.y1) / 100, (wall.x2 - wall.x1) / 100);
  return (-item.rotation * Math.PI) / 180;
}

function addLeaf(
  root: THREE.Group,
  hingeX: number,
  leafW: number,
  leafH: number,
  leafT: number,
  leafMat: THREE.Material,
  handleMat: THREE.Material,
  mirror = false
): { group: THREE.Group; meshes: THREE.Object3D[] } {
  const group = new THREE.Group();
  group.position.set(hingeX, 0, 0);
  const dir = mirror ? -1 : 1;
  const panel = box(leafW, leafH, leafT, leafMat, dir * (leafW / 2), leafH / 2, 0);
  const handle = box(0.02, 0.12, 0.03, handleMat, dir * (leafW * 0.82), leafH * 0.48, 0.02);
  group.add(panel, handle);
  root.add(group);
  return { group, meshes: [panel, handle] };
}

export function createDoor3D(item: FurnitureItem, walls: Wall[]): Door3DInstance {
  const wall = findWallForDoor(item, walls);
  const root = new THREE.Group();
  const w = item.width / 100;
  const h = item.height / 100;
  const wallDepth = (wall?.thickness ?? item.depth) / 100;
  const frame = mat(item.color, { roughness: 0.65 });
  const leafMat = mat('#e8dcc8', { roughness: 0.7 });
  const handleMat = mat('#b8bec4', { metalness: 0.85, roughness: 0.25 });

  const jamb = 0.05;
  const leafT = 0.04;
  const halfW = w / 2;

  // Nur Zargen – kein volles Rückenteil in der Öffnung
  root.add(box(jamb, h, wallDepth, frame, -halfW + jamb / 2, 0, 0));
  root.add(box(jamb, h, wallDepth, frame, halfW - jamb / 2, 0, 0));
  root.add(box(w, jamb, wallDepth, frame, 0, h - jamb / 2, 0));

  const meshTargets: THREE.Object3D[] = [];
  const leafH = Math.max(0.5, h - jamb);

  if (item.type === 'door_double') {
    const leafW = Math.max(0.18, (w - jamb * 2) / 2);
    const left = addLeaf(root, -halfW + jamb, leafW, leafH, leafT, leafMat, handleMat, false);
    const right = addLeaf(root, halfW - jamb, leafW, leafH, leafT, leafMat, handleMat, true);
    meshTargets.push(...left.meshes, ...right.meshes);
    return { root, leaf: left.group, leaf2: right.group, itemId: item.id, open: false, openAmount: 0, meshTargets };
  }

  const leafW = Math.max(0.2, w - jamb * 2);
  const left = addLeaf(root, -halfW + jamb, leafW, leafH, leafT, leafMat, handleMat, false);
  meshTargets.push(...left.meshes);
  return { root, leaf: left.group, itemId: item.id, open: false, openAmount: 0, meshTargets };
}

export function setDoorOpenAmount(door: Door3DInstance, amount: number): void {
  door.openAmount = amount;
  const angle = amount * (Math.PI / 2) * 0.92;
  door.leaf.rotation.y = -angle;
  if (door.leaf2) door.leaf2.rotation.y = angle;
}
