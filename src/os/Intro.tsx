import { motion } from "motion/react";

const steps = [
  "wait for a buzz. tap it.",
  "tap the thing that looks off.",
  "read the note. close it. tap ‹ home.",
  "open the glowing app next.",
];

export function Intro({ streamer, onStart }: { streamer: boolean; onStart: () => void }) {
  return (
    <motion.div className="intro" exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="notes-app">
        <p className="notes-bar">
          <span>■ notes</span>
          <span>to do</span>
        </p>
        <h2 className="intro-title">{streamer ? "this phone isn’t yours." : "you’re sam."}</h2>
        <p className="intro-who">just for a few minutes. one thing at a time. follow the list.</p>
        <ol className="intro-steps" aria-label="to do">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <button className="intro-start" onClick={onStart} autoFocus>
        <span aria-hidden="true">▲</span> pick it up
      </button>
      <p className="intro-local">nothing leaves this browser. no analytics. no cookies.</p>
    </motion.div>
  );
}
