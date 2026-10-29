import { useState } from "react";
import { motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell } from "../os/ui";

const steps = [
  "wait for a buzz. tap it.",
  "tap the thing that looks off.",
  "pick what you’d do. you can beat it or mess it up.",
  "read the note. close it. tap ‹ home.",
  "open the glowing app next.",
];

export function Notes() {
  const os = useOS();
  const [ticked, setTicked] = useState<string[]>([]);
  const started = os.flags.has("notesRead");
  return (
    <AppShell app="notes" title="notes">
      <div className="notes-page">
        <p className="notes-date">wednesday, 28 october · 09:41</p>
        <h2>{os.name(`you’re ${os.owner}.`, "this phone isn’t yours.")}</h2>
        <p className="notes-who">just for a few minutes. one thing at a time. follow the list.</p>
        <ul className="notes-list" aria-label="to do">
          {steps.map((step) => {
            const on = ticked.includes(step);
            return (
              <li key={step}>
                <button
                  aria-pressed={on}
                  className={on ? "is-on" : ""}
                  onClick={() => setTicked((prev) => (on ? prev.filter((s) => s !== step) : [...prev, step]))}
                >
                  <i aria-hidden="true">{on ? "✓" : ""}</i>
                  <span>{step}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <motion.button
          className="notes-start"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            os.setFlag("notesRead");
            os.home();
          }}
        >
          {started ? "back to the phone →" : "got it. start →"}
        </motion.button>
      </div>
    </AppShell>
  );
}
