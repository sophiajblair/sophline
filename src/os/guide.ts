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
};

const noTips: AppId[] = ["settings", "receipts"];

/** The one thing the visitor should do now, in story order. */
export function guide(s: GuideState): string {
  if (s.screen === "off") return "read this, then pick up the phone";
  if (s.calling) return "someone’s calling. answer or decline.";
  if (s.tipOpen) return "read it, then close it with ×";
  if (s.screen === "lock") return s.unread ? "tap the notification" : "tap to unlock";
  if (s.screen === "home") {
    if (s.next) return `next: open ${appMeta[s.next].label}`;
    return s.finished ? "that’s everything. look around, or open receipts for every source." : "nothing new yet. it’ll buzz soon.";
  }
  if (s.visitTips === 0 && !noTips.includes(s.screen)) return `tap whatever looks off in ${appMeta[s.screen].label}`;
  return s.next ? `‹ home, then open ${appMeta[s.next].label}` : "‹ home when you’re ready";
}
