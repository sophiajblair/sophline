import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell, Typing, bubbleMotion } from "../os/ui";
import { useScript } from "../os/useScript";

function CallAnswer() {
  const os = useOS();
  const script = useScript(2, true);
  return (
    <>
      {script.shown > 0 && (
        <motion.p className="bubble theirs" {...bubbleMotion}>
          {os.caller === "brother" ? "on the sofa. literally been here all day. why?" : "in the kitchen, love. why?"}
        </motion.p>
      )}
      {script.shown > 1 && (
        <motion.button className="bubble theirs is-tip" {...bubbleMotion} onClick={(event) => os.tip("call", event.currentTarget)}>
          no, i haven’t called you today. why? ↗
        </motion.button>
      )}
      <AnimatePresence>{script.typing && <Typing />}</AnimatePresence>
    </>
  );
}

function CallBack({ caller }: { caller: string }) {
  const os = useOS();
  const connect = useScript(1, true);
  const [asked, setAsked] = useState(false);
  const connected = connect.shown > 0;
  return (
    <div className="callback" aria-live="polite">
      <p className="callback-status">{connected ? `connected · ${caller} (saved number)` : `calling ${caller} on their saved number…`}</p>
      {connected && (
        <motion.p className="bubble theirs" {...bubbleMotion}>
          {os.caller === "brother" ? "yeah? what’s up?" : "hello love, what’s up?"}
        </motion.p>
      )}
      {asked && (
        <motion.p className="bubble mine" {...bubbleMotion}>
          where are you right now? did you just ring me?
        </motion.p>
      )}
      {asked && <CallAnswer />}
      {connected && !asked && (
        <motion.button className="quick-reply" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setAsked(true)}>
          ask: “where are you right now?”
        </motion.button>
      )}
    </div>
  );
}

export function PhoneApp() {
  const os = useOS();
  const [calling, setCalling] = useState(false);
  const declined = os.callOutcome === "declined";
  const called = os.callOutcome !== null;
  const caller = os.caller === "brother" ? os.name("ollie", "sibling") : os.name("mum", "parent");
  const claim = os.caller === "brother" ? os.name("ollie, your little brother", "your sibling") : os.name("mum", "your parent");
  const amount = os.caller === "brother" ? "£300" : "£800";
  return (
    <AppShell app="phone" title="phone">
      {calling ? (
        <CallBack caller={caller} />
      ) : (
        <>
          {declined && (
            <motion.button
              className="voicemail"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(event) => os.tip("call", event.currentTarget)}
            >
              <small>voicemail · {os.callerNumber} · says it’s {claim} · 0:21 · transcript</small>
              <span>
                “it’s me. please pick up. my account’s frozen, i need {amount} sent to my friend’s account now. don’t tell anyone. i’ll explain
                later.”
              </span>
            </motion.button>
          )}
          <ul className="list">
            {called && (
              <li>
                <button onClick={() => setCalling(true)}>
                  <span className={`avatar${declined ? " is-warn" : ""}`}>☎</span>
                  <span>
                    <strong>{os.callerNumber}</strong>
                    <small>
                      says it’s {claim} · {declined ? "missed · just now" : "incoming · just now"} · tap to call {caller} back on their saved number
                    </small>
                  </span>
                </button>
              </li>
            )}
            <li>
              <span className="list-static">
                <span className="avatar is-dim">☎</span>
                <span>
                  <strong>{os.name("dentist", "unknown")}</strong>
                  <small>yesterday</small>
                </span>
              </span>
            </li>
            <li>
              <span className="list-static">
                <span className="avatar is-dim">☎</span>
                <span>
                  <strong>no caller id</strong>
                  <small>monday · 0 sec</small>
                </span>
              </span>
            </li>
          </ul>
          {!called && <p className="tiny-note">no new calls. it’s quiet. too quiet.</p>}
        </>
      )}
    </AppShell>
  );
}
