import { useRef, useState } from "react";
import { motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell, VideoSlot } from "../os/ui";

type Choice = { label: string; result: string };

const choices: Choice[] = [
  { label: "share to neighbours", result: "you just posted a stranger’s face to the whole street. it was the parcel driver. you can’t pull that clip back now." },
  { label: "save the clip", result: "saved. one more clip of someone who never agreed to be filmed, kept on a server you don’t own." },
  { label: "ignore it", result: "the door’s fine. but the clip already uploaded itself to the cloud. ignoring it isn’t the same as switching it off." },
];

const settings = [
  { id: "audio", title: "record sound", why: "the mic hears conversations on your porch and the pavement, including people who never agreed to be recorded." },
  { id: "cloud", title: "upload clips to the cloud", why: "clips are kept on the company’s servers, not on your phone. other people can have access to them." },
  { id: "history", title: "keep old clips", why: "every past visitor stays stored until someone deletes the footage." },
  { id: "party", title: "search party (AI)", why: "lets AI scan video from cameras nearby, to look for lost pets. that includes the people walking past." },
] as const;

function CameraSettings({ onBack }: { onBack: () => void }) {
  const os = useOS();
  const panelRef = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState<Record<string, boolean>>({ audio: true, cloud: true, history: true, party: true });
  const left = settings.filter((s) => on[s.id]).length;
  return (
    <AppShell app="porch" title="porch · camera settings">
      <div ref={panelRef} className="porch-settings">
        <button className="thread-back" onClick={onBack}>
          ‹ back to live view
        </button>
        <h2>what is this camera keeping?</h2>
        <p className="porch-lede">
          your doorbell camera records and stores everyone who walks up to your door. these are its settings. switch off what you don’t need, then tap done.
        </p>
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
        <p className={`porch-tally${left === 0 ? " is-done" : ""}`} aria-live="polite">
          {left === 0 ? "all off. the camera still sees the door, but keeps far less." : `${left} of ${settings.length} still on`}
        </p>
        <button className="pixel-button is-sick" onClick={() => os.tip("doorbell", panelRef.current)}>
          done
        </button>
      </div>
    </AppShell>
  );
}

export function Porch() {
  const os = useOS();
  const panelRef = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [view, setView] = useState<"live" | "settings">("live");
  if (view === "settings") return <CameraSettings onBack={() => setView("live")} />;
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
        <strong>someone is at your front door</strong>
        <small>your doorbell camera spotted a person 3 seconds ago, and uploaded a clip to the cloud on its own.</small>
        {choice ? (
          <motion.div className="porch-result is-lost" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} aria-live="polite">
            <strong>not great.</strong>
            <p>{choice.result}</p>
            <small>there’s a better move: open the camera settings and see what it’s keeping.</small>
            <div className="porch-result-actions">
              <button className="porch-retry" onClick={() => setChoice(null)}>
                try again
              </button>
              <button className="porch-open" onClick={() => setView("settings")}>
                ⚙ open camera settings
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="porch-actions" role="group" aria-label="what do you do?">
            <p className="porch-ask">what do you do?</p>
            {choices.map((c) => (
              <motion.button
                key={c.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setChoice(c);
                  os.tip("doorbell", panelRef.current);
                }}
              >
                {c.label}
              </motion.button>
            ))}
            <motion.button className="porch-open" whileTap={{ scale: 0.95 }} onClick={() => setView("settings")}>
              ⚙ open camera settings
            </motion.button>
          </div>
        )}
        <p className="tiny-note">pretend porch. nothing here is recorded or sent anywhere.</p>
      </div>
    </AppShell>
  );
}
