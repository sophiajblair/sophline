import { forwardRef } from "react";
import { steppedRect, toClipPath, toSvgPoints } from "../pixel/stepped";

export const PHONE_W = 360;
export const PHONE_H = 748;
export const SCREEN = { x: 20, y: 28, w: 320, h: 692, r: 32 };

const outline = toSvgPoints(steppedRect(0, 0, PHONE_W, PHONE_H, 56, 4));
const shadow = toSvgPoints(steppedRect(10, 12, PHONE_W, PHONE_H, 56, 4));
const bodyShade = toSvgPoints(steppedRect(4, 4, PHONE_W - 8, PHONE_H - 8, 52, 4));
const body = toSvgPoints(steppedRect(4, 4, PHONE_W - 12, PHONE_H - 14, 52, 4));
const bezel = toSvgPoints(steppedRect(SCREEN.x - 6, SCREEN.y - 6, SCREEN.w + 12, SCREEN.h + 12, SCREEN.r + 6, 4));
const screenClip = toClipPath(steppedRect(0, 0, SCREEN.w, SCREEN.h, SCREEN.r, 4));

type Props = { children: React.ReactNode; alert: boolean };

/** Chunky pixel handset. The frame is static; only screen content animates. */
export const PixelPhone = forwardRef<HTMLDivElement, Props>(function PixelPhone({ children, alert }, screenRef) {
  return (
    <div className="pixel-phone">
      <svg className="phone-frame" viewBox={`0 0 ${PHONE_W} ${PHONE_H}`} shapeRendering="crispEdges" aria-hidden="true">
        <polygon points={shadow} fill="#000" opacity=".55" />
        <rect x="-6" y="148" width="10" height="60" fill="#07080b" />
        <rect x="-2" y="152" width="6" height="52" fill="#4b4e57" />
        <rect x="-6" y="224" width="10" height="40" fill="#07080b" />
        <rect x="-2" y="228" width="6" height="32" fill="#4b4e57" />
        <rect x={PHONE_W - 4} y="196" width="10" height="76" fill="#07080b" />
        <rect x={PHONE_W - 4} y="200" width="6" height="68" fill="#4b4e57" />
        <polygon points={outline} fill="#07080b" />
        <polygon points={bodyShade} fill="#4b4e57" />
        <polygon points={body} fill="#7d8088" />
        <rect x="8" y="64" width="4" height="560" fill="#a3a6ad" />
        <rect x="64" y="8" width="180" height="4" fill="#a3a6ad" />
        <rect x="20" y="40" width="4" height="12" fill="#a3a6ad" />
        <polygon points={bezel} fill="#030405" />
        <rect x="148" y="9" width="64" height="8" fill="#030405" />
        <rect x="152" y="11" width="56" height="2" fill="#1a1d24" />
        <rect x="224" y="9" width="8" height="8" fill="#030405" />
        <rect x="226" y="11" width="4" height="4" fill="#24365a" />
        <rect className={`phone-led${alert ? " is-on" : ""}`} x="240" y="11" width="4" height="4" fill="#ff3d3d" />
        <rect x="132" y={PHONE_H - 14} width="96" height="4" fill="#4b4e57" />
      </svg>
      <div
        ref={screenRef}
        className="phone-screen"
        style={{ left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, clipPath: screenClip }}
      >
        {children}
        <div className="screen-scanlines" aria-hidden="true" />
      </div>
    </div>
  );
});
