import { AnimatePresence, motion } from "motion/react";
import { Pixels } from "../pixel/Pixels";
import { appMeta, glyphs } from "../pixel/icons";
import type { AppId } from "../content/timeline";
import { WatchingEye } from "./LockScreen";

const order: AppId[] = ["notes", "loop", "chats", "porch", "mail", "phone", "circle", "photos", "mira", "you", "settings", "receipts"];

type Props = {
  badges: Partial<Record<AppId, number>>;
  watched: number;
  nudge: number;
  /** the app the story wants opened next; the rest are dimmed but still tappable */
  next?: AppId;
  hint: string;
  onOpen: (app: AppId, el: HTMLElement) => void;
};

export function HomeScreen({ badges, watched, nudge, next, hint, onOpen }: Props) {
  const unread = Object.values(badges).reduce((sum, n) => sum + (n ?? 0), 0);
  return (
    <motion.div className="home" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
      <div className="widget" aria-live="polite">
        <WatchingEye px={3} alert={unread > 0} />
        <div>
          <small>things that happened to you today</small>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.strong key={watched} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }}>
              {watched}
            </motion.strong>
          </AnimatePresence>
          <span>{unread ? `${unread} unread` : "it’s quiet. for now."}</span>
        </div>
      </div>
      <ul className="icon-grid">
        {order.map((app, index) => {
          const meta = appMeta[app];
          const count = badges[app] ?? 0;
          const state = !next ? "" : app === next ? " is-next" : " is-dim";
          return (
            <motion.li
              key={app}
              className={state.trim() || undefined}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.025, type: "spring", stiffness: 420, damping: 30 }}
            >
              <motion.button
                key={count ? `${app}-${nudge}` : app}
                className="app-icon"
                aria-label={`${meta.label}${count ? `, ${count} new` : ""}${app === next ? ", open this next" : ""}`}
                onClick={(event) => onOpen(app, event.currentTarget)}
                whileTap={{ scale: 0.88 }}
                animate={count && nudge ? { rotate: [0, -6, 6, -4, 4, 0] } : undefined}
                transition={{ duration: 0.5 }}
              >
                <span className="icon-tile" style={{ background: meta.tile }}>
                  <Pixels map={glyphs[app]} colors={{ "#": meta.glyph, o: meta.accent }} px={6} />
                </span>
                {app === next && (
                  <span className="next-tag" aria-hidden="true">
                    next
                  </span>
                )}
                <span className="icon-label">{meta.label}</span>
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      className="badge"
                      key={count}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 700, damping: 18 }}
                    >
                      {count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.li>
          );
        })}
      </ul>
      <p className={`home-hint${next ? " is-next" : ""}`}>{hint}</p>
    </motion.div>
  );
}
