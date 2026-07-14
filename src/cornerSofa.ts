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
}

export function cornerSofaLayout(width: number, depth: number): CornerSofaLayout {
  const seatDepth = Math.min(100, Math.max(85, Math.round(width * 0.36)));
  const hw = width / 2;
  const hd = depth / 2;
  const chaiseLen = Math.max(depth - seatDepth, seatDepth * 0.9);
  return {
    seatDepth,
    main: { cx: 0, cy: -hd + seatDepth / 2, w: width, h: seatDepth },
    chaise: { cx: hw - seatDepth / 2, cy: hd - chaiseLen / 2, w: seatDepth, h: chaiseLen },
  };
}

function inRect(lx: number, ly: number, rect: SofaRect): boolean {
  return Math.abs(lx - rect.cx) <= rect.w / 2 && Math.abs(ly - rect.cy) <= rect.h / 2;
}

export function pointInCornerSofa(lx: number, ly: number, width: number, depth: number): boolean {
  const { main, chaise } = cornerSofaLayout(width, depth);
  return inRect(lx, ly, main) || inRect(lx, ly, chaise);
}
