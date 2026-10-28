import { AnimatePresence, motion } from "motion/react";
import { Pixels } from "../pixel/Pixels";
import { eye } from "../pixel/icons";

const signal = ["......#", "....#.#", "..#.#.#", "#.#.#.#"];
const battery = ["#########.", "#ooooo..##", "#ooooo..##", "#########."];

export function StatusBar({ time, watched, dark }: { time: string; watched: number; dark?: boolean }) {
  const ink = dark ? "#0b0f15" : "#d8d3c2";
  return (
    <div className={`statusbar${dark ? " is-dark" : ""}`}>
      <span className="status-time">{time}</span>
      <span className="status-watch" aria-label={`things that happened to you today: ${watched}`}>
        <Pixels map={eye} colors={{ "#": "#ff3d3d", o: "#ff3d3d" }} px={1} />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={watched}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
          >
            {watched}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="status-icons" aria-hidden="true">
        <Pixels map={signal} colors={{ "#": ink }} px={2} />
        <Pixels map={battery} colors={{ "#": ink, o: "#c4dc5a" }} px={2} />
      </span>
    </div>
  );
}
