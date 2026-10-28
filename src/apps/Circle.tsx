import { motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell } from "../os/ui";

const path = { left: ["22%", "22%", "48%", "48%", "70%"], top: ["24%", "46%", "46%", "64%", "64%"] };

export function Circle() {
  const os = useOS();
  const kid = os.name("jules", "child");
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
      <motion.button
        className="map-panel"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
        onClick={(event) => os.tip("location", event.currentTarget)}
      >
        <strong>{kid} · moving</strong>
        <span>battery 38% · updated just now</span>
        <small>shared with: you, partner, and ? others</small>
      </motion.button>
    </AppShell>
  );
}
