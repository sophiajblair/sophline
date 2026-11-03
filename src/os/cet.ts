import { useEffect, useState } from "react";

/** Central European Time as a fixed UTC+1 offset (no daylight saving), as requested. */
const ZONE = "Etc/GMT-1";

const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const secondsFormat = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, weekday: "long", day: "numeric", month: "long" });

export const cetTime = (date = new Date()) => timeFormat.format(date);
export const cetTimeSeconds = (date = new Date()) => secondsFormat.format(date);
/** e.g. "monday, 3 november" */
export const cetDate = (date = new Date()) => dateFormat.format(date).replace(/,/g, "").replace(/^(\w+) /, "$1, ").toLowerCase();

/** A live CET clock that re-renders every second (or minute). */
export function useCetClock(withSeconds = false) {
  const read = () => (withSeconds ? cetTimeSeconds() : cetTime());
  const [text, setText] = useState(read);
  useEffect(() => {
    const timer = setInterval(() => setText(withSeconds ? cetTimeSeconds() : cetTime()), 1000);
    return () => clearInterval(timer);
  }, [withSeconds]);
  return text;
}
