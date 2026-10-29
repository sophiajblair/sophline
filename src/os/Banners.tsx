import { AnimatePresence, motion } from "motion/react";
import { appMeta } from "../pixel/icons";
import type { AppId } from "../content/timeline";
import type { Note } from "./context";

type Props = {
  banners: Note[];
  onOpen: (app: AppId, target: string | undefined, el: HTMLElement) => void;
  onDismiss: (id: string) => void;
};

export function Banners({ banners, onOpen, onDismiss }: Props) {
  return (
    <ol className="banners" aria-label="new notifications">
      <AnimatePresence initial={false}>
        {banners.slice(-3).map((note, index, list) => {
          const meta = appMeta[note.app];
          const depth = list.length - 1 - index;
          return (
            <motion.li
              key={note.id}
              layout
              initial={{ y: -90, opacity: 0 }}
              animate={{ y: depth * 8, opacity: 1 - depth * 0.25, scale: 1 - depth * 0.05, x: depth ? 0 : [0, -5, 5, -3, 3, 0] }}
              exit={{ y: -90, opacity: 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 30, x: { duration: 0.4, delay: 0.25 } }}
              style={{ zIndex: 10 - depth }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={(_, info) => info.offset.y < -30 && onDismiss(note.id)}
            >
              <button className="note is-banner" onClick={(event) => onOpen(note.app, note.target, event.currentTarget)}>
                <span className="note-app" style={{ color: meta.glyph }}>
                  ■ {meta.label} · <strong>{note.title}</strong>
                </span>
                <span>{note.body}</span>
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
