import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell, Typing, bubbleMotion } from "../os/ui";
import { useScript } from "../os/useScript";
import { PartyPhoto } from "./Photos";

type Thread = "other" | "family";

function ThankYou() {
  return (
    <motion.p className="bubble theirs" {...bubbleMotion}>
      ty ♥ the minty one
    </motion.p>
  );
}

function LateReply() {
  const script = useScript(1, true);
  return <AnimatePresence>{script.shown > 0 ? <ThankYou /> : script.typing && <Typing />}</AnimatePresence>;
}

function OtherHalf() {
  const os = useOS();
  const replied = os.flags.has("chatReplied");
  const [justReplied, setJustReplied] = useState(false);
  const opening = ["morning x", "we need toothpaste"];
  const intro = useScript(opening.length, !replied);
  return (
    <div className="thread">
      <button className="e2e-banner" onClick={(event) => os.tip("toothpaste", event.currentTarget)}>
        🔒 messages are end-to-end encrypted. tap to learn more.
      </button>
      <div className="thread-body" aria-live="polite">
        {opening.slice(0, intro.shown).map((text) => (
          <motion.p key={text} className="bubble theirs" {...bubbleMotion}>
            {text}
          </motion.p>
        ))}
        {replied && (
          <motion.p className="bubble mine" {...bubbleMotion}>
            ok
          </motion.p>
        )}
        {justReplied ? <LateReply /> : replied && <ThankYou />}
        <AnimatePresence>{intro.typing && <Typing />}</AnimatePresence>
      </div>
      <div className="composer">
        {!replied && intro.shown === opening.length ? (
          <motion.button
            className="quick-reply"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              setJustReplied(true);
              os.setFlag("chatReplied");
            }}
          >
            reply “ok”
          </motion.button>
        ) : (
          <span className="composer-fake">message</span>
        )}
      </div>
    </div>
  );
}

function Family() {
  const os = useOS();
  const kid = os.name("kid", "child");
  const lines = [`${kid}: did u see what someone made from ur party pic??`, `${kid}: it’s going round year 9`];
  const script = useScript(lines.length + 1, true);
  return (
    <div className="thread">
      <div className="thread-body" aria-live="polite">
        {lines.slice(0, script.shown).map((text) => (
          <motion.p key={text} className="bubble theirs" {...bubbleMotion}>
            {text}
          </motion.p>
        ))}
        {script.shown > lines.length && (
          <motion.div className="bubble theirs photo-bubble" {...bubbleMotion}>
            <PartyPhoto />
          </motion.div>
        )}
        <AnimatePresence>{script.typing && <Typing />}</AnimatePresence>
      </div>
      <div className="composer">
        <span className="composer-fake">message</span>
      </div>
    </div>
  );
}

export function Chats() {
  const os = useOS();
  const initial: Thread | null = os.target === "other" || os.target === "family" ? os.target : null;
  const [thread, setThread] = useState<Thread | null>(initial);
  const hasFamily = os.fired.has("photos");
  const partner = os.name("other half ♥", "contact");
  if (thread) {
    return (
      <AppShell app="chats" title={thread === "other" ? partner : os.name("family 🏠", "group")}>
        <button className="thread-back" onClick={() => setThread(null)}>
          ‹ all chats
        </button>
        {thread === "other" ? <OtherHalf /> : <Family />}
      </AppShell>
    );
  }
  return (
    <AppShell app="chats" title="chats">
      <ul className="list">
        <li>
          <button onClick={() => setThread("other")}>
            <span className="avatar">♥</span>
            <span>
              <strong>{partner}</strong>
              <small>{os.flags.has("chatReplied") ? "ty ♥ the minty one" : "we need toothpaste"}</small>
            </span>
          </button>
        </li>
        {hasFamily && (
          <li>
            <button onClick={() => setThread("family")}>
              <span className="avatar is-group">⌂</span>
              <span>
                <strong>{os.name("family 🏠", "group")}</strong>
                <small>did u see what someone made…</small>
              </span>
            </button>
          </li>
        )}
        <li>
          <span className="list-static">
            <span className="avatar is-dim">{os.name("M", "?")}</span>
            <span>
              <strong>{os.name("mum", "parent")}</strong>
              <small>love you x · yesterday</small>
            </span>
          </span>
        </li>
      </ul>
    </AppShell>
  );
}
