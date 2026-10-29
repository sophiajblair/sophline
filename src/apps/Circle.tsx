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
        <div className="map-grid" aria-hidden="true" />
        <i className="road road-a" aria-hidden="true" />
        <i className="road road-b" aria-hidden="true" />
        <i className="road road-c" aria-hidden="true" />
        <span className="map-place is-school">school</span>
        <span className="map-place is-home">home</span>
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
