import { useEffect, useState } from "react";

/** Reveals scripted messages one at a time, with a typing beat before each. */
export function useScript(total: number, run: boolean) {
  const [shown, setShown] = useState(run ? 0 : total);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!run || shown >= total) return;
    const startTyping = setTimeout(() => setTyping(true), 500);
    const deliver = setTimeout(() => {
      setTyping(false);
      setShown((count) => count + 1);
    }, 1700);
    return () => {
      clearTimeout(startTyping);
      clearTimeout(deliver);
    };
  }, [run, shown, total]);
  return { shown: Math.min(shown, total), typing: typing && shown < total };
}
