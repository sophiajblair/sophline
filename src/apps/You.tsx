import { motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell } from "../os/ui";

export function You() {
  const os = useOS();
  const interests = os.interests.length ? os.interests.join(" · ") : "nothing yet (we guessed cats anyway)";
  const night = os.flags.has("night") || os.beats.has("companion");
  const persuadable = os.flags.has("adSeen") ? "mint packaging" : "things that look urgent";
  const voice =
    os.callOutcome === "sent"
      ? "would send money to a familiar voice"
      : os.callOutcome === "safe" || os.callOutcome === "callback"
        ? "checks before trusting a voice"
        : os.callOutcome === "declined"
          ? "lets unknown calls ring out"
          : "hasn’t been tested. yet.";
  const rows = [
    { label: "guessed interests", value: interests },
    { label: "2am mood", value: night ? "awake, apparently" : "unknown (for now)" },
    { label: "most persuadable by", value: persuadable },
    { label: "voice-trust score", value: voice },
    { label: "things we noticed", value: `${os.beats.size} of 10` },
  ];
  return (
    <AppShell app="you" title="you · wrapped">
      <div className="wrapped">
        <p className="wrapped-kicker">your algorithmic personality*</p>
        <motion.h2 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
          the
          <br />
          curious
          <br />
          <em>oversharer</em>
        </motion.h2>
        <div className="profile-grid">
          {rows.map((row, index) => (
            <motion.div key={row.label} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + index * 0.12 }}>
              <small>{row.label}</small>
              <strong>{row.value}</strong>
            </motion.div>
          ))}
        </div>
        <p className="joke-label">*a joke, made locally from your taps. never uploaded.</p>
        <button className="pixel-button" onClick={(event) => os.tip("wrapped", event.currentTarget)}>
          what did you actually know? ↗
        </button>
        <p className="quiet-turn">
          being known isn’t the problem.
          <br />
          <strong>not knowing who knows is.</strong>
        </p>
        <div className="wrapped-links">
          <button className="pixel-button is-sick" onClick={(event) => os.open("settings", undefined, event.currentTarget)}>
            fight back →
          </button>
          <button className="pixel-button is-ghost" onClick={(event) => os.open("receipts", undefined, event.currentTarget)}>
            all receipts →
          </button>
        </div>
      </div>
    </AppShell>
  );
}
