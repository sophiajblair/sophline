import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell } from "../os/ui";

type MailId = "parcel" | "work" | "screentime" | "digest";

const flags = ["lookalike sender", "tiny fee", "urgent timer", "link you didn’t expect", "knows what you bought"];

const workFlags = ["lookalike sender", "asks for your password", "deadline today", "link you didn’t expect", "sounds like your workplace"];

type Choice = { label: string; won: boolean; result: string };

const parcelChoices: Choice[] = [
  { label: "pay the £1.49", won: false, result: "pretend card details, gone. real ones would be too. nothing was sent." },
  { label: "forward it to report@phishing.gov.uk", won: true, result: "reported. parcelpa1.help was never your courier." },
  { label: "check the order in the shop’s own app", won: true, result: "no missed delivery there. the email was the only thing waiting." },
];

const workChoices: Choice[] = [
  { label: "enter my password", won: false, result: "your work login just went to a stranger. pretend. nothing was submitted." },
  { label: "report it to the real IT team", won: true, result: "they never sent it. you just saved the whole team’s inbox." },
  { label: "ignore it", won: true, result: "nothing got locked. reporting it would help the next person too." },
];

function MailChoices({ choices, redFlags }: { choices: Choice[]; redFlags: string[] }) {
  const os = useOS();
  const boxRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Choice | null>(null);
  return (
    <div ref={boxRef} className="mail-choices">
      {picked ? (
        <motion.div
          className={`mail-result ${picked.won ? "is-won" : "is-lost"}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          aria-live="polite"
        >
          <strong>{picked.won ? "you beat it." : "you messed it up."}</strong>
          <p>{picked.result}</p>
          <button className="mail-retry" onClick={() => setPicked(null)}>
            try again
          </button>
        </motion.div>
      ) : (
        <div className="mail-options" role="group" aria-label="what do you do?">
          <small>what do you do?</small>
          {choices.map((choice, index) => (
            <motion.button
              key={choice.label}
              className={index === 0 ? "mail-cta" : "mail-choice"}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setPicked(choice);
                os.tip("phishing", boxRef.current);
              }}
            >
              {choice.label}
            </motion.button>
          ))}
        </div>
      )}
      <AnimatePresence>
        {picked && (
          <motion.div className="red-flags" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.18 } } }}>
            {redFlags.map((flag) => (
              <motion.span key={flag} variants={{ hidden: { opacity: 0, scale: 0.6 }, shown: { opacity: 1, scale: 1 } }}>
                {flag}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkMail() {
  const os = useOS();
  return (
    <article className="mail-view">
      <button className="mail-from" onClick={(event) => os.tip("phishing", event.currentTarget)}>
        <span className="avatar is-warn">IT</span>
        <span>
          <strong>IT Service Desk</strong>
          <small>servicedesk@n0rthgate-it.co</small>
        </span>
      </button>
      <h2>your password expires today</h2>
      <p>
        Hi {os.name("Sam", "there")}, your work account password expires at <b>17:00 today</b>. Sign in below to keep access to email, payroll and
        shared files. Accounts not updated will be <b>locked</b>.
      </p>
      <MailChoices choices={workChoices} redFlags={workFlags} />
      <p className="fake-stamp">training fake · these buttons go nowhere · no data collected</p>
    </article>
  );
}

function ParcelMail() {
  const os = useOS();
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
      <MailChoices choices={parcelChoices} redFlags={flags} />
      <p className="fake-stamp">training fake · these buttons go nowhere · no data collected</p>
    </article>
  );
}

export function Mail() {
  const os = useOS();
  const hasParcel = os.fired.has("mail");
  const hasWork = os.fired.has("work");
  const initial: MailId | null = os.target === "parcel" && hasParcel ? "parcel" : os.target === "work" && hasWork ? "work" : null;
  const [open, setOpen] = useState<MailId | null>(initial);
  if (open) {
    return (
      <AppShell app="mail" title="mail" tone="light">
        <button className="thread-back" onClick={() => setOpen(null)}>
          ‹ inbox
        </button>
        {open === "parcel" ? (
          <ParcelMail />
        ) : open === "work" ? (
          <WorkMail />
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
        {hasWork && (
          <motion.li initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <button className="is-unread" onClick={() => setOpen("work")}>
              <span className="avatar is-warn">IT</span>
              <span>
                <strong>IT Service Desk</strong>
                <small>your password expires today · action needed</small>
              </span>
            </button>
          </motion.li>
        )}
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
