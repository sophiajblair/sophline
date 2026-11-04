import { useState } from "react";
import { motion } from "motion/react";
import { useOS } from "../os/context";
import { cetDate, useCetClock } from "../os/cet";
import { AppShell } from "../os/ui";

const steps = [
  "a notification buzzes. tap it to open that app.",
  "look for the odd thing inside the app, and tap it.",
  "read the explanation that pops up. tap × to close it.",
  "tap ‹ home, then open the glowing app.",
  "keep going until the phone runs out of things to show you.",
];

export function Notes() {
  const os = useOS();
  const time = useCetClock();
  const [ticked, setTicked] = useState<string[]>([]);
  const started = os.flags.has("notesRead");
  return (
    <AppShell app="notes" title="notes">
      <div className="notes-page">
        <p className="notes-date">{cetDate()} · {time}</p>
        <h2>this isn’t your phone. explore it.</h2>
        <p className="notes-who">
          you’ve got a few minutes with someone else’s phone. tap around and see what it quietly knows about them. everything here is made up, and nothing leaves your browser.
        </p>
        <h3 className="notes-how">how it works</h3>
        <ol className="notes-list" aria-label="how it works">
          {steps.map((step, index) => {
            const on = ticked.includes(step);
            return (
              <li key={step}>
                <button
                  aria-pressed={on}
                  className={on ? "is-on" : ""}
                  onClick={() => setTicked((prev) => (on ? prev.filter((s) => s !== step) : [...prev, step]))}
                >
                  <i aria-hidden="true">{on ? "✓" : index + 1}</i>
                  <span>{step}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <motion.button
          className="notes-start"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            os.setFlag("notesRead");
            os.home();
          }}
        >
          {started ? "back to the phone →" : "got it. let’s explore →"}
        </motion.button>
      </div>
    </AppShell>
  );
}
