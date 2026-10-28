import { useState } from "react";
import { motion } from "motion/react";
import { sourceById } from "../content/sources";
import { videoById } from "../content/videos";
import type { AppId } from "../content/timeline";
import { useOS } from "./context";

export function Receipts({ ids, compact }: { ids: string[]; compact?: boolean }) {
  return (
    <div className={`receipts${compact ? " is-compact" : ""}`}>
      {!compact && <span>receipts</span>}
      {ids.map((id) => {
        const source = sourceById[id];
        return source ? (
          <a key={id} href={source.href} target="_blank" rel="noreferrer">
            {source.site} ↗
          </a>
        ) : null;
      })}
    </div>
  );
}

/**
 * Hannah supplies every clip. Until a matching file exists in public/videos/,
 * the slot shows its pixel poster (children) with a labelled TODO tag.
 */
export function VideoSlot({ id, className = "", children }: { id: string; className?: string; children?: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const slot = videoById[id];
  if (!slot) return null;
  return (
    <div className={`video-slot ${className}${ready ? " is-ready" : ""}`} data-video-id={id}>
      <video
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        onCanPlay={() => setReady(true)}
        onError={() => setReady(false)}
        aria-label={slot.label}
      >
        <source src={`${import.meta.env.BASE_URL}${slot.webmPath}`} type="video/webm" />
        <source src={`${import.meta.env.BASE_URL}${slot.filePath}`} type="video/mp4" />
      </video>
      {!ready && (
        <div className="video-placeholder">
          <div className="video-poster" aria-hidden="true">{children}</div>
          <div className="video-todo">
            <span>TODO · video coming soon</span>
            <strong>{slot.label}</strong>
            <small>
              {slot.aspectRatio} · {slot.suggestedLength}
            </small>
            <code>{slot.filePath}</code>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ app, title, children, tone }: { app: AppId; title: string; children: React.ReactNode; tone?: "light" }) {
  const os = useOS();
  return (
    <div className={`app app-${app}${tone === "light" ? " is-light" : ""}`}>
      <header className="app-bar">
        <button className="app-back" onClick={os.home} aria-label="back to home screen">
          ‹ home
        </button>
        <span className="app-title">{title}</span>
        <span className="app-bar-eye" aria-hidden="true">◉</span>
      </header>
      <div className="app-body">{children}</div>
    </div>
  );
}

export function Typing({ label = "typing" }: { label?: string }) {
  return (
    <motion.div
      className="bubble theirs typing"
      aria-label={label}
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <i />
      <i />
      <i />
    </motion.div>
  );
}

export const bubbleMotion = {
  initial: { opacity: 0, y: 14, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring" as const, stiffness: 420, damping: 30 },
};
