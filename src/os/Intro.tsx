import { motion } from "motion/react";

export function Intro({ streamer, onStart }: { streamer: boolean; onStart: () => void }) {
  return (
    <motion.div className="intro" exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <h2 className="intro-title">{streamer ? "this phone isn’t yours." : "you’re sam."}</h2>
      <p className="intro-who">just for a few minutes. pick it up, then open notes first. your to-do list is in there.</p>
      <button className="intro-start" onClick={onStart} autoFocus>
        <span aria-hidden="true">▲</span> pick it up
      </button>
      <p className="intro-local">nothing leaves this browser. no analytics. no cookies.</p>
    </motion.div>
  );
}
