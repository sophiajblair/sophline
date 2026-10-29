import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { TipId } from "./content/annotations";
import { timeline, type AppId, type Flag, type Story } from "./content/timeline";
import { Chats } from "./apps/Chats";
import { Circle } from "./apps/Circle";
import { Loop } from "./apps/Loop";
import { Mail } from "./apps/Mail";
import { Mira } from "./apps/Mira";
import { PhoneApp } from "./apps/PhoneApp";
import { Photos } from "./apps/Photos";
import { Porch } from "./apps/Porch";
import { ReceiptsApp } from "./apps/ReceiptsApp";
import { Settings } from "./apps/Settings";
import { You } from "./apps/You";
import { Banners } from "./os/Banners";
import { CallOverlay } from "./os/CallOverlay";
import { OSContext, type CallOutcome, type Note, type OSApi } from "./os/context";
import { guide } from "./os/guide";
import { HomeScreen } from "./os/HomeScreen";
import { Intro } from "./os/Intro";
import { LockScreen, WatchingEye } from "./os/LockScreen";
import { StatusBar } from "./os/StatusBar";
import { TipLayer, type Tip } from "./os/TipLayer";
import { PHONE_H, PHONE_W, PixelPhone } from "./phone/PixelPhone";
import { appMeta } from "./pixel/icons";

type Screen = "off" | "lock" | "home" | AppId;

const apps: Record<AppId, () => React.ReactElement> = {
  loop: Loop,
  chats: Chats,
  porch: Porch,
  mail: Mail,
  phone: PhoneApp,
  circle: Circle,
  photos: Photos,
  mira: Mira,
  you: You,
  settings: Settings,
  receipts: ReceiptsApp,
};

const caller: "mum" | "brother" = (() => {
  const asked = new URLSearchParams(window.location.search).get("caller");
  if (asked === "mum" || asked === "brother") return asked;
  return Math.random() < 0.5 ? "mum" : "brother";
})();

const loadedAt = performance.now();
const elapsed = () => performance.now() - loadedAt;
const MIN_GAP = 3000;
const IDLE_NUDGE = 14000;
const BANNER_MS = 5200;

function measure() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = vw < 640 ? Math.min((vh - 16) / PHONE_H, (vw - 16) / PHONE_W) : Math.min((vh - 96) / PHONE_H, (vw * 0.4) / PHONE_W, 1);
  return { scale, left: Math.round((vw - PHONE_W * scale) / 2), top: Math.round((vh - PHONE_H * scale) / 2) };
}

function usePhonePlacement() {
  const [placement, setPlacement] = useState(measure);
  useEffect(() => {
    const onResize = () => setPlacement(measure());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return placement;
}

function clock(minutes: number, night: boolean) {
  if (night) return "02:07";
  const total = 9 * 60 + 41 + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const isApp = (screen: Screen): screen is AppId => screen !== "off" && screen !== "lock" && screen !== "home";

export default function App() {
  const placement = usePhonePlacement();
  const [screen, setScreen] = useState<Screen>("off");
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [target, setTarget] = useState<string | undefined>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [banners, setBanners] = useState<string[]>([]);
  const [fired, setFired] = useState<Map<string, number>>(() => new Map());
  const [flags, setFlags] = useState<Set<Flag>>(() => new Set());
  const [beats, setBeats] = useState<Set<TipId>>(() => new Set());
  const [calling, setCalling] = useState(false);
  const [callOutcome, setCallOutcome] = useState<CallOutcome | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [streamer, setStreamer] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [glow, setGlow] = useState(0);
  const [nudge, setNudge] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [visitTips, setVisitTips] = useState(0);

  const screenRef = useRef<HTMLDivElement>(null);
  const appLayerRef = useRef<HTMLDivElement>(null);
  const tipCount = useRef(0);
  const eligible = useRef(new Map<string, number>());
  const lastFire = useRef(-MIN_GAP);
  const lastInput = useRef(0);
  const awakeAt = useRef<number | null>(null);
  const live = useRef({ screen, fired, flags, beats, calling, notes, tipOpen: tip !== null });
  useEffect(() => {
    live.current = { screen, fired, flags, beats, calling, notes, tipOpen: tip !== null };
  });

  const addFlag = useCallback((flag: Flag) => {
    if (flag === "awake" && awakeAt.current === null) awakeAt.current = elapsed();
    setFlags((prev) => (prev.has(flag) ? prev : new Set(prev).add(flag)));
  }, []);

  const pushNote = useCallback((note: Omit<Note, "read">) => {
    setNotes((prev) => [...prev, { ...note, read: false }]);
    setAnnouncement(`new notification from ${appMeta[note.app].label}: ${note.title}, ${note.body}`);
    setGlow((n) => n + 1);
    const current = live.current.screen;
    if (current === "off") setScreen("lock");
    else if (current !== "lock") {
      setBanners((prev) => [...prev, note.id]);
      setTimeout(() => setBanners((prev) => prev.filter((id) => id !== note.id)), BANNER_MS);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = elapsed();
      setMinutes(Math.floor(now / 20000));
      const { screen, fired, flags, beats, calling, notes, tipOpen } = live.current;
      if (calling || screen === "off") return;
      const story: Story = {
        beats,
        fired,
        flags,
        sinceLoad: now / 1000,
        settled: !tipOpen && (screen === "home" || screen === "lock"),
        sinceWake: awakeAt.current === null ? 0 : (now - awakeAt.current) / 1000,
      };
      for (const event of timeline) {
        if (fired.has(event.id)) continue;
        if (!event.when(story)) {
          eligible.current.delete(event.id);
          continue;
        }
        if (!eligible.current.has(event.id)) eligible.current.set(event.id, now);
        const ready = now - (eligible.current.get(event.id) ?? now) >= event.delay * 1000;
        if (!ready || now - lastFire.current < MIN_GAP) continue;
        lastFire.current = now;
        live.current = { ...live.current, fired: new Map(fired).set(event.id, now) };
        setFired((prev) => new Map(prev).set(event.id, now));
        if (event.setsFlag) addFlag(event.setsFlag);
        if (event.notify) pushNote({ id: event.id, ...event.notify });
        if (event.call) {
          setTip(null);
          setCalling(true);
          setGlow((n) => n + 1);
          setAnnouncement("incoming call");
        }
        return;
      }
      const unread = notes.some((note) => !note.read);
      if (unread && now - Math.max(lastInput.current, lastFire.current) > IDLE_NUDGE) {
        lastInput.current = now;
        setNudge((n) => n + 1);
        setGlow((n) => n + 1);
      }
    };
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [addFlag, pushNote]);

  useEffect(() => {
    const onInput = () => {
      lastInput.current = elapsed();
    };
    window.addEventListener("pointerdown", onInput);
    window.addEventListener("keydown", onInput);
    return () => {
      window.removeEventListener("pointerdown", onInput);
      window.removeEventListener("keydown", onInput);
    };
  }, []);

  const closeTip = useCallback(() => {
    if (tip?.el?.isConnected) tip.el.focus({ preventScroll: true });
    setTip(null);
  }, [tip]);

  const open = useCallback(
    (app: AppId, nextTarget?: string, from?: HTMLElement | null) => {
      const screenEl = screenRef.current;
      if (from && screenEl) {
        const s = screenEl.getBoundingClientRect();
        const f = from.getBoundingClientRect();
        setOrigin({ x: ((f.left + f.width / 2 - s.left) / s.width) * 100, y: ((f.top + f.height / 2 - s.top) / s.height) * 100 });
      }
      addFlag("awake");
      setTip(null);
      setVisitTips(0);
      setTarget(nextTarget);
      setScreen(app);
      setNotes((prev) => (prev.some((n) => n.app === app && !n.read) ? prev.map((n) => (n.app === app ? { ...n, read: true } : n)) : prev));
      setBanners((prev) => prev.filter((id) => live.current.notes.find((n) => n.id === id)?.app !== app));
    },
    [addFlag],
  );

  const home = useCallback(() => {
    setTip(null);
    setScreen((current) => (current === "off" || current === "lock" ? current : "home"));
  }, []);

  const unlock = () => {
    addFlag("awake");
    setOrigin({ x: 50, y: 100 });
    setScreen("home");
  };

  const finishCall = (outcome: CallOutcome) => {
    setCalling(false);
    setCallOutcome(outcome);
    addFlag("callDone");
    if (outcome === "declined") {
      addFlag("callDeclined");
      const who = caller === "brother" ? (streamer ? "sibling" : "ollie") : streamer ? "parent" : "mum";
      setTimeout(() => pushNote({ id: "voicemail", app: "phone", title: `${who} · voicemail`, body: "0:21 · “please pick up…” · transcript ready" }), 1200);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (tip) closeTip();
      else if (!calling) home();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tip, calling, closeTip, home]);

  useEffect(() => {
    if (isApp(screen)) appLayerRef.current?.focus({ preventScroll: true });
  }, [screen]);

  const os: OSApi = {
    tip: (id, el) => {
      tipCount.current += 1;
      setTip({ id, el, n: tipCount.current });
      setVisitTips((n) => n + 1);
      setBeats((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    },
    open,
    home,
    setFlag: addFlag,
    flags,
    fired,
    beats,
    target,
    streamer,
    setStreamer,
    interests,
    addInterest: (interest) => setInterests((prev) => (prev.includes(interest) ? prev : [...prev, interest])),
    caller,
    callOutcome,
    name: (real, generic) => (streamer ? generic : real),
  };

  const badges: Partial<Record<AppId, number>> = {};
  for (const note of notes) if (!note.read) badges[note.app] = (badges[note.app] ?? 0) + 1;
  const unread = notes.some((note) => !note.read);
  const next = notes.find((note) => !note.read)?.app;
  const hint = guide({ screen, calling, tipOpen: tip !== null, unread, next, visitTips, finished: fired.has("settings") && !unread });
  const alert = calling || unread;
  const night = flags.has("night");
  const time = clock(minutes, night);
  const ActiveApp = isApp(screen) ? apps[screen] : null;
  const bannerNotes = banners.map((id) => notes.find((n) => n.id === id)).filter((n): n is Note => Boolean(n));

  return (
    <MotionConfig reducedMotion="user">
      <OSContext.Provider value={os}>
        <div className={`world${alert ? " is-alert" : ""}${night ? " is-night" : ""}`}>
          <div className="world-eyes" aria-hidden="true">
            <span className="w-eye e1">
              <WatchingEye px={4} alert={alert} />
            </span>
            <span className="w-eye e2">
              <WatchingEye px={3} alert={alert} />
            </span>
            <span className="w-eye e3">
              <WatchingEye px={5} alert={alert} />
            </span>
            <span className="w-eye e4">
              <WatchingEye px={3} alert={alert} />
            </span>
          </div>
          <header className="world-header">
            <p className="wordmark">
              for you, forever<span>a phone that isn’t yours</span>
            </p>
            <button className={`streamer-toggle${streamer ? " is-on" : ""}`} aria-pressed={streamer} onClick={() => setStreamer(!streamer)}>
              streamer mode {streamer ? "on" : "off"}
            </button>
          </header>
          <p className="ambient ambient-left" aria-hidden="true">
            nothing leaves this browser · no analytics · no cookies
          </p>
          <p className="ambient ambient-right" aria-hidden="true">
            esc = home · {beats.size}/10 noticed
          </p>
          <p className="guide-line" aria-live="polite">
            <span aria-hidden="true">▸</span> {hint}
          </p>

          <div
            className="phone-stage"
            style={{ left: placement.left, top: placement.top, width: PHONE_W, height: PHONE_H, transform: `scale(${placement.scale})` }}
            aria-label="a phone that isn’t yours. tap things on its screen."
            role="region"
          >
            <PixelPhone ref={screenRef} alert={alert} night={night}>
              {screen === "off" ? (
                <Intro streamer={streamer} onStart={() => setScreen("lock")} />
              ) : (
                <>
                  <StatusBar time={time} watched={beats.size} />
                  <div className="screen-body">
                    {screen !== "lock" && <HomeScreen badges={badges} watched={beats.size} nudge={nudge} next={next} hint={hint} onOpen={(app, el) => open(app, undefined, el)} />}
                    <AnimatePresence>
                      {ActiveApp && (
                        <motion.div
                          key={screen}
                          ref={appLayerRef}
                          tabIndex={-1}
                          className="app-layer"
                          style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
                          initial={{ scale: 0.12, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.12, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 380, damping: 36 }}
                        >
                          <ActiveApp />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {screen === "lock" && <LockScreen time={time} notes={notes} onOpen={(app, t, el) => open(app, t, el)} onUnlock={unlock} />}
                    </AnimatePresence>
                    {screen !== "lock" && <Banners banners={bannerNotes} onOpen={(app, t, el) => open(app, t, el)} onDismiss={(id) => setBanners((prev) => prev.filter((b) => b !== id))} />}
                  </div>
                </>
              )}
              <AnimatePresence>{calling && <CallOverlay onDone={finishCall} />}</AnimatePresence>
              <AnimatePresence>
                {glow > 0 && (
                  <motion.div
                    key={glow}
                    className="screen-glow"
                    aria-hidden="true"
                    initial={{ opacity: 0.85 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>
            </PixelPhone>
          </div>

          <TipLayer tip={tip} phoneRef={screenRef} onClose={closeTip} />
          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
        </div>
      </OSContext.Provider>
    </MotionConfig>
  );
}
