import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell } from "../os/ui";

type MailId = "parcel" | "screentime" | "digest";

const flags = ["lookalike sender", "tiny fee", "urgent timer", "link you didn’t expect", "knows what you bought"];

function ParcelMail() {
  const os = useOS();
  const [clicked, setClicked] = useState(false);
  return (
    <article className="mail-view">
      <button className="mail-from" onClick={(event) => os.tip("phishing", event.currentTarget)}>
        <span className="avatar is-warn">P</span>
        <span>
          <strong>ParcelPal Support</strong>
          <small>delivery@parcelpa1.help</small>
        </span>
      </button>
      <h2>your mint. order is waiting</h2>
      <p>
        Hi {os.name("Sam", "there")}! We couldn’t deliver your <b>mint. toothpaste (x2)</b>. Confirm the £1.49 redelivery fee within{" "}
        <b>14 minutes</b> or it will be returned to sender.
      </p>
      <motion.button
        className="mail-cta"
        whileTap={{ scale: 0.96 }}
        onClick={(event) => {
          setClicked(true);
          os.tip("phishing", event.currentTarget);
        }}
      >
        confirm your delivery
      </motion.button>
      <AnimatePresence>
        {clicked && (
          <motion.div className="red-flags" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.18 } } }}>
            {flags.map((flag) => (
              <motion.span key={flag} variants={{ hidden: { opacity: 0, scale: 0.6 }, shown: { opacity: 1, scale: 1 } }}>
                {flag}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="fake-stamp">training fake · this button goes nowhere · no data collected</p>
    </article>
  );
}

export function Mail() {
  const os = useOS();
  const hasParcel = os.fired.has("mail");
  const [open, setOpen] = useState<MailId | null>(os.target === "parcel" && hasParcel ? "parcel" : null);
  if (open) {
    return (
      <AppShell app="mail" title="mail" tone="light">
        <button className="thread-back" onClick={() => setOpen(null)}>
          ‹ inbox
        </button>
        {open === "parcel" ? (
          <ParcelMail />
        ) : open === "screentime" ? (
          <article className="mail-view">
            <h2>your weekly report</h2>
            <p>you spent 6h 12m a day on your phone, up 14%. your most-used hour was 02:00.</p>
            <p className="fake-stamp">we noticed. we always notice.</p>
          </article>
        ) : (
          <article className="mail-view">
            <h2>loop digest</h2>
            <p>12 creators you might like. 4 products people like you bought. 1 memory from 3 years ago.</p>
          </article>
        )}
      </AppShell>
    );
  }
  return (
    <AppShell app="mail" title="inbox" tone="light">
      <ul className="list is-light">
        {hasParcel && (
          <motion.li initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <button className="is-unread" onClick={() => setOpen("parcel")}>
              <span className="avatar is-warn">P</span>
              <span>
                <strong>ParcelPal Support</strong>
                <small>your mint. order is waiting · action needed</small>
              </span>
            </button>
          </motion.li>
        )}
        <li>
          <button onClick={() => setOpen("screentime")}>
            <span className="avatar">⌚</span>
            <span>
              <strong>screen time</strong>
              <small>your weekly report is ready</small>
            </span>
          </button>
        </li>
        <li>
          <button onClick={() => setOpen("digest")}>
            <span className="avatar">◎</span>
            <span>
              <strong>loop</strong>
              <small>12 creators you might like</small>
            </span>
          </button>
        </li>
      </ul>
      {!hasParcel && <p className="tiny-note">nothing urgent. yet.</p>}
    </AppShell>
  );
}
