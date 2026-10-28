import type { PixelMap } from "./icons";

type Props = {
  map: PixelMap;
  colors: Record<string, string>;
  px?: number;
  className?: string;
  title?: string;
};

export function Pixels({ map, colors, px = 3, className, title }: Props) {
  const w = map[0].length;
  const h = map.length;
  const rects: React.ReactNode[] = [];
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = colors[row[x]];
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
    }
  });
  return (
    <svg
      className={className}
      width={w * px}
      height={h * px}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {rects}
    </svg>
  );
}
