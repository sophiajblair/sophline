import { useRef, useState } from "react";
import { motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell } from "../os/ui";

const path = { left: ["22%", "22%", "48%", "48%", "70%"], top: ["24%", "46%", "46%", "64%", "64%"] };

type Viewer = { id: string; label: string; note: string; removable: boolean };

const viewers: Viewer[] = [
  { id: "you", label: "you", note: "this phone", removable: false },
  { id: "partner", label: "partner", note: "their phone", removable: false },
  { id: "old", label: "old phone", note: "sold last year · still signed in", removable: true },
  { id: "unknown", label: "unknown device", note: "joined 3 weeks ago · no name", removable: true },
  { id: "app", label: "the app itself", note: "sees every move · can’t be removed", removable: false },
];

export function Circle() {
  const os = useOS();
  const kid = os.name("kid", "child");
  const panelRef = useRef<HTMLDivElement>(null);
  const [checking, setChecking] = useState(false);
  const [removed, setRemoved] = useState<string[]>([]);
  const visible = viewers.filter((v) => !removed.includes(v.id));
  const left = visible.filter((v) => v.removable).length;
  const remove = (id: string) => {
    setRemoved((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (left === 1) os.tip("location", panelRef.current);
  };
  return (
    <AppShell app="circle" title="family circle">
      <div className="circle-map" aria-label={`map showing ${kid} moving from school towards home`}>
        <svg className="map-svg" viewBox="0 0 320 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="320" height="420" fill="#f3efe6" />
          <g fill="#ebe5d8">
            <rect x="8" y="110" width="50" height="34" rx="3" />
            <rect x="84" y="110" width="60" height="30" rx="3" />
            <rect x="166" y="108" width="46" height="34" rx="3" />
            <rect x="238" y="108" width="68" height="34" rx="3" />
            <rect x="8" y="160" width="50" height="24" rx="3" />
            <rect x="84" y="200" width="56" height="60" rx="3" />
            <rect x="238" y="156" width="68" height="40" rx="3" />
            <rect x="238" y="206" width="68" height="46" rx="3" />
            <rect x="166" y="276" width="46" height="40" rx="3" />
            <rect x="238" y="280" width="68" height="36" rx="3" />
            <rect x="84" y="276" width="56" height="44" rx="3" />
          </g>
          <g fill="#c8e6c4">
            <rect x="84" y="10" width="76" height="72" rx="8" />
            <rect x="166" y="204" width="46" height="52" rx="6" />
            <rect x="10" y="212" width="46" height="62" rx="6" />
          </g>
          <g fill="#a8d5e5">
            <ellipse cx="272" cy="52" rx="40" ry="26" />
            <path d="M-10 336 C 60 344, 96 392, 176 436 L 130 440 C 60 410, 20 392, -10 372 Z" />
          </g>
          <g fill="none" stroke="#dadce0" strokeWidth="8" strokeLinecap="round">
            <path d="M0 100 H224" />
            <path d="M224 0 V420" />
            <path d="M0 330 H320" />
            <path d="M290 0 V420" />
            <path d="M110 200 V420" />
          </g>
          <g fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round">
            <path d="M0 100 H224" />
            <path d="M224 0 V420" />
            <path d="M0 330 H320" />
            <path d="M290 0 V420" />
            <path d="M110 200 V420" />
          </g>
          <path d="M-10 150 Q160 118 330 150" fill="none" stroke="#e2893a" strokeWidth="14" strokeLinecap="round" />
          <path d="M-10 150 Q160 118 330 150" fill="none" stroke="#f9ab4c" strokeWidth="10" strokeLinecap="round" />
          <g fill="none" stroke="#e8c25c" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
            <path d="M70 0 V420" />
            <path d="M0 193 H320" />
            <path d="M154 193 V420" />
            <path d="M154 269 H320" />
          </g>
          <g fill="none" stroke="#fdf0b8" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
            <path d="M70 0 V420" />
            <path d="M0 193 H320" />
            <path d="M154 193 V420" />
            <path d="M154 269 H320" />
          </g>
          <polyline points="70,101 70,193 154,193 154,269 224,269" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="70,101 70,193 154,193 154,269 224,269" fill="none" stroke="#4285f4" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <g fontFamily="system-ui, sans-serif" fontSize="9" fill="#5f6368" fontWeight="600">
            <text x="6" y="188">high street</text>
            <text x="6" y="145" fill="#fff" fontSize="8">a-road</text>
            <text x="116" y="266">park lane</text>
            <text x="94" y="50" fill="#2e7d32">the green</text>
            <text x="244" y="55" fill="#2c7fa0">mill pond</text>
          </g>
        </svg>
        <div className="map-search" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="10" cy="10" r="6" />
            <path d="M15 15l6 6" />
          </svg>
          <span>search here</span>
        </div>
        <div className="map-zoom" aria-hidden="true">
          <span>+</span>
          <span>−</span>
        </div>
        <span className="map-pin is-school" aria-hidden="true">
          <i />
          <b>school</b>
        </span>
        <span className="map-pin is-home" aria-hidden="true">
          <i />
          <b>home</b>
        </span>
        <motion.button
          className="map-dot"
          aria-label={`${kid}, live location`}
          initial={{ left: path.left[0], top: path.top[0] }}
          animate={path}
          transition={{ duration: 14, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
          onClick={(event) => os.tip("location", event.currentTarget)}
        >
          {kid.slice(0, 1).toUpperCase()}
          <i aria-hidden="true" />
        </motion.button>
      </div>
      <motion.div
        ref={panelRef}
        className="map-panel"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
      >
        <strong>{kid} · moving</strong>
        <span>battery 38% · updated just now</span>
        {checking ? (
          <>
            <ul className="viewer-list" aria-label="who can see this location">
              {visible.map((v) => (
                <li key={v.id} className={v.removable ? "is-stranger" : undefined}>
                  <div>
                    <b>{v.label}</b>
                    <em>{v.note}</em>
                  </div>
                  {v.removable && (
                    <button onClick={() => remove(v.id)} aria-label={`remove ${v.label}`}>
                      remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="map-status" aria-live="polite">
              {left ? `${left} of these shouldn’t be here. remove them.` : "down to people you know. the app still sees every move."}
            </p>
            {left === 0 && (
              <button className="map-check" onClick={(event) => os.tip("location", event.currentTarget)}>
                why does that matter? ↗
              </button>
            )}
          </>
        ) : (
          <button className="map-check" onClick={() => setChecking(true)}>
            shared with: you, partner and ? others. who? →
          </button>
        )}
      </motion.div>
    </AppShell>
  );
}
