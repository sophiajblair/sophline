import { motion } from "motion/react";

const steps = [
  "wait for a buzz. tap the notification.",
  "in the app, tap whatever looks off. read the note, then tap ×.",
  "tap ‹ home and open the app marked ‘next’. the green hint always says what to do.",
];

export function Intro({ streamer, onStart }: { streamer: boolean; onStart: () => void }) {
  return (
    <motion.div className="intro" exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <p className="intro-kicker">before you pick it up</p>
      <h2 className="intro-title">{streamer ? "this phone isn’t yours." : "you’re sam."}</h2>
      <p className="intro-who">
        {streamer
          ? "for a few minutes it is. a partner, a kid, a parent and far too many apps."
          : "this is sam’s phone for a few minutes: a partner, a kid called jules, a mum, a little brother and far too many apps."}
      </p>
      <ol className="intro-steps">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="intro-note">content note: later there are scams, a distressed synthetic voice, an AI companion and a deepfake warning. you can decline or skip anything.</p>
      <button className="intro-start" onClick={onStart} autoFocus>
        <span aria-hidden="true">▲</span> pick it up
      </button>
      <p className="intro-local">nothing leaves this browser. no analytics. no cookies.</p>
    </motion.div>
  );
}
