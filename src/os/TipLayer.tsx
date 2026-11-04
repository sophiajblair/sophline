import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { annotations, type TipId } from "../content/annotations";
import { Receipts } from "./ui";

export type Tip = { id: TipId; el: HTMLElement | null; n: number };

type Side = "right" | "left" | "top" | "bottom" | "overlay";
type Box = { x: number; y: number; w: number; h: number };
type Layout = { side: Side; card: { left: number; top: number; width: number }; anchor: Box | null; line: string | null };

const GAP = 28;
const SIDE_MIN = 250;
const STACK_MIN = 170;

function place(anchorEl: HTMLElement | null, phone: DOMRect, cardH: number): Layout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const raw = anchorEl && anchorEl.isConnected ? anchorEl.getBoundingClientRect() : null;
  const visible = raw && raw.width > 0 && raw.bottom > phone.top && raw.top < phone.bottom && raw.right > phone.left && raw.left < phone.right;
  const anchor = visible
    ? {
        x: Math.max(raw.left, phone.left),
        y: Math.max(raw.top, phone.top),
        w: Math.min(raw.right, phone.right) - Math.max(raw.left, phone.left),
        h: Math.min(raw.bottom, phone.bottom) - Math.max(raw.top, phone.top),
      }
    : null;
  const ax = anchor ? anchor.x + anchor.w / 2 : phone.left + phone.width / 2;
  const ay = anchor ? anchor.y + anchor.h / 2 : phone.top + phone.height / 2;
  const right = vw - phone.right - GAP * 2;
  const left = phone.left - GAP * 2;
  const above = phone.top - GAP;
  const below = vh - phone.bottom - GAP;

  let side: Side = "overlay";
  if (vw >= 640) {
    const preferRight = ax >= phone.left + phone.width / 2;
    if (preferRight && right >= SIDE_MIN) side = "right";
    else if (left >= SIDE_MIN) side = "left";
    else if (right >= SIDE_MIN) side = "right";
    else if (below >= STACK_MIN && below >= cardH) side = "bottom";
    else if (above >= STACK_MIN && above >= cardH) side = "top";
  }

  const clampY = (top: number) => Math.round(Math.max(16, Math.min(vh - cardH - 16, top)));
  const clampX = (l: number, w: number) => Math.round(Math.max(16, Math.min(vw - w - 16, l)));
  let card: Layout["card"];
  let line: string | null = null;

  if (side === "right" || side === "left") {
    const space = side === "right" ? right : left;
    const width = Math.round(Math.min(360, space - 8));
    const cardLeft = side === "right" ? Math.round(phone.right + GAP * 2) : Math.round(phone.left - GAP * 2 - width);
    const top = clampY(ay - cardH / 2);
    card = { left: cardLeft, top, width };
    if (anchor) {
      const y1 = Math.round(Math.max(top + 18, Math.min(top + cardH - 18, ay)));
      const x1 = side === "right" ? cardLeft : cardLeft + width;
      const x2 = Math.round(side === "right" ? anchor.x + anchor.w + 6 : anchor.x - 6);
      const mx = Math.round(side === "right" ? phone.right + GAP : phone.left - GAP);
      line = `M ${x1} ${y1} H ${mx} V ${Math.round(ay)} H ${x2}`;
    }
  } else if (side === "top" || side === "bottom") {
    const width = Math.round(Math.min(520, vw - 32));
    const cardLeft = clampX(ax - width / 2, width);
    const top = side === "bottom" ? Math.round(phone.bottom + GAP) : Math.round(phone.top - GAP - cardH);
    card = { left: cardLeft, top, width };
    if (anchor) {
      const x1 = Math.round(Math.max(cardLeft + 18, Math.min(cardLeft + width - 18, ax)));
      const y1 = side === "bottom" ? top : top + cardH;
      const y2 = Math.round(side === "bottom" ? anchor.y + anchor.h + 6 : anchor.y - 6);
      line = `M ${x1} ${y1} V ${Math.round((y1 + y2) / 2)} H ${Math.round(ax)} V ${y2}`;
    }
  } else {
    const width = Math.round(Math.min(420, vw - 24));
    const anchorLow = ay > vh * 0.55;
    card = { left: clampX((vw - width) / 2, width), top: anchorLow ? 12 : Math.round(vh - cardH - 12), width };
  }
  return { side, card, anchor, line };
}

type Props = { tip: Tip | null; phoneRef: React.RefObject<HTMLElement | null>; onClose: () => void };

export function TipLayer({ tip, phoneRef, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    if (!tip) return;
    let frame = 0;
    let last = "";
    const tick = () => {
      const phone = phoneRef.current;
      if (phone) {
        const cardH = cardRef.current?.offsetHeight || 240;
        const next = place(tip.el, phone.getBoundingClientRect(), cardH);
        const key = JSON.stringify(next);
        if (key !== last) {
          last = key;
          setLayout(next);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tip, phoneRef]);

  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(() => cardRef.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(timer);
  }, [tip]);

  const annotation = tip ? annotations[tip.id] : null;
  const from = layout?.side === "right" ? { x: -24 } : layout?.side === "left" ? { x: 24 } : layout?.side === "top" ? { y: 20 } : { y: -20 };

  return (
    <div className="tip-layer">
      <AnimatePresence>
        {tip && layout && (
          <motion.svg key={`line-${tip.n}`} className="tip-lines" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true">
            {layout.line && (
              <motion.path
                d={layout.line}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
              />
            )}
            {layout.anchor && (
              <g className="tip-brackets">
                {(() => {
                  const { x, y, w, h } = layout.anchor;
                  const s = 8;
                  const l = Math.round(x - 4);
                  const t = Math.round(y - 4);
                  const r = Math.round(x + w + 4);
                  const b = Math.round(y + h + 4);
                  return (
                    <path
                      d={`M ${l} ${t + s} V ${t} H ${l + s} M ${r - s} ${t} H ${r} V ${t + s} M ${r} ${b - s} V ${b} H ${r - s} M ${l + s} ${b} H ${l} V ${b - s}`}
                    />
                  );
                })()}
              </g>
            )}
          </motion.svg>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {tip && annotation && (
          <motion.aside
            key={tip.n}
            ref={cardRef}
            tabIndex={-1}
            className={`tip-card is-${layout?.side ?? "right"}`}
            aria-live="polite"
            aria-label={annotation.title}
            style={{ left: layout?.card.left ?? -9999, top: layout?.card.top ?? 0, width: layout?.card.width ?? 320 }}
            initial={{ opacity: 0, ...from, scale: 0.96 }}
            animate={{ opacity: layout ? 1 : 0, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <button className="tip-close" onClick={onClose} aria-label="close explanation">
              ×
            </button>
            <p className="tip-eyebrow">
              <span className="tip-flag">real case</span> {annotation.eyebrow}
            </p>
            <h2>{annotation.title}</h2>
            <p>{annotation.body}</p>
            {(annotation.detail || annotation.accuracy) && (
              <details className="tip-more">
                <summary>{annotation.accuracy ? "what this means here + accuracy note" : "what this means here"}</summary>
                {annotation.detail && <p className="tip-detail">{annotation.detail}</p>}
                {annotation.accuracy && (
                  <p className="tip-accuracy">
                    <strong>accuracy note:</strong> {annotation.accuracy}
                  </p>
                )}
              </details>
            )}
            <Receipts ids={annotation.sourceIds} />
            <p className="tip-next">done? tap × to close, then ‹ home.</p>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
