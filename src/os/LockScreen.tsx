import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pixels } from "../pixel/Pixels";
import { appMeta, eye, eyeClosed } from "../pixel/icons";
import type { AppId } from "../content/timeline";
import type { Note } from "./context";

function useBlink() {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = (open: boolean) => {
      setClosed(!open);
      timer = setTimeout(() => loop(!open), open ? 2600 + Math.random() * 2800 : 140);
    };
    timer = setTimeout(() => loop(false), 2000);
    return () => clearTimeout(timer);
  }, []);
  return closed;
}

export function WatchingEye({ px, alert }: { px: number; alert?: boolean }) {
  const closed = useBlink();
  return <Pixels map={closed ? eyeClosed : eye} colors={{ "#": alert ? "#ff3d3d" : "#2a3646", o: alert ? "#ff3d3d" : "#c4dc5a" }} px={px} />;
}

type Props = {
  time: string;
  notes: Note[];
  onOpen: (app: AppId, target: string | undefined, el: HTMLElement) => void;
  onUnlock: () => void;
};

export function LockScreen({ time, notes, onOpen, onUnlock }: Props) {
  const unread = notes.filter((note) => !note.read).slice(-4).reverse();
  return (
    <motion.div
      className="lock"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -60 }}
      transition={{ duration: 0.35 }}
    >
      <div className="lock-eye" aria-hidden="true">
        <WatchingEye px={10} alert={unread.length > 0} />
      </div>
      <p className="lock-date">wednesday, 28 october</p>
      <p className="lock-time">{time}</p>
      <ol className="lock-stack" aria-label="notifications">
        <AnimatePresence initial={false}>
          {unread.map((note) => {
            const meta = appMeta[note.app];
            return (
              <motion.li
                key={note.id}
                layout
                initial={{ opacity: 0, y: -24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80 }}
                transition={{ type: "spring", stiffness: 520, damping: 32 }}
              >
                <button className="note" onClick={(event) => onOpen(note.app, note.target, event.currentTarget)}>
                  <span className="note-app" style={{ color: meta.glyph }}>
                    ■ {meta.label}
                  </span>
                  <strong>{note.title}</strong>
                  <span>{note.body}</span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      <p className="content-note">
        content note: this phone later shows scams, a distressed synthetic voice, an AI companion and a deepfake warning. everything can be declined or skipped.
      </p>
      <button className="unlock" onClick={onUnlock}>
        <span aria-hidden="true">▲</span> tap to unlock
      </button>
      <p className="local-note">nothing leaves this browser. no analytics. no cookies.</p>
    </motion.div>
  );
}
