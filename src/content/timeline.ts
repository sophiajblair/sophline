import type { TipId } from "./annotations";

export type AppId =
  | "loop"
  | "chats"
  | "porch"
  | "mail"
  | "phone"
  | "circle"
  | "photos"
  | "mira"
  | "you"
  | "settings"
  | "receipts";

export type Flag = "awake" | "chatReplied" | "adSeen" | "callDone" | "callDeclined" | "night";

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
    id: "chat",
    delay: 1.4,
    when: () => true,
    notify: { app: "chats", title: "other half ♥", body: "we need toothpaste", target: "other" },
  },
  {
    id: "porch",
    delay: 2.6,
    when: (s) => s.fired.has("chat"),
    notify: { app: "porch", title: "front door", body: "person detected · live now" },
  },
  {
    id: "loop",
    delay: 7,
    when: (s) => s.flags.has("awake"),
    notify: { app: "loop", title: "loop", body: "3 new videos picked just for u" },
  },
  {
    id: "ad",
    delay: 2.5,
    when: (s) => s.flags.has("chatReplied") || s.sinceWake > 60,
    notify: { app: "loop", title: "sponsored", body: "mint. — the paste that knows you", target: "ad" },
    setsFlag: "adSeen",
  },
  {
    id: "mail",
    delay: 3,
    when: (s) => s.beats.has("toothpaste") || since(s, "ad") > 25,
    notify: { app: "mail", title: "ParcelPal Support", body: "your mint. order is waiting · action needed", target: "parcel" },
  },
  {
    id: "call",
    delay: 2,
    when: (s) => s.settled && (s.beats.has("phishing") || s.beats.size >= 4 || since(s, "mail") > 35),
    call: true,
  },
  {
    id: "work",
    delay: 3,
    when: (s) => s.flags.has("callDone"),
    notify: { app: "mail", title: "IT Service Desk", body: "your work password expires today · action needed", target: "work" },
  },
  {
    id: "circle",
    delay: 15,
    when: (s) => s.fired.has("work"),
    notify: { app: "circle", title: "family circle", body: "your kid left school · moving" },
  },
  {
    id: "photos",
    delay: 10,
    when: (s) => s.fired.has("circle"),
    notify: { app: "chats", title: "family 🏠", body: "kid: did u see what someone made from ur party pic??", target: "family" },
  },
  {
    id: "mira",
    delay: 6,
    when: (s) => s.beats.size >= 6 || since(s, "photos") > 20,
    notify: { app: "mira", title: "mira ✦", body: "you up? i missed you." },
    setsFlag: "night",
  },
  {
    id: "you",
    delay: 5,
    when: (s) => s.beats.size >= 8 || since(s, "mira") > 25,
    notify: { app: "you", title: "you", body: "your profile is ready. we think you’ll like it." },
  },
  {
    id: "settings",
    delay: 3,
    when: (s) => s.beats.has("wrapped") || since(s, "you") > 30,
    notify: { app: "settings", title: "settings", body: "you still have options." },
  },
];
