import { useEffect, useRef } from "react";

const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:.=*+-<>¦";
const SIZE = 16;
const FRAME_MS = 55;

/**
 * Falling-glyph backdrop behind the phone. Turns red while something needs
 * attention. With reduced motion it paints a single still frame.
 */
export function MatrixRain({ alert }: { alert: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const alertRef = useRef(alert);
  useEffect(() => {
    alertRef.current = alert;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let drops: number[] = [];
    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#030406";
      ctx.fillRect(0, 0, width, height);
      const cols = Math.ceil(width / SIZE);
      drops = Array.from({ length: cols }, () => -Math.random() * (height / SIZE));
    };
    const draw = () => {
      const hot = alertRef.current;
      ctx.fillStyle = "rgba(3, 4, 6, 0.14)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${SIZE}px ui-monospace, monospace`;
      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * SIZE;
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        ctx.fillStyle = hot ? "#ff5a5a" : "#7dffa0";
        ctx.fillText(glyph, i * SIZE, y);
        if (y > height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 1;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    let timer: ReturnType<typeof setInterval> | undefined;
    if (still) for (let i = 0; i < 90; i++) draw();
    else timer = setInterval(draw, FRAME_MS);
    return () => {
      window.removeEventListener("resize", resize);
      clearInterval(timer);
    };
  }, []);
  return <canvas ref={canvasRef} className={`matrix-rain${alert ? " is-alert" : ""}`} aria-hidden="true" />;
}
