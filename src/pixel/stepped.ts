type Point = [number, number];

/** A rounded rectangle whose corners are drawn as pixel stairs. */
export function steppedRect(x: number, y: number, w: number, h: number, r: number, step: number): Point[] {
  const n = Math.max(1, Math.round(r / step));
  const insets: number[] = [];
  for (let i = 0; i < n; i++) {
    const dy = r - (i + 0.5) * step;
    insets.push(Math.round((r - Math.sqrt(Math.max(0, r * r - dy * dy))) / step) * step);
  }
  const pts: Point[] = [];
  for (let i = n - 1; i >= 0; i--) pts.push([x + insets[i], y + (i + 1) * step], [x + insets[i], y + i * step]);
  for (let i = 0; i < n; i++) pts.push([x + w - insets[i], y + i * step], [x + w - insets[i], y + (i + 1) * step]);
  for (let i = n - 1; i >= 0; i--) pts.push([x + w - insets[i], y + h - (i + 1) * step], [x + w - insets[i], y + h - i * step]);
  for (let i = 0; i < n; i++) pts.push([x + insets[i], y + h - i * step], [x + insets[i], y + h - (i + 1) * step]);
  return pts;
}

export const toSvgPoints = (pts: Point[]) => pts.map(([px, py]) => `${px},${py}`).join(" ");

export const toClipPath = (pts: Point[]) => `polygon(${pts.map(([px, py]) => `${px}px ${py}px`).join(",")})`;
