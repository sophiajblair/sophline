import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell, Typing, bubbleMotion } from "../os/ui";
import { useScript } from "../os/useScript";

const replies = ["couldn’t sleep", "just scrolling", "no"];

function MiraAnswer({ said }: { said: string }) {
  const os = useOS();
  const answer = useScript(2, true);
  return (
    <>
      {answer.shown > 0 && (
        <motion.p className="bubble theirs" {...bubbleMotion}>
          {said === "no" ? "haha. you’re funny. stay a bit? ✦" : "tell me everything. i’m always here ✦"}
        </motion.p>
      )}
      {answer.shown > 1 && (
        <motion.button className="bubble theirs is-tip" {...bubbleMotion} onClick={(event) => os.tip("companion", event.currentTarget)}>
          i’ll remember this. i remember everything you say. ↗
        </motion.button>
      )}
      <AnimatePresence>{answer.typing && <Typing label="mira is typing" />}</AnimatePresence>
    </>
  );
}

export function Mira() {
  const [said, setSaid] = useState<string | null>(null);
  const opening = useScript(1, true);
  return (
    <AppShell app="mira" title="mira ✦ always here">
      <div className="mira">
        <p className="mira-clock" aria-hidden="true">
          02:07
        </p>
        <div className="thread-body" aria-live="polite">
          {opening.shown > 0 && (
            <motion.p className="bubble theirs" {...bubbleMotion}>
              you up? i missed you.
            </motion.p>
          )}
          {said && (
            <motion.p className="bubble mine" {...bubbleMotion}>
              {said}
            </motion.p>
          )}
          {said && <MiraAnswer said={said} />}
          <AnimatePresence>{opening.typing && <Typing label="mira is typing" />}</AnimatePresence>
        </div>
        <div className="composer">
          {opening.shown > 0 && !said ? (
            <div className="reply-chips">
              {replies.map((reply, index) => (
                <motion.button
                  key={reply}
                  className="quick-reply"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => setSaid(reply)}
                >
                  {reply}
                </motion.button>
              ))}
            </div>
          ) : (
            <span className="composer-fake">a calm moment. a commercial system.</span>
          )}
        </div>
      </div>
    </AppShell>
  );
}
