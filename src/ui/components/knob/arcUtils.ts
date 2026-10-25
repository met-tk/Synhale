/**
 * Shared SVG arc helpers used by knob-style components (Knob, ModulationCard).
 * Extracted here to avoid duplication between the two modules; both previously
 * carried byte-identical copies of these two functions.
 */

export interface Point {
  x: number;
  y: number;
}

export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

export function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  if (Math.abs(endAngle - startAngle) < 0.5) {
    return '';
  }
  const actualStart = Math.min(startAngle, endAngle);
  const actualEnd = Math.max(startAngle, endAngle);
  const start = polarToCartesian(cx, cy, r, actualEnd);
  const end = polarToCartesian(cx, cy, r, actualStart);
  const largeArcFlag = actualEnd - actualStart <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
