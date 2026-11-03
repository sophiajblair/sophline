import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS, type CallOutcome } from "./context";

const tactics = ["urgent", "secret", "scared voice", "new account", "can’t talk long"];

type Props = { onDone: (outcome: CallOutcome) => void };

export function CallOverlay({ onDone }: Props) {
  const os = useOS();
  const brother = os.caller === "brother";
  const caller = os.callerNumber;
  const claim = brother ? os.name("ollie, your little brother", "your sibling") : os.name("mum", "your parent");
  const amount = brother ? "£300" : "£800";
  const script = brother
    ? "it’s ollie. i’ve lost my phone, i’m on a mate’s. can you transfer me £300 for the train? i’ll pay you back. please, i can’t talk long."
    : "hi, it’s mum. i’ve been in an accident. don’t tell dad yet. my account’s frozen — please send £800 to my friend now. i’ll explain later.";
  const words = script.split(" ");
  const [phase, setPhase] = useState<"ringing" | "live" | CallOutcome>("ringing");
  const [spoken, setSpoken] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef(os.tip);
  useEffect(() => {
    tipRef.current = os.tip;
  });

  useEffect(() => {
    if (phase !== "live") return;
    const words = setInterval(() => setSpoken((n) => n + 1), 260);
    const clock = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => {
      clearInterval(words);
      clearInterval(clock);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "ringing" || phase === "live") return;
    const timer = setTimeout(() => tipRef.current("call", resultRef.current), 700);
    return () => clearTimeout(timer);
  }, [phase]);

  const shownWords = Math.min(spoken, words.length);
  const chipCount = Math.min(tactics.length, Math.floor((shownWords / words.length) * (tactics.length + 1)));
  const choicesReady = shownWords >= Math.floor(words.length * 0.6);

  const result: Record<Exclude<CallOutcome, "declined">, { icon: string; title: string; copy: string }> = {
    sent: { icon: "−£", title: `you just “lost” ${amount}`, copy: "pretend money. real lesson. nothing was sent." },
    safe: { icon: "✓", title: "you beat it.", copy: "you asked for the family word. the voice stumbled, and the call dropped." },
    callback: { icon: "☎", title: `${brother ? os.name("ollie", "they") : os.name("mum", "they")} is fine.`, copy: brother ? "you ring his usual number. he answers on the sofa, confused. his phone was in his pocket the whole time. the real him wouldn’t mind you checking." : "you ring her usual number. she answers in the kitchen, confused and fine. she never called. the real her wouldn’t mind you checking." },
    ended: { icon: "?", title: "it dodged the question.", copy: `“there’s no time for this, just send it.” the real ${brother ? os.name("ollie", "sibling") : os.name("mum", "parent")} would’ve answered. a copy pushes harder instead. now ring the number you already have.` },
  };

  return (
    <motion.div
      className={`call phase-${phase}`}
      role="dialog"
      aria-label={`incoming call from ${caller}`}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 260, damping: 32 }}
    >
      <p className="synthetic-label">clearly synthetic caption demo · no real voice</p>
      {phase === "ringing" && (
        <div className="call-ringing">
          <div className="caller-avatar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>?</span>
          </div>
          <p>incoming call</p>
          <h2>{caller}</h2>
          <p className="call-claim">not in your contacts · says it’s {claim}</p>
          <p className="call-note">content note: a distressed voice asks for money. decline to skip it.</p>
          <div className="call-actions">
            <button
              className="decline"
              onClick={() => {
                onDone("declined");
              }}
            >
              <span aria-hidden="true">×</span>decline
            </button>
            <motion.button
              className="answer"
              onClick={() => setPhase("live")}
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.1 }}
              autoFocus
            >
              <span aria-hidden="true">☎</span>answer
            </motion.button>
          </div>
        </div>
      )}
      {phase === "live" && (
        <div className="call-live">
          <div className="call-top">
            <span>00:{String(seconds).padStart(2, "0")}</span>
            <strong>{caller}</strong>
            <small className="call-claim">says it’s {claim}</small>
            <i className="wave" aria-hidden="true">
              ▂▆▃▇▂▅▁▆
            </i>
          </div>
          <div className="caption-card" aria-live="polite">
            <small>synthetic captions</small>
            <p>
              {words.slice(0, shownWords).map((word, i) => (
                <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {word}{" "}
                </motion.span>
              ))}
            </p>
          </div>
          <div className="tactics">
            <AnimatePresence>
              {tactics.slice(0, chipCount).map((tactic) => (
                <motion.span key={tactic} initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 600, damping: 18 }}>
                  {tactic}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {choicesReady && (
              <motion.div className="choice-buttons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <button onClick={() => setPhase("sent")}>send {amount}</button>
                <button onClick={() => setPhase("safe")}>ask for the family word</button>
                <button onClick={() => setPhase("ended")}>ask something only {brother ? "he’d" : "she’d"} know</button>
                <button onClick={() => setPhase("callback")}>“i’ll ring you straight back” on {brother ? "his" : "her"} usual number</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {phase !== "ringing" && phase !== "live" && phase !== "declined" && (
        <motion.div
          ref={resultRef}
          className={`call-result is-${phase}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
        >
          <p className="fake-burn">this is a fake</p>
          <div className="result-icon" aria-hidden="true">
            {result[phase].icon}
          </div>
          <h2>{result[phase].title}</h2>
          <p>{result[phase].copy}</p>
          <button className="pixel-button" onClick={(event) => os.tip("call", event.currentTarget)}>
            what just happened? ↗
          </button>
          <button className="pixel-button is-ghost" onClick={() => onDone(phase)}>
            put the phone down
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
