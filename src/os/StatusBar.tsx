import { Pixels } from "../pixel/Pixels";

const signal = ["......#", "....#.#", "..#.#.#", "#.#.#.#"];
const battery = ["#########.", "#ooooo..##", "#ooooo..##", "#########."];

export function StatusBar({ time, dark }: { time: string; dark?: boolean }) {
  const ink = dark ? "#0b0f15" : "#d8d3c2";
  return (
    <div className={`statusbar${dark ? " is-dark" : ""}`}>
      <span className="status-time">{time}</span>
      <span className="status-icons" aria-hidden="true">
        <Pixels map={signal} colors={{ "#": ink }} px={2} />
        <Pixels map={battery} colors={{ "#": ink, o: "#c4dc5a" }} px={2} />
      </span>
    </div>
  );
}
