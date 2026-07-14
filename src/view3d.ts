import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Store, Wall } from './model';
import { buildFurniture } from './furniture3d';
import { getWallOpenings, isDoor, findWallForDoor, doorOpeningOnWall, splitWallAtOpenings } from './doors';
import { createDoor3D, doorWorldRotation, setDoorOpenAmount, type Door3DInstance } from './door3d';
import { woodFloorTexture, plasterTexture, skyTexture } from './textures';

const EYE_HEIGHT = 1.6; // m
const PLAYER_RADIUS = 0.22; // m
const WALK_SPEED = 2.2; // m/s
const RUN_SPEED = 4.5; // m/s

interface WallSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  halfThickness: number;
}

export class View3D {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: PointerLockControls | null = null;
  private animationId = 0;
  private clock = new THREE.Clock();
  private keys = new Set<string>();
  private wallSegments: WallSegment[] = [];
  private doors: Door3DInstance[] = [];
  private raycaster = new THREE.Raycaster();
  private velocity = new THREE.Vector3();
  private keyDownHandler = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'KeyE' && this.controls?.isLocked) {
      this.tryToggleDoor();
    }
  };
  private keyUpHandler = (e: KeyboardEvent) => this.keys.delete(e.code);
  private resizeHandler = () => this.onResize();

  active = false;

  constructor(private container: HTMLElement, private overlay: HTMLElement, private store: Store) {}

  enter(): void {
    if (this.active) return;
    this.active = true;
    this.container.style.display = 'block';

    const apt = this.store.apartment;
    const scene = new THREE.Scene();
    scene.background = skyTexture();
    scene.fog = new THREE.Fog('#c8d8e8', 35, 95);
    this.scene = scene;

    // ---- Geometrie aus dem Grundriss (cm -> m) ----
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const w of apt.walls) {
      minX = Math.min(minX, w.x1, w.x2);
      minZ = Math.min(minZ, w.y1, w.y2);
      maxX = Math.max(maxX, w.x1, w.x2);
      maxZ = Math.max(maxZ, w.y1, w.y2);
    }
    if (!isFinite(minX)) {
      minX = 0; minZ = 0; maxX = 800; maxZ = 600;
    }
    const bMinX = minX / 100, bMinZ = minZ / 100, bMaxX = maxX / 100, bMaxZ = maxZ / 100;
    const spanX = bMaxX - bMinX;
    const spanZ = bMaxZ - bMinZ;
    const ceilY = apt.ceilingHeight / 100;

    // Umgebung (Wiese)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: '#7da765', roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(bMinX + spanX / 2, -0.02, bMinZ + spanZ / 2);
    ground.receiveShadow = true;
    scene.add(ground);

    // Fußboden: Parkett in der gewählten Bodenfarbe
    const floorTex = woodFloorTexture(apt.floorColor).clone();
    floorTex.repeat.set(spanX / 2, spanZ / 2); // Kachel = 2 m
    floorTex.needsUpdate = true;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX, spanZ),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(bMinX + spanX / 2, 0, bMinZ + spanZ / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Decke (von unten sichtbar), feiner Putz
    const ceilTex = plasterTexture(apt.ceilingColor).clone();
    ceilTex.repeat.set(spanX / 1.5, spanZ / 1.5);
    ceilTex.needsUpdate = true;
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX, spanZ),
      new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.95, side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(bMinX + spanX / 2, ceilY, bMinZ + spanZ / 2);
    scene.add(ceiling);

    // Wände (mit Türöffnungen)
    this.wallSegments = [];
    for (const w of apt.walls) {
      const openings = getWallOpenings(w, apt.furniture);
      const slices = splitWallAtOpenings(w, openings);
      for (const slice of slices) {
        scene.add(this.buildWallMesh(slice));
        this.wallSegments.push({
          x1: slice.x1 / 100,
          z1: slice.y1 / 100,
          x2: slice.x2 / 100,
          z2: slice.y2 / 100,
          halfThickness: slice.thickness / 200,
        });
      }

      // Sturz: Wandstück oberhalb jeder Türöffnung
      for (const item of apt.furniture) {
        if (!isDoor(item.type)) continue;
        const opening = doorOpeningOnWall(item, w);
        if (!opening || item.height >= w.height - 1) continue;
        const lintel = this.buildWallMesh({
          x1: w.x1 + (w.x2 - w.x1) * opening.start,
          y1: w.y1 + (w.y2 - w.y1) * opening.start,
          x2: w.x1 + (w.x2 - w.x1) * opening.end,
          y2: w.y1 + (w.y2 - w.y1) * opening.end,
          thickness: w.thickness,
          height: w.height - item.height,
          color: w.color,
        });
        lintel.position.y = (item.height + (w.height - item.height) / 2) / 100;
        scene.add(lintel);
      }
    }

    // Möbel & Türen
    this.doors = [];
    for (const item of apt.furniture) {
      if (isDoor(item.type)) {
        const door = createDoor3D(item, apt.walls);
        const wall = findWallForDoor(item, apt.walls);
        door.root.position.set(item.x / 100, 0, item.y / 100);
        door.root.rotation.y = doorWorldRotation(wall, item);
        scene.add(door.root);
        this.doors.push(door);
        continue;
      }
      const g = buildFurniture(item);
      g.position.set(item.x / 100, item.mount === 'ceiling' ? ceilY : item.elevation / 100, item.y / 100);
      g.rotation.y = (-item.rotation * Math.PI) / 180;
      scene.add(g);
    }

    // ---- Licht ----
    scene.add(new THREE.AmbientLight('#e6ddcf', 0.18));
    const hemi = new THREE.HemisphereLight('#dceaff', '#8a6f52', 0.38);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#ffe9c4', 1.2);
    sun.position.set(bMinX + spanX / 2 + 15, 20, bMinZ + spanZ / 2 + 10);
    sun.target.position.set(bMinX + spanX / 2, 0, bMinZ + spanZ / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    scene.add(sun, sun.target);

    // ---- Kamera & Steuerung ----
    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 200);
    camera.position.set(bMinX + spanX / 2, EYE_HEIGHT, bMinZ + spanZ / 2);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.container.prepend(renderer.domElement);
    this.renderer = renderer;

    // Environment-Map, damit Chrom, Spiegel und Keramik realistisch reflektieren
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
    pmrem.dispose();

    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.addEventListener('lock', () => this.overlay.classList.add('hidden'));
    controls.addEventListener('unlock', () => {
      if (this.active) this.overlay.classList.remove('hidden');
    });
    renderer.domElement.addEventListener('click', () => {
      if (this.active && !controls.isLocked) controls.lock();
    });
    this.overlay.addEventListener('click', this.overlayClick);
    this.controls = controls;

    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    window.addEventListener('resize', this.resizeHandler);

    this.overlay.classList.remove('hidden');
    this.onResize();
    this.clock.start();
    this.animate();
  }

  private overlayClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    this.controls?.lock();
  };

  exit(): void {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.animationId);
    this.controls?.unlock();
    this.controls?.disconnect();
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    window.removeEventListener('resize', this.resizeHandler);
    this.overlay.removeEventListener('click', this.overlayClick);
    this.keys.clear();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
    this.scene?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      }
    });
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.doors = [];
    this.container.style.display = 'none';
  }

  private buildWallMesh(w: Wall | { x1: number; y1: number; x2: number; y2: number; thickness: number; height: number; color: string }): THREE.Mesh {
    const x1 = w.x1 / 100, z1 = w.y1 / 100, x2 = w.x2 / 100, z2 = w.y2 / 100;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const height = w.height / 100;
    const geo = new THREE.BoxGeometry(len, height, w.thickness / 100);
    const wallTex = plasterTexture(w.color).clone();
    wallTex.repeat.set(Math.max(1, len / 1.5), Math.max(1, height / 1.5));
    wallTex.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92 }));
    mesh.position.set((x1 + x2) / 2, height / 2, (z1 + z2) / 2);
    mesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private onResize(): void {
    if (!this.renderer || !this.camera) return;
    const rect = this.container.getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height);
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
  }

  private animate = (): void => {
    if (!this.active || !this.renderer || !this.scene || !this.camera || !this.controls) return;
    this.animationId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    for (const door of this.doors) {
      const target = door.open ? 1 : 0;
      if (Math.abs(door.openAmount - target) > 0.001) {
        const next = THREE.MathUtils.lerp(door.openAmount, target, 1 - Math.pow(0.001, delta));
        setDoorOpenAmount(door, next);
      }
    }

    if (this.controls.isLocked) {
      const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? RUN_SPEED : WALK_SPEED;
      const dir = new THREE.Vector3();
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dir.z += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dir.z -= 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dir.x -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dir.x += 1;
      if (dir.lengthSq() > 0) {
        dir.normalize();
        this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, dir.x * speed, 0.25);
        this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, dir.z * speed, 0.25);
      } else {
        this.velocity.multiplyScalar(0.8);
      }
      this.controls.moveRight(this.velocity.x * delta);
      this.controls.moveForward(this.velocity.z * delta);
      this.resolveCollisions();
      this.camera.position.y = EYE_HEIGHT;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private tryToggleDoor(): void {
    if (!this.camera || !this.scene) return;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const camPos = this.camera.position;
    let best: Door3DInstance | null = null;
    let bestDist = 2.8;

    for (const door of this.doors) {
      const hit = this.raycaster.intersectObjects(door.meshTargets, false)[0];
      if (!hit) continue;
      const dist = hit.point.distanceTo(camPos);
      if (dist < bestDist) {
        best = door;
        bestDist = dist;
      }
    }

    if (best) best.open = !best.open;
  };

  private resolveCollisions(): void {
    if (!this.camera) return;
    const p = this.camera.position;

    // Geschlossene Türen blockieren wie ein Wandstück
    const segments: WallSegment[] = [...this.wallSegments];
    for (const door of this.doors) {
      if (door.openAmount > 0.5) continue;
      const r = (door.item.rotation * Math.PI) / 180;
      const dx = Math.cos(r);
      const dz = Math.sin(r);
      const halfW = door.item.width / 200;
      segments.push({
        x1: door.item.x / 100 - dx * halfW,
        z1: door.item.y / 100 - dz * halfW,
        x2: door.item.x / 100 + dx * halfW,
        z2: door.item.y / 100 + dz * halfW,
        halfThickness: 0.05,
      });
    }

    for (let iter = 0; iter < 3; iter++) {
      let pushed = false;
      for (const s of segments) {
        const dx = s.x2 - s.x1;
        const dz = s.z2 - s.z1;
        const lenSq = dx * dx + dz * dz;
        if (lenSq === 0) continue;
        let t = ((p.x - s.x1) * dx + (p.z - s.z1) * dz) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const cx = s.x1 + t * dx;
        const cz = s.z1 + t * dz;
        let nx = p.x - cx;
        let nz = p.z - cz;
        const dist = Math.hypot(nx, nz);
        const minDist = s.halfThickness + PLAYER_RADIUS;
        if (dist < minDist) {
          if (dist < 1e-6) {
            nx = -dz;
            nz = dx;
            const nl = Math.hypot(nx, nz) || 1;
            nx /= nl;
            nz /= nl;
          } else {
            nx /= dist;
            nz /= dist;
          }
          p.x = cx + nx * minDist;
          p.z = cz + nz * minDist;
          pushed = true;
        }
      }
      if (!pushed) break;
    }
  }
}
