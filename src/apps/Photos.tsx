import { motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell } from "../os/ui";

export function PartyPhoto() {
  const os = useOS();
  return (
    <div className="party-photo">
      <div className="party-scene" aria-hidden="true">
        <i className="party-light l1" />
        <i className="party-light l2" />
        <i className="party-face f1" />
        <i className="party-face f2" />
        <i className="party-face f3" />
      </div>
      <motion.button
        className="party-warning"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={(event) => os.tip("deepfake", event.currentTarget)}
      >
        <strong>⚠ someone ran this through an app.</strong>
        <small>we won’t show the edited version. tap to see why.</small>
      </motion.button>
    </div>
  );
}

const tiles = ["dusk", "bus", "dog", "party", "notes", "sky", "mirror", "food", "snow"];

export function Photos() {
  return (
    <AppShell app="photos" title="photos">
      <p className="photos-caption">friday · 22:14 · 9 photos</p>
      <div className="photo-grid">
        {tiles.map((tile) =>
          tile === "party" ? (
            <div key={tile} className="photo-tile is-flagged">
              <PartyPhoto />
            </div>
          ) : (
            <div key={tile} className={`photo-tile tile-${tile}`} aria-label={`photo: ${tile}`} role="img" />
          ),
        )}
      </div>
    </AppShell>
  );
}
