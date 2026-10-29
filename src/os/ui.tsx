import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
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
 * With reduced motion the clip waits on its first frame until tapped.
 */
export function VideoSlot({ id, className = "", children }: { id: string; className?: string; children?: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) videoRef.current?.pause();
  }, [reduceMotion]);
  const slot = videoById[id];
  if (!slot) return null;
  const base = import.meta.env.BASE_URL;
  const supplied = Boolean(slot.posterPath);
  return (
    <div className={`video-slot ${className}${ready ? " is-ready" : ""}${supplied ? " is-supplied" : ""}`} data-video-id={id}>
      <video
        ref={videoRef}
        muted
        autoPlay={!reduceMotion}
        loop
        playsInline
        preload="metadata"
        poster={slot.posterPath && `${base}${slot.posterPath}`}
        onCanPlay={() => setReady(true)}
        onError={() => setReady(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        aria-label={slot.label}
      >
        {slot.webmPath && <source src={`${base}${slot.webmPath}`} type="video/webm" />}
        <source src={`${base}${slot.filePath}`} type="video/mp4" />
      </video>
      {reduceMotion && (ready || supplied) && (
        <button
          className={`video-play${playing ? " is-playing" : ""}`}
          aria-label={playing ? `pause ${slot.label}` : `play ${slot.label}`}
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (video.paused) void video.play().catch(() => {});
            else video.pause();
          }}
        >
          <span aria-hidden="true">{playing ? "❚❚" : "▶ tap to play"}</span>
        </button>
      )}
      {!ready && !supplied && (
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
