import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell } from "../os/ui";

type MailId = "parcel" | "work" | "screentime" | "digest";

const greet = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

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

type Clue = { id: string; label: string; verdict: string };

const parcelClues: Clue[] = [
  { id: "from", label: "sender address", verdict: "the name says ParcelPal. the address says parcelpa1.help: a number 1 where the l should be." },
  { id: "to", label: "sent to", verdict: "undisclosed-recipients. it says ‘hi’ like it knows you, but it went to a list." },
  { id: "fee", label: "the fee", verdict: "£1.49 feels too small to worry about. the point is your card details, not the money." },
  { id: "timer", label: "deadline", verdict: "a 14-minute countdown on a parcel. the rush is there so you don’t check." },
  { id: "link", label: "link goes to", verdict: "parcelpa1.help/redeliver/pay. not the shop you ordered from. check your order in the shop’s own app instead." },
];

const workClues: Clue[] = [
  { id: "from", label: "sender address", verdict: "servicedesk@n0rthgate-it.co. that’s a zero, not an o. your real IT team emails from your work domain." },
  { id: "replyto", label: "reply-to", verdict: "replies go to helpdesk@n0rthgate-support.co. a different address from the sender. why?" },
  { id: "deadline", label: "deadline", verdict: "locked by 17:00 today. a same-day threat is there to rush you." },
  { id: "link", label: "link goes to", verdict: "n0rthgate-it.co/sso/verify. a lookalike login page. type the address you normally use instead of trusting the button." },
];

function useClues(list: Clue[]) {
  const [active, setActive] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const inspect = (id: string) => {
    setActive(id);
    setSeen((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  return { inspect, active, clue: list.find((c) => c.id === active) ?? null, seen: seen.length, total: list.length };
}

type Clues = ReturnType<typeof useClues>;

function Spot({ id, clues, className = "", children }: { id: string; clues: Clues; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`spot ${className}${clues.active === id ? " is-on" : ""}`}
      onMouseEnter={() => clues.inspect(id)}
      onFocus={() => clues.inspect(id)}
      onClick={() => clues.inspect(id)}
    >
      {children}
    </button>
  );
}

function CheckBar({ clues }: { clues: Clues }) {
  return (
    <div className={`check-bar${clues.clue ? " is-on" : ""}`} aria-live="polite">
      {clues.clue ? (
        <>
          <small>{clues.clue.label}</small>
          <span>{clues.clue.verdict}</span>
        </>
      ) : (
        <span>hover or tap the sender, the address, the link and anything urgent to check it.</span>
      )}
      <b>
        {clues.seen}/{clues.total} checked
      </b>
    </div>
  );
}

function MailChoices({ choices, redFlags, onPick }: { choices: Choice[]; redFlags: string[]; onPick?: () => void }) {
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
                onPick?.();
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
  const clues = useClues(workClues);
  return (
    <article className="mail-view is-email">
      <h2 className="mail-subject">
        your password expires today <span className="mail-label">inbox</span>
      </h2>
      <div className="mail-head">
        <span className="avatar is-warn">IT</span>
        <div className="mail-meta">
          <Spot id="from" clues={clues}>
            <strong>IT Service Desk</strong> <small>&lt;servicedesk@n0rthgate-it.co&gt;</small>
          </Spot>
          <Spot id="replyto" clues={clues}>
            <small>reply-to: helpdesk@n0rthgate-support.co</small>
          </Spot>
          <small className="mail-to">to: me · today 09:52</small>
        </div>
      </div>
      <div className="mail-body">
        <p>Hi {os.name(greet(os.owner), "there")},</p>
        <p>
          Your work account password expires at{" "}
          <Spot id="deadline" clues={clues} className="is-inline">
            <b>17:00 today</b>
          </Spot>
          . Sign in below to keep access to email, payroll and shared files. Accounts not updated will be <b>locked</b>.
        </p>
        <Spot id="link" clues={clues} className="mail-fake-link">
          Keep my password →
        </Spot>
        <p className="mail-sign">IT Service Desk</p>
      </div>
      <CheckBar clues={clues} />
      <MailChoices choices={workChoices} redFlags={workFlags} onPick={() => os.setFlag("workDone")} />
      <p className="fake-stamp">training fake · these buttons go nowhere · no data collected</p>
    </article>
  );
}

function ParcelMail() {
  const os = useOS();
  const clues = useClues(parcelClues);
  return (
    <article className="mail-view is-email">
      <h2 className="mail-subject">
        your mint. order is waiting <span className="mail-label">inbox</span>
      </h2>
      <div className="mail-head">
        <span className="avatar is-warn">P</span>
        <div className="mail-meta">
          <Spot id="from" clues={clues}>
            <strong>ParcelPal Support</strong> <small>&lt;delivery@parcelpa1.help&gt;</small>
          </Spot>
          <Spot id="to" clues={clues}>
            <small>to: undisclosed-recipients</small>
          </Spot>
          <small className="mail-to">today 09:58</small>
        </div>
      </div>
      <div className="mail-body">
        <p>Hi {os.name(greet(os.owner), "there")}!</p>
        <p>
          We couldn’t deliver your <b>mint. toothpaste (x2)</b>. Confirm the{" "}
          <Spot id="fee" clues={clues} className="is-inline">
            <b>£1.49 redelivery fee</b>
          </Spot>{" "}
          within{" "}
          <Spot id="timer" clues={clues} className="is-inline">
            <b>14 minutes</b>
          </Spot>{" "}
          or it will be returned to sender.
        </p>
        <Spot id="link" clues={clues} className="mail-fake-link">
          Confirm redelivery →
        </Spot>
        <p className="mail-sign">ParcelPal Customer Care</p>
      </div>
      <CheckBar clues={clues} />
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
