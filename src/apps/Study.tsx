import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell, Typing, bubbleMotion } from "../os/ui";
import { useScript } from "../os/useScript";

type Choice = { label: string; result: string };

const choices: Choice[] = [
  { label: "tell it more", result: "it saves that too. the more a child tells a chatbot, the more it has on file about them." },
  { label: "let it keep helping", result: "the homework gets done. so does the file on the child, one message at a time." },
  { label: "ignore it", result: "ignoring it doesn’t switch it off. the chat and the ‘stressed’ note are already saved." },
];

const settings = [
  { id: "chats", title: "save every chat", why: "everything a child types stays on file, long after the homework is done." },
  { id: "voice", title: "record their voice", why: "questions asked out loud are kept as audio, not just text." },
  { id: "mood", title: "track their mood", why: "it just noted ‘stressed about tests’. feelings turn into a profile." },
  { id: "share", title: "share progress with partners", why: "‘learning partners’ can get reports on how a child is doing." },
] as const;

function StudySettings({ onBack }: { onBack: () => void }) {
  const os = useOS();
  const panelRef = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState<Record<string, boolean>>({ chats: true, voice: true, mood: true, share: true });
  const left = settings.filter((s) => on[s.id]).length;
  const tipRef = useRef(os.tip);
  const explained = useRef(false);
  useEffect(() => {
    tipRef.current = os.tip;
  });
  // switching everything off finishes the task by itself: no extra button to find
  useEffect(() => {
    if (left > 0 || explained.current) return;
    explained.current = true;
    const timer = setTimeout(() => tipRef.current("study", panelRef.current), 900);
    return () => clearTimeout(timer);
  }, [left]);
  return (
    <AppShell app="study" title="study buddy · what it keeps">
      <div ref={panelRef} className="study-settings">
        <button className="thread-back" onClick={onBack}>
          ‹ back to the chat
        </button>
        <h2>what is this chatbot keeping?</h2>
        <p className="study-lede">
          a homework helper doesn’t just answer questions. these are the things this pretend app saves about a child. tap the green button to switch them all off.
        </p>
        <button className="pixel-button is-sick" onClick={() => setOn({ chats: false, voice: false, mood: false, share: false })}>
          turn everything off
        </button>
        {settings.map((s) => (
          <label key={s.id} className="setting-toggle">
            <span>
              <strong>{s.title}</strong>
              <small>{s.why}</small>
            </span>
            <input type="checkbox" checked={on[s.id]} onChange={(event) => setOn({ ...on, [s.id]: event.target.checked })} />
            <i aria-hidden="true" />
          </label>
        ))}
        <p className={`study-tally${left === 0 ? " is-done" : ""}`} aria-live="polite">
          {left === 0 ? "all off. it can still help with homework, but it keeps far less." : `${left} of ${settings.length} still on`}
        </p>
        <button className="pixel-button is-ghost" onClick={() => os.tip("study", panelRef.current)}>
          skip, what does this mean?
        </button>
      </div>
    </AppShell>
  );
}

const lines = [
  { mine: true, text: "what’s 7 × 8? also i’m kinda stressed about my test tomorrow" },
  { mine: false, text: "7 × 8 = 56! 🎉 and don’t worry. i’ve saved that you get stressed about tests, so i can check in on you." },
];

export function Study() {
  const os = useOS();
  const panelRef = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [view, setView] = useState<"chat" | "settings">("chat");
  const script = useScript(lines.length + 1, true);
  if (view === "settings") return <StudySettings onBack={() => setView("chat")} />;
  const ready = script.shown > lines.length;
  return (
    <AppShell app="study" title="study buddy ✎">
      <div className="study-chat" aria-live="polite">
        {lines.slice(0, script.shown).map((line) => (
          <motion.p key={line.text} className={`bubble ${line.mine ? "mine" : "theirs"}`} {...bubbleMotion}>
            {line.text}
          </motion.p>
        ))}
        {ready && (
          <motion.p className="study-saved" {...bubbleMotion}>
            ✎ saved to profile: “stressed about tests”
          </motion.p>
        )}
        <AnimatePresence>{script.typing && <Typing label="study buddy is typing" />}</AnimatePresence>
      </div>
      {ready && (
        <div ref={panelRef} className="study-panel">
          <strong>a child just told a chatbot how they feel</strong>
          <small>the homework helper answered the maths, then quietly kept the feeling too.</small>
          {choice ? (
            <motion.div className="study-result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} aria-live="polite">
              <strong>not great.</strong>
              <p>{choice.result}</p>
              <small>there’s an easier fix: open what it keeps and switch it off.</small>
              <div className="study-result-actions">
                <button className="study-retry" onClick={() => setChoice(null)}>
                  try again
                </button>
                <button className="study-open" onClick={() => setView("settings")}>
                  ⚙ see what it keeps
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="study-actions" role="group" aria-label="what do you do?">
              <motion.button className="study-open study-primary" whileTap={{ scale: 0.95 }} onClick={() => setView("settings")}>
                ⚙ see what study buddy keeps
              </motion.button>
              <p className="study-ask">or, if you’d rather not:</p>
              {choices.map((c) => (
                <motion.button
                  key={c.label}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setChoice(c);
                    os.tip("study", panelRef.current);
                  }}
                >
                  {c.label}
                </motion.button>
              ))}
            </div>
          )}
          <p className="tiny-note">pretend app. nothing here is recorded or sent anywhere.</p>
        </div>
      )}
    </AppShell>
  );
}
