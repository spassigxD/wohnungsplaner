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
  outline: { x: number; y: number }[];
}

export function cornerSofaLayout(width: number, depth: number, side: 'left' | 'right' = 'right'): CornerSofaLayout {
  const seatDepth = Math.min(100, Math.max(85, Math.round(width * 0.36)));
  const hw = width / 2;
  const hd = depth / 2;
  const chaiseLen = depth - seatDepth;
  const chaiseCx = side === 'right' ? hw - seatDepth / 2 : -hw + seatDepth / 2;

  const outline =
    side === 'right'
      ? [
          { x: -hw, y: -hd },
          { x: hw, y: -hd },
          { x: hw, y: -hd + seatDepth },
          { x: hw - seatDepth, y: -hd + seatDepth },
          { x: hw - seatDepth, y: hd },
          { x: -hw, y: hd },
        ]
      : [
          { x: -hw, y: -hd },
          { x: hw, y: -hd },
          { x: hw, y: hd },
          { x: -hw + seatDepth, y: hd },
          { x: -hw + seatDepth, y: -hd + seatDepth },
          { x: -hw, y: -hd + seatDepth },
        ];

  return {
    seatDepth,
    side,
    main: { cx: 0, cy: -hd + seatDepth / 2, w: width, h: seatDepth },
    chaise: { cx: chaiseCx, cy: -hd + seatDepth + chaiseLen / 2, w: seatDepth, h: chaiseLen },
    outline,
  };
}

export function isCornerSofa(type: string): boolean {
  return type === 'sofa_corner' || type === 'sofa_corner_left';
}

export function cornerSofaSide(type: string): 'left' | 'right' {
  return type === 'sofa_corner_left' ? 'left' : 'right';
}

function pointInPolygon(x: number, y: number, poly: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInCornerSofa(
  lx: number,
  ly: number,
  width: number,
  depth: number,
  side: 'left' | 'right' = 'right'
): boolean {
  return pointInPolygon(lx, ly, cornerSofaLayout(width, depth, side).outline);
}
