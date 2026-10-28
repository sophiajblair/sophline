import { motion } from "motion/react";
import { guide } from "../content/annotations";
import { sources } from "../content/sources";
import { useOS } from "../os/context";
import { AppShell, Receipts } from "../os/ui";

export function Settings() {
  const os = useOS();
  return (
    <AppShell app="settings" title="settings">
      <div className="settings">
        <p className="settings-kicker">you still have options</p>
        <h2>fight back, gently</h2>
        <label className="setting-toggle">
          <span>
            <strong>streamer mode</strong>
            <small>hide names and personal-looking details</small>
          </span>
          <input type="checkbox" checked={os.streamer} onChange={(event) => os.setStreamer(event.target.checked)} />
          <i aria-hidden="true" />
        </label>
        <ul className="guide-list">
          {guide.map((row, index) => (
            <motion.li key={row.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <span className="check" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>{row.title}</strong>
                <p>{row.copy}</p>
                <Receipts ids={row.ids} compact />
              </div>
            </motion.li>
          ))}
        </ul>
        <p className="checked-date">UK-focused · settings and law last checked 28 oct 2026</p>
        <button className="pixel-button is-sick" onClick={(event) => os.open("receipts", undefined, event.currentTarget)}>
          all {sources.length} receipts →
        </button>
      </div>
    </AppShell>
  );
}
