import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell } from "../os/ui";
import { useScript } from "../os/useScript";

function CallBack({ caller }: { caller: string }) {
  const os = useOS();
  const script = useScript(2, true);
  return (
    <div className="callback">
      <p className="callback-status">{script.shown ? "connected · 00:0" + script.shown : `calling ${caller}…`}</p>
      <AnimatePresence>
        {script.shown > 0 && (
          <motion.p className="bubble theirs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {os.caller === "brother" ? "yeah? i’m literally on the sofa. what’s up?" : "hello? i’m in the kitchen. what’s up love?"}
          </motion.p>
        )}
        {script.shown > 1 && (
          <motion.button
            className="bubble theirs is-tip"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(event) => os.tip("call", event.currentTarget)}
          >
            no, i haven’t called you today. why? ↗
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PhoneApp() {
  const os = useOS();
  const [calling, setCalling] = useState(false);
  const declined = os.callOutcome === "declined";
  const called = os.callOutcome !== null;
  const caller = os.caller === "brother" ? os.name("ollie", "sibling") : os.name("mum", "parent");
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
              <small>voicemail · {caller} · 0:21 · transcript</small>
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
                    <strong>{caller}</strong>
                    <small>{declined ? "missed · just now" : "incoming · just now"} · tap to call back</small>
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
