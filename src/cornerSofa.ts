export interface SofaRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface CornerSofaLayout {
  main: SofaRect;
  chaise: SofaRect;
  seatDepth: number;
  side: 'left' | 'right';
}

export function cornerSofaLayout(width: number, depth: number, side: 'left' | 'right' = 'right'): CornerSofaLayout {
  const seatDepth = Math.min(100, Math.max(85, Math.round(width * 0.36)));
  const hw = width / 2;
  const hd = depth / 2;
  const chaiseLen = Math.max(depth - seatDepth, seatDepth * 0.9);
  const chaiseCx = side === 'right' ? hw - seatDepth / 2 : -hw + seatDepth / 2;
  return {
    seatDepth,
    side,
    main: { cx: 0, cy: -hd + seatDepth / 2, w: width, h: seatDepth },
    chaise: { cx: chaiseCx, cy: hd - chaiseLen / 2, w: seatDepth, h: chaiseLen },
  };
}

export function isCornerSofa(type: string): boolean {
  return type === 'sofa_corner' || type === 'sofa_corner_left';
}

export function cornerSofaSide(type: string): 'left' | 'right' {
  return type === 'sofa_corner_left' ? 'left' : 'right';
}

function inRect(lx: number, ly: number, rect: SofaRect): boolean {
  return Math.abs(lx - rect.cx) <= rect.w / 2 && Math.abs(ly - rect.cy) <= rect.h / 2;
}

export function pointInCornerSofa(
  lx: number,
  ly: number,
  width: number,
  depth: number,
  side: 'left' | 'right' = 'right'
): boolean {
  const { main, chaise } = cornerSofaLayout(width, depth, side);
  return inRect(lx, ly, main) || inRect(lx, ly, chaise);
}
