import { useState } from "react";
import { motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell, VideoSlot } from "../os/ui";

export function Porch() {
  const os = useOS();
  const [choice, setChoice] = useState<string | null>(null);
  return (
    <AppShell app="porch" title="porch · front door">
      <VideoSlot id="doorbell-porch" className="porch-video">
        <div className="porch-scene">
          <i className="porch-door" />
          <i className="porch-lamp" />
          <i className="porch-person" />
        </div>
      </VideoSlot>
      <div className="porch-hud" aria-hidden="true">
        <span className="rec">● LIVE</span>
        <span>09:41:12 · cam 01</span>
      </div>
      <motion.div
        className="porch-detect"
        aria-hidden="true"
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        PERSON
      </motion.div>
      <div className="porch-panel">
        <strong>person at your front door</strong>
        <small>motion · 3 sec ago · clip saved to cloud</small>
        <div className="porch-actions">
          {["share to neighbours", "save", "ignore"].map((label) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.95 }}
              className={choice === label ? "is-on" : ""}
              onClick={(event) => {
                setChoice(label);
                os.tip("doorbell", event.currentTarget);
              }}
            >
              {label}
            </motion.button>
          ))}
        </div>
        <button className="porch-toggle" onClick={(event) => os.tip("doorbell", event.currentTarget)}>
          <span>search party (AI)</span>
          <b>ON</b>
        </button>
        {choice && <p className="tiny-note">you chose “{choice}”. the clip stayed in this browser.</p>}
      </div>
    </AppShell>
  );
}
