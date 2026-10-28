import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell } from "../os/ui";

const tiles = [
  { id: "school", icon: "A+", title: "two-hour school", copy: "math sprint complete · +240 xp", note: "ai academics. no independent classroom access." },
  { id: "toy", icon: "ʕ•ᴥ•ʔ", title: "talking toy", copy: "ask me literally anything!", note: "a 2025 safety test led to sales being suspended." },
  { id: "friend", icon: "☺", title: "chat friend", copy: "i’m always here. tell me more?", note: "72% of US teens surveyed had tried AI companions." },
];

export function Junior() {
  const os = useOS();
  const [open, setOpen] = useState<string | null>(null);
  const kid = os.name("jules", "child");
  return (
    <AppShell app="junior" title="junior mode">
      <div className="junior">
        <p className="junior-streak">
          {kid}’s streak: <strong>48 days</strong>
        </p>
        {tiles.map((tile, index) => (
          <motion.button
            key={tile.id}
            className={`junior-tile${open === tile.id ? " is-open" : ""}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * index, type: "spring", stiffness: 380, damping: 28 }}
            onClick={(event) => {
              setOpen(tile.id);
              os.tip("alpha", event.currentTarget);
            }}
          >
            <span className="junior-icon" aria-hidden="true">
              {tile.icon}
            </span>
            <span>
              <strong>{tile.title}</strong>
              <small>{tile.copy}</small>
              <AnimatePresence>
                {open === tile.id && (
                  <motion.em initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    {tile.note}
                  </motion.em>
                )}
              </AnimatePresence>
            </span>
          </motion.button>
        ))}
        <p className="tiny-note">who checks the checker? tap a tile.</p>
      </div>
    </AppShell>
  );
}
