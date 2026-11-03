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

const noTips: AppId[] = ["notes", "settings", "receipts"];

/** The one thing the visitor should do now, in story order. */
export function guide(s: GuideState): string {
  if (s.screen === "off") return "tap ‘pick it up’";
  if (s.calling) return "someone’s calling. answer to play it out, or decline to skip.";
  if (s.tipOpen) return "read the note, then tap × to close it";
  if (s.screen === "lock") return s.unread ? "tap the notification to open it" : "wait for a buzz, or tap to unlock";
  if (s.screen === "home") {
    if (s.next) return `next: tap the glowing ${appMeta[s.next].label} icon`;
    return s.finished ? "that’s everything. look around, or open receipts for every source." : "nothing to do yet. wait for the next buzz.";
  }
  if (s.screen === "porch" && s.visitTips === 0) return "tap the green button, then ‘turn everything off’";
  if (s.visitTips === 0 && !noTips.includes(s.screen)) return `find the odd thing in ${appMeta[s.screen].label} and tap it`;
  return s.next ? `done here. tap ‹ home, then the glowing ${appMeta[s.next].label}` : "done here. tap ‹ home and wait for the next buzz";
}
