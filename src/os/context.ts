import { createContext, useContext } from "react";
import type { TipId } from "../content/annotations";
import type { AppId, Flag } from "../content/timeline";

export type Note = { id: string; app: AppId; title: string; generic?: string; body: string; target?: string; read: boolean };

export type CallOutcome = "sent" | "safe" | "callback" | "ended" | "declined";

export type PhoneTheme = "dark" | "light" | "pink" | "blue";

export type OSApi = {
  tip: (id: TipId, el: HTMLElement | null) => void;
  open: (app: AppId, target?: string, from?: HTMLElement | null) => void;
  home: () => void;
  setFlag: (flag: Flag) => void;
  flags: Set<Flag>;
  fired: Map<string, number>;
  beats: Set<TipId>;
  target?: string;
  streamer: boolean;
  setStreamer: (on: boolean) => void;
  interests: string[];
  addInterest: (interest: string) => void;
  caller: "mum" | "brother";
  callOutcome: CallOutcome | null;
  theme: PhoneTheme;
  setTheme: (theme: PhoneTheme) => void;
  /** The phone owner's first name, shown instead of sam. */
  owner: string;
  setOwner: (name: string) => void;
  /** Visible name, or a generic label in streamer mode. */
  name: (real: string, generic: string) => string;
};

export const OSContext = createContext<OSApi | null>(null);

export function useOS(): OSApi {
  const os = useContext(OSContext);
  if (!os) throw new Error("useOS must be used inside the phone");
  return os;
}
