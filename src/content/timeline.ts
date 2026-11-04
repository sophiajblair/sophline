import type { TipId } from "./annotations";

export type AppId =
  | "notes"
  | "loop"
  | "chats"
  | "study"
  | "mail"
  | "phone"
  | "circle"
  | "photos"
  | "you"
  | "settings"
  | "receipts";

export type Flag = "awake" | "notesRead" | "chatReplied" | "adSeen" | "callDone" | "callDeclined" | "workDone" | "holidayReplied";

export type Story = {
  beats: Set<TipId>;
  fired: Map<string, number>;
  flags: Set<Flag>;
  sinceLoad: number;
  sinceWake: number;
  /** no explanation open and the visitor is on the home or lock screen */
  settled: boolean;
};

export type TimelineEvent = {
  id: string;
  /** seconds to wait after `when` first becomes true */
  delay: number;
  when: (s: Story) => boolean;
  notify?: { app: AppId; title: string; body: string; target?: string };
  call?: true;
  setsFlag?: Flag;
  /** once fired, no other task is sent until this is true */
  done?: (s: Pick<Story, "flags" | "beats">) => boolean;
};

const since = (s: Story, id: string) => {
  const at = s.fired.get(id);
  return at === undefined ? -1 : (s.sinceLoad * 1000 - at) / 1000;
};

/**
 * The phone's story. Each event fires once, when its condition has held for
 * `delay` seconds. Conditions react to what the visitor has already seen, and
 * every beat also has a time fallback so nobody gets stuck.
 */
export const timeline: TimelineEvent[] = [
  {
    id: "notes",
    delay: 1.4,
    when: () => true,
    notify: { app: "notes", title: "to do", body: "open me first" },
    done: (s) => s.flags.has("notesRead"),
  },
  {
    id: "chat",
    delay: 1.4,
    when: (s) => s.flags.has("notesRead") || since(s, "notes") > 45,
    notify: { app: "chats", title: "other half ♥", body: "we need toothpaste", target: "other" },
    done: (s) => s.flags.has("chatReplied"),
  },
  {
    id: "ad",
    delay: 2.5,
    when: (s) => s.flags.has("chatReplied") || s.sinceWake > 60,
    notify: { app: "loop", title: "sponsored", body: "mint. — the paste that knows you", target: "ad" },
    setsFlag: "adSeen",
    done: (s) => s.beats.has("toothpaste"),
  },
  {
    id: "study",
    delay: 2.6,
    when: (s) => s.fired.has("chat"),
    notify: { app: "study", title: "study buddy ✎", body: "your homework helper sent a message" },
    done: (s) => s.beats.has("study"),
  },
  {
    id: "holiday",
    delay: 2.6,
    when: (s) => s.beats.has("study") || since(s, "study") > 40,
    notify: { app: "chats", title: "angela", body: "we should go on holiday soon!", target: "angela" },
    done: (s) => s.flags.has("holidayReplied"),
  },
  {
    id: "booking",
    delay: 2.5,
    when: (s) => s.flags.has("holidayReplied"),
    notify: { app: "loop", title: "sponsored", body: "booking.com · your holiday, sorted", target: "booking" },
    done: (s) => s.beats.has("holiday"),
  },
  {
    id: "mail",
    delay: 3,
    when: (s) => s.fired.has("booking") && (s.beats.has("toothpaste") || since(s, "ad") > 25),
    notify: { app: "mail", title: "ParcelPal Support", body: "your mint. order is waiting · action needed", target: "parcel" },
    done: (s) => s.beats.has("phishing"),
  },
  {
    id: "call",
    delay: 2,
    when: (s) => s.settled && (s.beats.has("phishing") || s.beats.size >= 4 || since(s, "mail") > 35),
    call: true,
    done: (s) => s.flags.has("callDone"),
  },
  {
    id: "work",
    delay: 3,
    when: (s) => s.flags.has("callDone"),
    notify: { app: "mail", title: "IT Service Desk", body: "your work password expires today · action needed", target: "work" },
    done: (s) => s.flags.has("workDone"),
  },
  {
    id: "circle",
    delay: 15,
    when: (s) => s.fired.has("work"),
    notify: { app: "circle", title: "family circle", body: "your kid left school · moving" },
    done: (s) => s.beats.has("location"),
  },
  {
    id: "photos",
    delay: 10,
    when: (s) => s.fired.has("circle"),
    notify: { app: "chats", title: "family 🏠", body: "kid: did u see what someone made from ur party pic??", target: "family" },
    done: (s) => s.beats.has("deepfake"),
  },
  {
    id: "you",
    delay: 5,
    when: (s) => s.fired.has("photos"),
    notify: { app: "you", title: "you", body: "your profile is ready. we think you’ll like it." },
    done: (s) => s.beats.has("wrapped"),
  },
  {
    id: "settings",
    delay: 3,
    when: (s) => s.beats.has("wrapped") || since(s, "you") > 30,
    notify: { app: "settings", title: "settings", body: "you still have options." },
  },
];

/** The task that has been sent but not finished yet, if any. */
export const pendingTask = (s: Pick<Story, "flags" | "beats" | "fired">) =>
  timeline.find((event) => s.fired.has(event.id) && event.done !== undefined && !event.done(s));
