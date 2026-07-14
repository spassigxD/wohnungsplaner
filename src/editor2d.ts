import { Store, Wall, FurnitureItem, uid } from './model';
import {
  doorOpeningOnWall,
  getWallOpenings,
  hitDoor,
  isDoor,
  snapDoorToNearestWall,
  snapDoorToWall,
  splitWallAtOpenings,
} from './doors';
import { cornerSofaLayout, cornerSofaSide, isCornerSofa, pointInCornerSofa } from './cornerSofa';

interface Point {
  x: number;
  y: number;
}

type DragState =
  | { kind: 'none' }
  | { kind: 'pan'; startClient: Point; startView: Point }
  | { kind: 'furniture'; id: string; offset: Point }
  | { kind: 'furniture-rotate'; id: string }
  | { kind: 'wall-endpoint'; id: string; end: 1 | 2; doorIds: string[] }
  | { kind: 'wall-body'; id: string; start: Point; orig: { x1: number; y1: number; x2: number; y2: number }; doorIds: string[] }
  | { kind: 'draw-wall'; start: Point; current: Point };

export class Editor2D {
  private ctx: CanvasRenderingContext2D;
  private viewX = -100; // Welt-cm der linken oberen Ecke
  private viewY = -100;
  private zoom = 0.9; // Pixel pro cm
  private drag: DragState = { kind: 'none' };
  private mouseWorld: Point = { x: 0, y: 0 };
  private spaceDown = false;

  onCursorMove: ((p: Point, zoom: number) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement, private store: Store) {
    this.ctx = canvas.getContext('2d')!;
    store.onChange(() => this.render());

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.spaceDown = false;
    });

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      this.render();
    };
    new ResizeObserver(resize).observe(canvas.parentElement!);
    resize();
  }

  get pixelsPerCm(): number {
    return this.zoom;
  }

  zoomBy(factor: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.zoomAt(factor, rect.width / 2, rect.height / 2);
  }

  centerOnContent(): void {
    const { walls, furniture } = this.store.apartment;
    if (walls.length === 0 && furniture.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const w of walls) {
      minX = Math.min(minX, w.x1, w.x2);
      minY = Math.min(minY, w.y1, w.y2);
      maxX = Math.max(maxX, w.x1, w.x2);
      maxY = Math.max(maxY, w.y1, w.y2);
    }
    for (const f of furniture) {
      minX = Math.min(minX, f.x - f.width / 2);
      minY = Math.min(minY, f.y - f.depth / 2);
      maxX = Math.max(maxX, f.x + f.width / 2);
      maxY = Math.max(maxY, f.y + f.depth / 2);
    }
    const rect = this.canvas.getBoundingClientRect();
    const pad = 80; // px
    this.zoom = Math.min(
      (rect.width - pad * 2) / (maxX - minX),
      (rect.height - pad * 2) / (maxY - minY)
    );
    this.zoom = Math.max(0.05, Math.min(10, this.zoom));
    this.viewX = minX - (rect.width / this.zoom - (maxX - minX)) / 2;
    this.viewY = minY - (rect.height / this.zoom - (maxY - minY)) / 2;
    this.render();
  }

  viewCenterWorld(): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: this.viewX + rect.width / 2 / this.zoom,
      y: this.viewY + rect.height / 2 / this.zoom,
    };
  }

  // ---------- Koordinaten ----------

  private toWorld(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: this.viewX + (e.clientX - rect.left) / this.zoom,
      y: this.viewY + (e.clientY - rect.top) / this.zoom,
    };
  }

  private snap(v: number): number {
    const s = this.store.snap;
    return s > 0 ? Math.round(v / s) * s : Math.round(v);
  }

  private snapPoint(p: Point): Point {
    return { x: this.snap(p.x), y: this.snap(p.y) };
  }

  /** Snappt auf Endpunkte existierender Wände (Magnet), sonst aufs Raster. */
  /** IDs aller Türen, die aktuell in dieser Wand sitzen. */
  private attachedDoorIds(wall: Wall): string[] {
    return this.store.apartment.furniture
      .filter((f) => isDoor(f.type) && doorOpeningOnWall(f, wall))
      .map((f) => f.id);
  }

  /** Türen nach einer Wandänderung wieder exakt in die Wand setzen. */
  private resnapDoors(doorIds: string[], wall: Wall): void {
    for (const id of doorIds) {
      const f = this.store.getFurniture(id);
      if (f) snapDoorToWall(f, wall, this.store.snap);
    }
  }

  private snapWallPoint(p: Point): Point {
    const magnetDist = 12 / this.zoom;
    for (const w of this.store.apartment.walls) {
      for (const end of [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }]) {
        if (Math.hypot(p.x - end.x, p.y - end.y) < magnetDist) return { ...end };
      }
    }
    return this.snapPoint(p);
  }

  // ---------- Hit-Tests ----------

  private hitFurniture(p: Point): FurnitureItem | null {
    const items = this.store.apartment.furniture;
    for (let i = items.length - 1; i >= 0; i--) {
      const f = items[i];
      if (isDoor(f.type)) {
        if (hitDoor(p, f, this.zoom)) return f;
        continue;
      }
      const rad = (-f.rotation * Math.PI) / 180;
      const dx = p.x - f.x;
      const dy = p.y - f.y;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      if (isCornerSofa(f.type)) {
        if (pointInCornerSofa(lx, ly, f.width, f.depth, cornerSofaSide(f.type))) return f;
        continue;
      }
      if (Math.abs(lx) <= f.width / 2 && Math.abs(ly) <= f.depth / 2) return f;
    }
    return null;
  }

  private hitWall(p: Point): Wall | null {
    let best: Wall | null = null;
    let bestDist = Infinity;
    for (const w of this.store.apartment.walls) {
      const d = distToSegment(p, w);
      const limit = w.thickness / 2 + 4 / this.zoom;
      if (d < limit && d < bestDist) {
        best = w;
        bestDist = d;
      }
    }
    return best;
  }

  private hitWallEndpoint(p: Point, wall: Wall): 1 | 2 | null {
    const r = 10 / this.zoom;
    if (Math.hypot(p.x - wall.x1, p.y - wall.y1) < r) return 1;
    if (Math.hypot(p.x - wall.x2, p.y - wall.y2) < r) return 2;
    return null;
  }

  private rotationHandlePos(f: FurnitureItem): Point {
    const rad = (f.rotation * Math.PI) / 180;
    const dist = Math.max(f.width, f.depth) / 2 + 20 / this.zoom;
    return {
      x: f.x + Math.sin(rad) * dist,
      y: f.y - Math.cos(rad) * dist,
    };
  }

  private hitRotationHandle(p: Point, f: FurnitureItem): boolean {
    const handle = this.rotationHandlePos(f);
    return Math.hypot(p.x - handle.x, p.y - handle.y) < 12 / this.zoom;
  }

  private setFurnitureRotation(f: FurnitureItem, world: Point, freeAngle: boolean): void {
    const dx = world.x - f.x;
    const dy = world.y - f.y;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (!freeAngle) deg = Math.round(deg / 15) * 15;
    f.rotation = ((deg % 360) + 360) % 360;
  }

  // ---------- Events ----------

  private onMouseDown(e: MouseEvent): void {
    const world = this.toWorld(e);
    if (e.button === 1 || e.button === 2 || (e.button === 0 && this.spaceDown)) {
      this.drag = {
        kind: 'pan',
        startClient: { x: e.clientX, y: e.clientY },
        startView: { x: this.viewX, y: this.viewY },
      };
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;

    if (this.store.tool === 'wall') {
      const start = this.snapWallPoint(world);
      this.drag = { kind: 'draw-wall', start, current: start };
      return;
    }

    // Auswahl-Werkzeug
    const selWall = this.store.getSelectedWall();
    if (selWall) {
      const end = this.hitWallEndpoint(world, selWall);
      if (end) {
        this.drag = { kind: 'wall-endpoint', id: selWall.id, end, doorIds: this.attachedDoorIds(selWall) };
        return;
      }
    }

    const selFurniture = this.store.getSelectedFurniture();
    if (selFurniture && this.hitRotationHandle(world, selFurniture)) {
      this.drag = { kind: 'furniture-rotate', id: selFurniture.id };
      return;
    }

    const f = this.hitFurniture(world);
    if (f) {
      this.store.select({ kind: 'furniture', id: f.id });
      this.drag = { kind: 'furniture', id: f.id, offset: { x: world.x - f.x, y: world.y - f.y } };
      return;
    }

    const w = this.hitWall(world);
    if (w) {
      this.store.select({ kind: 'wall', id: w.id });
      this.drag = {
        kind: 'wall-body',
        id: w.id,
        start: world,
        orig: { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 },
        doorIds: this.attachedDoorIds(w),
      };
      return;
    }

    this.store.select(null);
  }

  private onMouseMove(e: MouseEvent): void {
    const world = this.toWorld(e);
    this.mouseWorld = world;
    this.onCursorMove?.(world, this.zoom);

    switch (this.drag.kind) {
      case 'pan': {
        this.viewX = this.drag.startView.x - (e.clientX - this.drag.startClient.x) / this.zoom;
        this.viewY = this.drag.startView.y - (e.clientY - this.drag.startClient.y) / this.zoom;
        this.render();
        break;
      }
      case 'draw-wall': {
        let p = this.snapWallPoint(world);
        // Achsen-Einrasten (Shift = frei zeichnen)
        if (!e.shiftKey) {
          const dx = Math.abs(p.x - this.drag.start.x);
          const dy = Math.abs(p.y - this.drag.start.y);
          if (dx > dy) p = { x: p.x, y: this.drag.start.y };
          else p = { x: this.drag.start.x, y: p.y };
        }
        this.drag.current = p;
        this.render();
        break;
      }
      case 'furniture': {
        const f = this.store.getFurniture(this.drag.id);
        if (f) {
          f.x = this.snap(world.x - this.drag.offset.x);
          f.y = this.snap(world.y - this.drag.offset.y);
          if (isDoor(f.type)) {
            snapDoorToNearestWall(f, this.store.apartment.walls, this.store.snap);
          }
          this.store.emit();
        }
        break;
      }
      case 'furniture-rotate': {
        const f = this.store.getFurniture(this.drag.id);
        if (f) {
          this.setFurnitureRotation(f, world, e.shiftKey);
          this.store.emit();
        }
        break;
      }
      case 'wall-endpoint': {
        const w = this.store.getWall(this.drag.id);
        if (w) {
          const p = this.snapWallPoint(world);
          if (this.drag.end === 1) {
            w.x1 = p.x;
            w.y1 = p.y;
          } else {
            w.x2 = p.x;
            w.y2 = p.y;
          }
          this.resnapDoors(this.drag.doorIds, w);
          this.store.emit();
        }
        break;
      }
      case 'wall-body': {
        const w = this.store.getWall(this.drag.id);
        if (w) {
          const dx = this.snap(world.x - this.drag.start.x);
          const dy = this.snap(world.y - this.drag.start.y);
          w.x1 = this.drag.orig.x1 + dx;
          w.y1 = this.drag.orig.y1 + dy;
          w.x2 = this.drag.orig.x2 + dx;
          w.y2 = this.drag.orig.y2 + dy;
          this.resnapDoors(this.drag.doorIds, w);
          this.store.emit();
        }
        break;
      }
      case 'none':
        break;
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (this.drag.kind === 'draw-wall') {
      const { start, current } = this.drag;
      const len = Math.hypot(current.x - start.x, current.y - start.y);
      if (len >= 5) {
        this.store.addWall({
          id: uid(),
          x1: start.x,
          y1: start.y,
          x2: current.x,
          y2: current.y,
          thickness: 11.5,
          height: this.store.apartment.ceilingHeight,
          color: '#e8e4da',
        });
      }
    }
    this.drag = { kind: 'none' };
    this.render();
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (e.ctrlKey || e.metaKey) {
      this.zoomAt(Math.exp(-e.deltaY * 0.01), mx, my);
    } else {
      this.viewX += e.deltaX / this.zoom;
      this.viewY += e.deltaY / this.zoom;
      this.render();
    }
  }

  private zoomAt(factor: number, px: number, py: number): void {
    const newZoom = Math.max(0.05, Math.min(10, this.zoom * factor));
    const wx = this.viewX + px / this.zoom;
    const wy = this.viewY + py / this.zoom;
    this.zoom = newZoom;
    this.viewX = wx - px / this.zoom;
    this.viewY = wy - py / this.zoom;
    this.onCursorMove?.(this.mouseWorld, this.zoom);
    this.render();
  }

  private onKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      this.spaceDown = true;
      e.preventDefault();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.store.removeSelected();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      this.store.duplicateSelected();
      return;
    }
    if (e.key === 'Escape') {
      if (this.drag.kind === 'draw-wall') this.drag = { kind: 'none' };
      this.store.select(null);
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      const f = this.store.getSelectedFurniture();
      if (f) {
        const step = e.shiftKey ? -15 : 15;
        f.rotation = ((f.rotation + step) % 360 + 360) % 360;
        if (isDoor(f.type)) {
          snapDoorToNearestWall(f, this.store.apartment.walls, this.store.snap);
        }
        this.store.emit();
      }
    }
  }

  // ---------- Rendering ----------

  render(): void {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#20242b';
    ctx.fillRect(0, 0, w, h);

    this.drawGrid(ctx, w, h);

    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.viewX, -this.viewY);

    // Möbel: Teppiche zuerst, Deckenlampen zuletzt
    const furniture = [...this.store.apartment.furniture].sort((a, b) => {
      const rank = (f: FurnitureItem) => (f.type === 'rug' ? 0 : f.mount === 'ceiling' ? 2 : 1);
      return rank(a) - rank(b);
    });
    for (const f of furniture) this.drawFurniture(ctx, f);

    for (const wall of this.store.apartment.walls) this.drawWall(ctx, wall);

    if (this.drag.kind === 'draw-wall') this.drawWallPreview(ctx, this.drag.start, this.drag.current);

    ctx.restore();

    this.drawScaleBar(ctx, w, h);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const drawLines = (stepCm: number, color: string) => {
      const stepPx = stepCm * this.zoom;
      if (stepPx < 7) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const startX = Math.floor(this.viewX / stepCm) * stepCm;
      for (let x = startX; (x - this.viewX) * this.zoom < w; x += stepCm) {
        const px = (x - this.viewX) * this.zoom;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
      }
      const startY = Math.floor(this.viewY / stepCm) * stepCm;
      for (let y = startY; (y - this.viewY) * this.zoom < h; y += stepCm) {
        const py = (y - this.viewY) * this.zoom;
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
      }
      ctx.stroke();
    };
    drawLines(10, 'rgba(255,255,255,0.04)');
    drawLines(100, 'rgba(255,255,255,0.10)');
  }

  private drawWall(ctx: CanvasRenderingContext2D, wall: Wall): void {
    const selected = this.store.selection?.kind === 'wall' && this.store.selection.id === wall.id;
    const openings = getWallOpenings(wall, this.store.apartment.furniture);
    const slices = splitWallAtOpenings(wall, openings);

    for (const slice of slices) {
      if (selected) {
        ctx.strokeStyle = 'rgba(80,160,255,0.5)';
        ctx.lineWidth = slice.thickness + 8 / this.zoom;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(slice.x1, slice.y1);
        ctx.lineTo(slice.x2, slice.y2);
        ctx.stroke();
      }

      ctx.strokeStyle = slice.color;
      ctx.lineWidth = slice.thickness;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(slice.x1, slice.y1);
      ctx.lineTo(slice.x2, slice.y2);
      ctx.stroke();
    }

    if (selected) {
      for (const p of [{ x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 }]) {
        ctx.fillStyle = '#50a0ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 / this.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.stroke();
      }
      this.drawLengthLabel(ctx, wall.x1, wall.y1, wall.x2, wall.y2);
    }
  }

  private drawWallPreview(ctx: CanvasRenderingContext2D, a: Point, b: Point): void {
    ctx.strokeStyle = 'rgba(80,160,255,0.8)';
    ctx.lineWidth = 11.5;
    ctx.lineCap = 'butt';
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    this.drawLengthLabel(ctx, a.x, a.y, b.x, b.y);
  }

  private drawLengthLabel(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const text = formatCm(len);
    const fontPx = 13 / this.zoom;
    ctx.font = `${fontPx}px system-ui, sans-serif`;
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(midX - tw / 2 - 4 / this.zoom, midY - fontPx, tw + 8 / this.zoom, fontPx * 1.6);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, midX, midY - fontPx * 0.2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  private drawFurniture(ctx: CanvasRenderingContext2D, f: FurnitureItem): void {
    if (isDoor(f.type)) {
      this.drawDoor(ctx, f);
      return;
    }
    if (isCornerSofa(f.type)) {
      this.drawCornerSofa(ctx, f);
      return;
    }
    if (f.type === 'piano') {
      this.drawPiano(ctx, f);
      return;
    }

    const selected = this.store.selection?.kind === 'furniture' && this.store.selection.id === f.id;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate((f.rotation * Math.PI) / 180);

    const hw = f.width / 2;
    const hd = f.depth / 2;

    if (f.mount === 'ceiling') {
      // Deckenlampen: gestrichelter Kreis
      ctx.strokeStyle = selected ? '#50a0ff' : 'rgba(255,220,120,0.9)';
      ctx.fillStyle = 'rgba(255,220,120,0.25)';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.setLineDash([4 / this.zoom, 3 / this.zoom]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(hw, hd), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = withAlpha(f.color, 0.85);
      ctx.fillRect(-hw, -hd, f.width, f.depth);
      ctx.strokeStyle = selected ? '#50a0ff' : 'rgba(0,0,0,0.55)';
      ctx.lineWidth = (selected ? 2.5 : 1.2) / this.zoom;
      ctx.strokeRect(-hw, -hd, f.width, f.depth);
      // Markierung der Vorderseite (lokal -Y)
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.2 / this.zoom;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.4, -hd);
      ctx.lineTo(0, -hd - Math.min(8, hd * 0.35));
      ctx.lineTo(hw * 0.4, -hd);
      ctx.stroke();
    }

    ctx.restore();

    // Beschriftung (ungedreht, immer lesbar)
    const fontPx = 11 / this.zoom;
    if (Math.max(f.width, f.depth) * this.zoom > 46) {
      ctx.font = `${fontPx}px system-ui, sans-serif`;
      ctx.fillStyle = f.mount === 'ceiling' ? '#ffdc78' : 'rgba(0,0,0,0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.name, f.x, f.y, Math.max(f.width, f.depth) * 0.95);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    if (selected) {
      const handle = this.rotationHandlePos(f);
      ctx.strokeStyle = '#50a0ff';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(handle.x, handle.y);
      ctx.stroke();

      ctx.fillStyle = '#50a0ff';
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, 7 / this.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.stroke();

      const fontPx = 12 / this.zoom;
      ctx.font = `${fontPx}px system-ui, sans-serif`;
      ctx.fillStyle = '#50a0ff';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${formatCm(f.width)} × ${formatCm(f.depth)} · ${Math.round(f.rotation)}°`,
        f.x,
        f.y + Math.max(f.width, f.depth) / 2 + 16 / this.zoom
      );
      ctx.textAlign = 'start';
    }
  }

  private drawCornerSofa(ctx: CanvasRenderingContext2D, f: FurnitureItem): void {
    const selected = this.store.selection?.kind === 'furniture' && this.store.selection.id === f.id;
    const layout = cornerSofaLayout(f.width, f.depth, cornerSofaSide(f.type));

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate((f.rotation * Math.PI) / 180);

    ctx.beginPath();
    for (let i = 0; i < layout.outline.length; i++) {
      const p = layout.outline[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = withAlpha(f.color, 0.88);
    ctx.fill();
    ctx.strokeStyle = selected ? '#50a0ff' : 'rgba(0,0,0,0.55)';
    ctx.lineWidth = (selected ? 2.5 : 1.4) / this.zoom;
    ctx.stroke();

    // Rückenlehnen an Außenkanten
    ctx.strokeStyle = 'rgba(0,0,0,0.32)';
    ctx.lineWidth = Math.max(3, layout.seatDepth * 0.1) / this.zoom;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < layout.backOutline.length; i++) {
      const p = layout.backOutline[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.lineWidth = 1 / this.zoom;

    // Sitzflächen-Trennung Hauptteil / Chaiselongue
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath();
    const splitX =
      layout.side === 'right' ? layout.main.cx + layout.main.w / 2 : layout.main.cx - layout.main.w / 2;
    ctx.moveTo(splitX, -f.depth / 2 + layout.seatDepth);
    ctx.lineTo(splitX, f.depth / 2);
    ctx.stroke();

    // Vorderseite (oben = -Y)
    const frontY = -f.depth / 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.2 / this.zoom;
    ctx.beginPath();
    ctx.moveTo(-f.width * 0.12, frontY);
    ctx.lineTo(0, frontY - Math.min(10, layout.seatDepth * 0.35));
    ctx.lineTo(f.width * 0.12, frontY);
    ctx.stroke();

    ctx.restore();

    const fontPx = 11 / this.zoom;
    if (Math.max(f.width, f.depth) * this.zoom > 46) {
      ctx.font = `${fontPx}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.name, f.x, f.y, Math.max(f.width, f.depth) * 0.9);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    if (selected) {
      const handle = this.rotationHandlePos(f);
      ctx.strokeStyle = '#50a0ff';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(handle.x, handle.y);
      ctx.stroke();
      ctx.fillStyle = '#50a0ff';
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, 7 / this.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.stroke();

      const labelPx = 12 / this.zoom;
      ctx.font = `${labelPx}px system-ui, sans-serif`;
      ctx.fillStyle = '#50a0ff';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${formatCm(f.width)} × ${formatCm(f.depth)} · ${Math.round(f.rotation)}°`,
        f.x,
        f.y + f.depth / 2 + 16 / this.zoom
      );
      ctx.textAlign = 'start';
    }
  }

  private drawPiano(ctx: CanvasRenderingContext2D, f: FurnitureItem): void {
    const selected = this.store.selection?.kind === 'furniture' && this.store.selection.id === f.id;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate((f.rotation * Math.PI) / 180);

    const hw = f.width / 2;
    const hd = f.depth / 2;

    // Gehäuse
    ctx.fillStyle = withAlpha(f.color, 0.94);
    ctx.fillRect(-hw, -hd, f.width, f.depth);
    ctx.strokeStyle = selected ? '#50a0ff' : 'rgba(0,0,0,0.6)';
    ctx.lineWidth = (selected ? 2.5 : 1.2) / this.zoom;
    ctx.strokeRect(-hw, -hd, f.width, f.depth);

    // Seitenwangen
    const cheekW = f.width * 0.09;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-hw, -hd + f.depth * 0.08, cheekW, f.depth * 0.55);
    ctx.fillRect(hw - cheekW, -hd + f.depth * 0.08, cheekW, f.depth * 0.55);

    // Klaviatur an der Vorderseite (-Y)
    const kbD = f.depth * 0.4;
    ctx.fillStyle = 'rgba(242,236,224,0.96)';
    ctx.fillRect(-hw * 0.88, -hd, f.width * 0.88, kbD);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1 / this.zoom;
    ctx.strokeRect(-hw * 0.88, -hd, f.width * 0.88, kbD);

    // Einzeltasten angedeutet
    const keyCount = 16;
    const keyW = (f.width * 0.88) / keyCount;
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    for (let i = 1; i < keyCount; i++) {
      ctx.beginPath();
      ctx.moveTo(-hw * 0.88 + i * keyW, -hd);
      ctx.lineTo(-hw * 0.88 + i * keyW, -hd + kbD);
      ctx.stroke();
    }

    // Schwarze Tasten
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    for (let i = 0; i < keyCount; i++) {
      if (i % 3 === 1) {
        ctx.fillRect(-hw * 0.88 + i * keyW + keyW * 0.12, -hd, keyW * 0.58, kbD * 0.52);
      }
    }

    // Notenpult / Oberteil
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-hw * 0.35, hd - f.depth * 0.22, f.width * 0.7, f.depth * 0.18);

    // Pedale
    ctx.fillStyle = 'rgba(184,148,42,0.85)';
    for (const px of [-0.09, 0, 0.09]) {
      ctx.beginPath();
      ctx.ellipse(px * f.width, -hd + f.depth * 0.1, f.width * 0.035, f.depth * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vorderseiten-Markierung
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(-hw * 0.2, -hd);
    ctx.lineTo(0, -hd - Math.min(8, hd * 0.3));
    ctx.lineTo(hw * 0.2, -hd);
    ctx.stroke();

    ctx.restore();

    const fontPx = 11 / this.zoom;
    if (f.width * this.zoom > 50) {
      ctx.font = `${fontPx}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.name, f.x, f.y, f.width * 0.85);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    if (selected) {
      const handle = this.rotationHandlePos(f);
      ctx.strokeStyle = '#50a0ff';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(handle.x, handle.y);
      ctx.stroke();
      ctx.fillStyle = '#50a0ff';
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, 7 / this.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDoor(ctx: CanvasRenderingContext2D, f: FurnitureItem): void {
    const selected = this.store.selection?.kind === 'furniture' && this.store.selection.id === f.id;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate((f.rotation * Math.PI) / 180);

    const hw = f.width / 2;
    const gap = 3 / this.zoom;

    // Öffnung (transparent) – nur Rahmen und Türblatt
    ctx.strokeStyle = selected ? '#50a0ff' : 'rgba(0,0,0,0.55)';
    ctx.lineWidth = (selected ? 2.2 : 1.2) / this.zoom;
    ctx.strokeRect(-hw, -gap, f.width, gap * 2);

    // Türblatt in der Wandebene
    ctx.fillStyle = withAlpha('#e8dcc8', 0.95);
    ctx.fillRect(-hw + gap, -gap * 0.6, f.width - gap * 2, gap * 1.2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1 / this.zoom;
    ctx.strokeRect(-hw + gap, -gap * 0.6, f.width - gap * 2, gap * 1.2);

    // Griff
    ctx.fillStyle = '#b8bec4';
    ctx.fillRect(hw * 0.55, -gap * 0.25, 4 / this.zoom, gap * 0.5);

    // Öffnungsbogen
    const hingeX = -hw;
    ctx.strokeStyle = selected ? '#50a0ff' : 'rgba(120,180,255,0.75)';
    ctx.lineWidth = 1.2 / this.zoom;
    ctx.setLineDash([4 / this.zoom, 3 / this.zoom]);
    ctx.beginPath();
    ctx.arc(hingeX, gap, f.width * 0.85, -Math.PI / 2, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    const fontPx = 11 / this.zoom;
    if (f.width * this.zoom > 40) {
      ctx.font = `${fontPx}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.name, f.x, f.y, f.width * 0.95);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    if (selected) {
      const fontPx = 12 / this.zoom;
      ctx.font = `${fontPx}px system-ui, sans-serif`;
      ctx.fillStyle = '#50a0ff';
      ctx.textAlign = 'center';
      ctx.fillText(`${formatCm(f.width)} · ${Math.round(f.rotation)}°`, f.x, f.y + 14 / this.zoom);
      ctx.textAlign = 'start';
    }
  }

  private drawScaleBar(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const barCm = 100; // 1 m
    const barPx = barCm * this.zoom;
    const x = 16;
    const y = h - 22;
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + barPx, y);
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.moveTo(x + barPx, y - 5);
    ctx.lineTo(x + barPx, y + 5);
    ctx.stroke();
    ctx.fillStyle = '#ccc';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('1 m', x + barPx + 8, y + 4);
  }
}

// ---------- Hilfsfunktionen ----------

function distToSegment(p: Point, w: { x1: number; y1: number; x2: number; y2: number }): number {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - w.x1, p.y - w.y1);
  let t = ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (w.x1 + t * dx), p.y - (w.y1 + t * dy));
}

export function formatCm(cm: number): string {
  if (cm >= 100) {
    const m = cm / 100;
    return `${m.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m`;
  }
  return `${Math.round(cm * 10) / 10} cm`;
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
