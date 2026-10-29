import { useRef, useState } from "react";
import { motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell, VideoSlot } from "../os/ui";

type Choice = { label: string; won: boolean; result: string };

const choices: Choice[] = [
  { label: "share to neighbours", won: false, result: "you just posted a stranger’s face to the whole street. it was the parcel driver. you can’t pull that clip back now." },
  { label: "save it", won: false, result: "saved. one more clip of someone who never agreed to be filmed, kept on a server you don’t own." },
  { label: "ignore it", won: false, result: "the door’s fine. the clip saved itself to the cloud anyway. ignoring isn’t the same as off." },
  { label: "check the settings first", won: true, result: "audio off. old clips deleted. search party off. the camera still watches, just a bit less." },
];

export function Porch() {
  const os = useOS();
  const panelRef = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [party, setParty] = useState(true);
  return (
    <AppShell app="porch" title="porch · front door">
      <VideoSlot id="doorbell-porch" className="porch-video">
        <div className="porch-scene">
          <i className="porch-door" />
          <i className="porch-lamp" />
          <i className="porch-person" />
        </div>
      </VideoSlot>
      <div className="porch-hud" aria-hidden="true">
        <span className="rec">● LIVE</span>
        <span>09:41:12 · cam 01</span>
      </div>
      <motion.div
        className="porch-detect"
        aria-hidden="true"
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        PERSON
      </motion.div>
      <div ref={panelRef} className="porch-panel">
        <strong>person at your front door</strong>
        <small>motion · 3 sec ago · clip saved to cloud</small>
        {choice ? (
          <motion.div
            className={`porch-result ${choice.won ? "is-won" : "is-lost"}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            aria-live="polite"
          >
            <strong>{choice.won ? "you beat it." : "you messed it up."}</strong>
            <p>{choice.result}</p>
            <button className="porch-retry" onClick={() => setChoice(null)}>
              try again
            </button>
          </motion.div>
        ) : (
          <div className="porch-actions" role="group" aria-label="what do you do?">
            <p className="porch-ask">someone’s at the door. what do you do?</p>
            {choices.map((c) => (
              <motion.button
                key={c.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setChoice(c);
                  if (c.won) setParty(false);
                  os.tip("doorbell", panelRef.current);
                }}
              >
                {c.label}
              </motion.button>
            ))}
          </div>
        )}
        <button
          className="porch-toggle"
          aria-pressed={party}
          onClick={(event) => {
            setParty(!party);
            os.tip("doorbell", event.currentTarget);
          }}
        >
          <span>search party (AI)</span>
          <b className={party ? undefined : "is-off"}>{party ? "ON" : "OFF"}</b>
        </button>
        {choice && <p className="tiny-note">pretend porch. the clip stayed in this browser.</p>}
      </div>
    </AppShell>
  );
}
