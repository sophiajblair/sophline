import type { AppId } from "../content/timeline";
import { appMeta } from "../pixel/icons";

export type GuideState = {
  screen: "off" | "lock" | "home" | AppId;
  calling: boolean;
  tipOpen: boolean;
  unread: boolean;
  next?: AppId;
  /** explanations opened since the current app was opened */
  visitTips: number;
  finished: boolean;
  /** story beats that have arrived so far */
  step: number;
  total: number;
};

const noTips: AppId[] = ["settings", "receipts"];

/** The one thing the visitor should do now, in story order. */
export function guide(s: GuideState): string {
  if (s.screen === "off") return "read this, then tap ‘pick it up’";
  if (s.calling) return "someone’s calling. answer or decline.";
  if (s.tipOpen) return "read it, then tap × to close";
  if (s.finished) return "that’s everything. look around, or open receipts for every source.";
  const step = `step ${s.step}/${s.total} · `;
  if (s.screen === "lock") return step + (s.unread ? "tap the notification" : "tap to unlock");
  if (s.screen === "home") {
    if (s.next) return `${step}tap the glowing ${appMeta[s.next].label} app`;
    return `${step}nothing new yet. wait for the next buzz.`;
  }
  if (s.visitTips === 0 && !noTips.includes(s.screen)) return `${step}tap the thing that looks off in ${appMeta[s.screen].label}`;
  return s.next ? `${step}tap ‹ home (top left), then open ${appMeta[s.next].label}` : `${step}done here. tap ‹ home (top left)`;
}
