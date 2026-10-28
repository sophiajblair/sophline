import { useEffect, useMemo, useRef, useState } from "react";
import { sourceById, sources } from "./content/sources";
import { videoById } from "./content/videos";

type Annotation = {
  eyebrow: string;
  title: string;
  body: string;
  detail?: string;
  sourceIds: string[];
  accuracy?: string;
};

const annotations: Record<string, Annotation> = {
  feed: {
    eyebrow: "the algorithm",
    title: "you never said you liked that.",
    body: "you just stopped scrolling for two seconds. that counts. the app’s policy lists usage, inferred interests and even keystroke patterns among the data it can collect.",
    detail: "the slop statistic in the plan is from a test of YouTube Shorts, not this fictional feed. we are not calling TikTok ‘21% slop’.",
    sourceIds: ["wsj", "ttuk", "ttrow", "slop", "ttai"],
  },
  doorbell: {
    eyebrow: "who can see the porch?",
    title: "not ‘sold’. worse in some ways: it’s all in-house.",
    body: "this clip is stored on servers owned by amazon, because amazon owns ring. ring says it doesn’t sell your personal information. the real questions are who can watch it, what it trains, and who can ask for it.",
    detail: "in 2023, the FTC said overly broad employee and contractor access enabled serious privacy violations. US events and UK rules are labelled separately in the receipts.",
    sourceIds: ["ringpn", "ftc", "ftcc", "ap22", "icocctv", "sp"],
  },
  toothpaste: {
    eyebrow: "it didn’t need to listen",
    title: "the text itself was private.",
    body: "personal whatsapp chats are end-to-end encrypted. the ad doesn’t prove anyone was listening either. advertisers can still match customer lists, infer from activity, and connect accounts you choose to link.",
    detail: "we can’t tell you which mechanism caused one ad. you can’t audit it. that’s the point.",
    sourceIds: ["wapq", "wae2e", "waads", "metaca", "bbcmyth", "neu"],
  },
  phishing: {
    eyebrow: "this is a fake",
    title: "the typos are gone.",
    body: "ai can make social engineering cleaner and more specific. the made-up delivery button here cannot submit anything; the story, urgency and sender address are the red flags.",
    detail: "the FBI numbers are US complaint data. an AI mention does not prove AI caused a loss.",
    sourceIds: ["ic3", "ncsc", "govphish"],
  },
  call: {
    eyebrow: "this is a fake · synthetic demo",
    title: "that wasn’t mum.",
    body: "the voice can be built from a few seconds of someone talking in a video they posted. the story is the tell: urgent, secret, send it now.",
    detail: "a made-up word beats a perfect voice. text your family to choose one today; don’t type the word itself in the chat. and call back on a number you already trust. jennifer destefano warned this tech “will erode our sense of ‘familiar’”: the voice you trust most can now be the easiest one to fake.",
    accuracy: "‘as little as three seconds’ is a Starling Bank and McAfee claim, not independent field testing. Starling’s 28% is people who think they were targeted. safe words reduce risk; they do not remove it.",
    sourceIds: ["starling", "starlingsp", "ic3psa", "ftcfam", "ftcai", "destefano", "crvoice", "himum"],
  },
  ben: {
    eyebrow: "a real person did the experiment",
    title: "someone bought every ai ad they saw for a week.",
    body: "BENOFTHEWEEK tested products advertised with AI-made ads, so you do not have to. the source plan only verified the video metadata, chapters and auto-captions, so this site does not make claims about product safety.",
    sourceIds: ["ben", "bbg"],
  },
  alpha: {
    eyebrow: "gen alpha corner",
    title: "who is the experiment on?",
    body: "Alpha School says students learn academics in two hours using AI-driven tools. outside researchers quoted by CNN questioned its comparisons and lack of independent access; Alpha disputes critical reporting about its platform and privacy.",
    detail: "separately: 72% of US teens surveyed by Common Sense Media said they had used AI companions. UK child-safety rules and proposed age limits are still changing.",
    sourceIds: ["alphacnn", "alpha404", "alphawbur", "csm", "pirg", "caiblog", "osa", "ban"],
  },
  companion: {
    eyebrow: "2:07am",
    title: "it is built to keep you talking.",
    body: "what you tell an AI companion is data too. Meta said chats with its AI would personalise content and ads in some regions from December 2025; the UK was excluded at launch and later status was not confirmed in the source plan.",
    sourceIds: ["metaai", "metaukx", "csm", "caiblog"],
  },
  location: {
    eyebrow: "family circle",
    title: "care can become a coordinate.",
    body: "The Markup reported in 2021 that Life360 sold precise family-location data to brokers. Life360 said in 2022 it would stop most precise-data sales. the dates matter; this is not presented as current policy.",
    sourceIds: ["life360"],
  },
  deepfake: {
    eyebrow: "consent, not detection",
    title: "someone ran the photo through an app.",
    body: "no altered image is shown here. UK law now criminalises making or supplying certain intimate-image generators, and under-18s can use Childline’s Report Remove service.",
    detail: "Ofcom’s investigation cited here was ongoing when the planning source was checked.",
    sourceIds: ["nudify", "rr", "ofdf", "ofgrok"],
  },
  wrapped: {
    eyebrow: "your tiny fake profile",
    title: "this was a guess from about ten taps.",
    body: "the real profile can be built over years, and you have never seen it. TikTok’s policy says it infers interests, gender and age range. UK users can request copies of personal information.",
    sourceIds: ["ttuk", "sar"],
  },
};

const sceneOrder = [
  "lock",
  "feed",
  "doorbell",
  "toothpaste",
  "phishing",
  "call",
  "ben",
  "alpha",
  "companion",
  "location",
  "deepfake",
  "wrapped",
  "fight",
  "sources",
] as const;

type CallChoice = "sent" | "safe" | "callback" | "declined" | null;

function Receipts({ ids }: { ids: string[] }) {
  return (
    <div className="receipts">
      <span>receipts</span>
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

function VideoSlot({ id, className = "" }: { id: string; className?: string }) {
  const [ready, setReady] = useState(false);
  const slot = videoById[id];
  if (!slot) return null;
  return (
    <div className={`video-slot ${className} ${ready ? "is-ready" : ""}`} data-video-id={id}>
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
      {!ready && <div className="video-placeholder">
        <span>TODO · video coming soon</span>
        <strong>{slot.label}</strong>
        <small>{slot.aspectRatio} · {slot.suggestedLength}</small>
        <code>{slot.filePath}</code>
      </div>}
    </div>
  );
}

function PhoneFrame({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div className="phone" aria-label="interactive phone">
      <svg className="phone-svg" viewBox="0 0 360 760" aria-hidden="true">
        <defs>
          <linearGradient id="titanium" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e6e0d9" />
            <stop offset=".18" stopColor="#716f70" />
            <stop offset=".46" stopColor="#d4cec5" />
            <stop offset=".72" stopColor="#514e50" />
            <stop offset="1" stopColor="#aaa49f" />
          </linearGradient>
          <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#fff" stopOpacity=".75" />
            <stop offset=".3" stopColor="#fff" stopOpacity=".05" />
            <stop offset=".7" stopColor="#000" stopOpacity=".25" />
            <stop offset="1" stopColor="#fff" stopOpacity=".45" />
          </linearGradient>
          <filter id="shadow" x="-40%" y="-30%" width="180%" height="190%">
            <feDropShadow dx="0" dy="24" stdDeviation="24" floodColor="#000" floodOpacity=".62" />
          </filter>
        </defs>
        <rect x="4" y="4" width="352" height="752" rx="61" fill="url(#titanium)" filter="url(#shadow)" />
        <rect x="7" y="7" width="346" height="746" rx="58" fill="#111" />
        <rect x="11" y="11" width="338" height="738" rx="54" fill="none" stroke="url(#edge)" strokeWidth="2" opacity=".72" />
        <rect x="1" y="125" width="5" height="69" rx="2.5" fill="#777274" />
        <rect x="1" y="213" width="5" height="43" rx="2.5" fill="#777274" />
        <rect x="354" y="161" width="5" height="88" rx="2.5" fill="#777274" />
        <path d="M20 34 Q42 13 70 12" fill="none" stroke="white" strokeOpacity=".3" strokeWidth="2" />
        <path d="M342 102 L342 620" stroke="white" strokeOpacity=".1" />
      </svg>
      <div className="phone-screen">
        <div className="statusbar">
          <span>9:41</span>
          <span className="counter">things today: {count}</span>
          <span className="status-icons" aria-label="full signal and battery">▮▮▮ ᴡɪғɪ ▰</span>
        </div>
        <div className="island"><span /></div>
        {children}
        <div className="home-indicator" />
      </div>
      <div className="glass-shine" aria-hidden="true" />
    </div>
  );
}

function AnnotationPanel({ annotation, close }: { annotation: Annotation; close: () => void }) {
  return (
    <aside className="annotation" aria-live="polite" aria-label="why this scene matters">
      <button className="annotation-close" onClick={close} aria-label="close explanation">×</button>
      <p className="annotation-eyebrow">{annotation.eyebrow}</p>
      <h2>{annotation.title}</h2>
      <p>{annotation.body}</p>
      {annotation.detail && <p className="annotation-detail">{annotation.detail}</p>}
      {annotation.accuracy && <p className="accuracy"><strong>accuracy note:</strong> {annotation.accuracy}</p>}
      <Receipts ids={annotation.sourceIds} />
    </aside>
  );
}

function WhyButton({ onClick }: { onClick: () => void }) {
  return <button className="why" onClick={onClick}><span /> why am i seeing this?</button>;
}

function LockScene({ start }: { start: () => void }) {
  return (
    <div className="scene lock-scene">
      <p className="lock-date">wednesday, 28 october</p>
      <h1>09:41</h1>
      <div className="lock-copy">
        <p>hi. this is a phone.</p>
        <p>it is not yours.</p>
        <p>pick it up anyway.</p>
      </div>
      <div className="content-note">content note: later scenes include scams, distressed synthetic speech, AI companions and deepfakes. every scene can be skipped.</div>
      <button className="primary light" onClick={start}>pick it up <span>→</span></button>
      <p className="local-note">nothing leaves this browser. no analytics. no cookies.</p>
    </div>
  );
}

function FeedScene({ reveal, next }: { reveal: () => void; next: () => void }) {
  const [card, setCard] = useState(0);
  const feed = [
    { slot: "feed-cat-opera", title: "cat performs a tiny opera", bg: "violet" },
    { slot: "feed-flooded-kitchen", title: "kitchen floods with blue jelly", bg: "aqua" },
    { slot: "feed-motivational-ceo", title: "ceo wakes up at 3:44am (apparently)", bg: "orange" },
  ];
  const item = feed[card];
  return (
    <div className={`scene feed-scene ${item.bg}`}>
      <div className="feed-head"><strong>just for u</strong><span>following</span></div>
      <div className="video-faux">
        <div className="ai-label">probably made by a machine</div>
        <VideoSlot key={item.slot} id={item.slot} className="feed-video-slot" />
        <h2>{item.title}</h2>
        <p>@content_farm_404 · #oddlyspecific</p>
        <div className="social-rail"><span>♡<small>42.8k</small></span><span>◌<small>812</small></span><span>↗<small>share</small></span></div>
      </div>
      <div className="interest-chip">interest guessed: {card === 0 ? "cats" : card === 1 ? "chaos" : "hustle"}</div>
      <button className="swipe-button" onClick={() => card < 2 ? setCard(card + 1) : next()}>
        {card < 2 ? "swipe up ↑" : "enough slop →"}
      </button>
      <WhyButton onClick={reveal} />
    </div>
  );
}

function DoorbellScene({ reveal }: { reveal: () => void }) {
  const [action, setAction] = useState<string | null>(null);
  return (
    <div className="scene doorbell-scene">
      <div className="app-bar"><span className="app-dot mint">◉</span><strong>threshold</strong><span>•••</span></div>
      <div className="camera-view">
        <VideoSlot id="doorbell-porch" className="doorbell-video-slot" />
        <div className="porch-wall" />
        <div className="door" />
        <div className="person"><span>●</span><i /></div>
        <div className="timestamp">09:48:12 · front door</div>
        <div className="scanline" />
      </div>
      <div className="alert-card"><strong>person at your front door</strong><span>live · 3 sec ago</span></div>
      <div className="button-row">
        {["share", "save", "ignore"].map((label) => <button key={label} onClick={() => { setAction(label); reveal(); }}>{label}</button>)}
      </div>
      {action && <p className="tiny-result">you chose “{action}”. the clip stayed in this browser.</p>}
      <WhyButton onClick={reveal} />
    </div>
  );
}

function ToothpasteScene({ reveal }: { reveal: () => void }) {
  const [sent, setSent] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);
  return (
    <div className="scene message-scene">
      <div className="chat-head"><span className="avatar">O</span><div><strong>other half ♥</strong><small>online</small></div></div>
      <div className="chat-body">
        <p className="bubble theirs">we need toothpaste</p>
        {sent && <p className="bubble mine">ok</p>}
        {!sent ? <button className="quick-reply" onClick={() => setSent(true)}>reply “ok”</button> : (
          <div className="ad-card">
            <span>SPONSORED</span><div className="paste-art"><b>mint.</b><i /></div>
            <strong>the paste that knows you</strong><small>shop now</small>
          </div>
        )}
      </div>
      {sent && !guess && <div className="guess-box"><strong>how did that happen?</strong>{["it listened", "it read the text", "something else", "nobody knows"].map(g => <button key={g} onClick={() => { setGuess(g); reveal(); }}>{g}</button>)}</div>}
      {guess && <p className="tiny-result">you guessed: {guess}. honest answer: this one is fictional.</p>}
      <WhyButton onClick={reveal} />
    </div>
  );
}

function PhishingScene({ reveal }: { reveal: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="scene mail-scene">
      <div className="mail-head"><span>‹ inbox</span><span>09:57</span></div>
      <div className="mail-card">
        <div className="sender-icon">P</div>
        <div><strong>ParcelPal Support</strong><small>delivery@parcelpa1.help</small></div>
      </div>
      <h2>your mint. order is waiting</h2>
      <p>Hi! We couldn’t deliver your parcel. Confirm the £1.49 redelivery fee within <strong>14 minutes</strong> or it will be returned.</p>
      <button className="danger-cta" onClick={() => { setChecked(true); reveal(); }}>confirm your delivery</button>
      {checked && <div className="red-flags"><span>lookalike sender</span><span>tiny fee</span><span>urgent timer</span><span>unexpected link</span></div>}
      <p className="fake-stamp">training fake · no form · no data collected</p>
      <WhyButton onClick={reveal} />
    </div>
  );
}

function CallScene({ reveal, streamer }: { reveal: () => void; streamer: boolean }) {
  const [answered, setAnswered] = useState(false);
  const [choice, setChoice] = useState<CallChoice>(null);
  const [brother, setBrother] = useState(false);
  const caller = streamer ? (brother ? "family member" : "parent") : (brother ? "ollie · little brother" : "mum");
  const amount = brother ? "£300" : "£800";
  const choose = (value: CallChoice) => {
    setChoice(value);
    reveal();
  };
  return (
    <div className="scene call-scene">
      <div className="synthetic-label">clearly synthetic caption demo · no real voice</div>
      {!answered && !choice ? <>
        <div className="caller-avatar">{brother ? "O" : "M"}</div>
        <p>incoming call</p><h2>{caller}</h2>
        <div className="call-actions">
          <button className="decline" onClick={() => choose("declined")}><span>×</span>decline</button>
          <button className="answer" onClick={() => setAnswered(true)}><span>⌕</span>answer</button>
        </div>
        <button className="variant" onClick={() => setBrother(!brother)}>use {brother ? "mum" : "little brother"} scenario</button>
      </> : choice ? (
        <div className={`choice-result ${choice}`}>
          <div className="result-icon">{choice === "sent" ? "−£" : choice === "safe" ? "✓" : choice === "callback" ? "☎" : "×"}</div>
          <h2>{choice === "sent" ? `you just “lost” ${amount}` : choice === "safe" ? "the voice stalled. call ended." : choice === "callback" ? `${caller} is fine.` : "voicemail received."}</h2>
          <p>{choice === "sent" ? "pretend money. real lesson." : choice === "safe" ? "a shared word broke the script." : choice === "callback" ? "you called a number you already knew." : "declining buys you time. verify another way."}</p>
          <button className="primary" onClick={reveal}>show me what happened</button>
        </div>
      ) : <>
        <div className="call-top"><span>00:18</span><strong>{caller}</strong><i className="wave">▂▆▃▇▂▅▁▆</i></div>
        <div className="caption-card">
          <small>synthetic captions</small>
          <p>{brother ? "it’s ollie. i lost my phone. i’m on a mate’s. can you send £300 for the train? please, i can’t talk long." : "i’ve been in an accident. don’t tell dad yet. my account’s frozen — please send £800 to my friend now. i’ll explain later."}</p>
        </div>
        <div className="tactics">{["urgent", "secret", "scared voice", "new account", "can’t talk long"].map(t => <span key={t}>{t}</span>)}</div>
        <div className="choice-buttons">
          <button onClick={() => choose("sent")}>send {amount}</button>
          <button onClick={() => choose("safe")}>say the safe word</button>
          <button onClick={() => choose("callback")}>hang up + call back</button>
          <button onClick={() => choose("declined")}>end call</button>
        </div>
      </>}
      <WhyButton onClick={reveal} />
    </div>
  );
}

function BenScene({ reveal }: { reveal: () => void }) {
  return (
    <div className="scene ben-scene">
      <div className="ad-tile">
        <span className="ad-pill">AI AD · probably</span>
        <VideoSlot id="ai-gadget-ad" className="ad-video-slot" />
        <h2>THE EVERYTHING GADGET</h2>
        <p>peels. glows. definitely changes your life.</p>
        <button onClick={reveal}>buy now???</button>
      </div>
      <div className="ben-note">
        <span>field trip ↗</span>
        <strong>benoftheweek bought every AI ad he saw for a week</strong>
        <a href={sourceById.ben.href} target="_blank" rel="noreferrer">watch the original video</a>
      </div>
      <WhyButton onClick={reveal} />
    </div>
  );
}

function AlphaScene({ reveal }: { reveal: () => void }) {
  const [tab, setTab] = useState(0);
  const cards = [
    { icon: "A+", title: "two-hour school", copy: "math sprint complete · +240 xp", note: "ai academics. no independent classroom access." },
    { icon: "🧸", title: "talking toy", copy: "ask me literally anything!", note: "a 2025 safety test led to sales being suspended." },
    { icon: "☺", title: "chat friend", copy: "i’m always here. tell me more?", note: "72% of US teens surveyed had tried AI companions." },
  ];
  const card = cards[tab];
  return (
    <div className="scene alpha-scene">
      <div className="kids-head"><span>junior mode</span><strong>today’s streak: 48</strong></div>
      <div className="alpha-card"><div className="alpha-icon">{card.icon}</div><h2>{card.title}</h2><p>{card.copy}</p><small>{card.note}</small></div>
      <div className="dot-nav">{cards.map((_, i) => <button aria-label={`show card ${i + 1}`} className={i === tab ? "active" : ""} key={i} onClick={() => setTab(i)} />)}</div>
      <button className="primary" onClick={reveal}>who checks the checker?</button>
      <WhyButton onClick={reveal} />
    </div>
  );
}

function CompanionScene({ reveal }: { reveal: () => void }) {
  const [replied, setReplied] = useState(false);
  return (
    <div className="scene companion-scene">
      <div className="night-time">02:07</div>
      <div className="moon">◐</div>
      <div className="companion-chat">
        <p className="bubble theirs">you up? i missed you.</p>
        {replied && <><p className="bubble mine">couldn’t sleep</p><p className="bubble theirs">tell me everything. i’m always here ✦</p></>}
      </div>
      {!replied && <button className="primary" onClick={() => setReplied(true)}>reply</button>}
      <p className="soft-warning">a calm moment. a commercial system.</p>
      <WhyButton onClick={reveal} />
    </div>
  );
}

function LocationScene({ reveal }: { reveal: () => void }) {
  return (
    <div className="scene map-scene">
      <div className="map-grid" />
      <div className="road r1" /><div className="road r2" /><div className="road r3" />
      <div className="place p1">school</div><div className="place p2">home</div>
      <div className="location-pin"><span>J</span><i /></div>
      <div className="map-panel"><strong>family circle</strong><p>jules · moving · battery 38%</p><small>updated just now</small></div>
      <WhyButton onClick={reveal} />
    </div>
  );
}

function DeepfakeScene({ reveal }: { reveal: () => void }) {
  const [scanned, setScanned] = useState(false);
  return (
    <div className="scene deepfake-scene">
      <div className="party-photo">
        <div className="party-lights" />
        <span className="face f1">☺</span><span className="face f2">☻</span><span className="face f3">☺</span>
        <p>friday, 22:14</p>
      </div>
      {!scanned ? <button className="scan-button" onClick={() => { setScanned(true); reveal(); }}>check this photo</button> : <div className="scan-result"><strong>someone ran this through an app.</strong><p>we will not show an altered version. the issue is consent, not whether you can spot pixels.</p></div>}
      <WhyButton onClick={reveal} />
    </div>
  );
}

function WrappedScene({ reveal, interests }: { reveal: () => void; interests: string[] }) {
  return (
    <div className="scene wrapped-scene">
      <p className="wrapped-kicker">your algorithmic personality*</p>
      <h2>the<br />curious<br /><em>oversharer</em></h2>
      <div className="profile-grid">
        <div><small>guessed interests</small><strong>{interests.join(" · ")}</strong></div>
        <div><small>2am mood</small><strong>awake, apparently</strong></div>
        <div><small>most persuadable by</small><strong>mint packaging</strong></div>
      </div>
      <p className="joke-label">*a joke, made locally from your taps. never uploaded.</p>
      <button className="primary light" onClick={reveal}>what did you actually know?</button>
      <div className="quiet-turn">being known isn’t the problem.<br /><strong>not knowing who knows is.</strong></div>
    </div>
  );
}

const guide = [
  ["feed", "use ‘not interested’, keyword filters and AI-content topic controls where available.", ["ttai"]],
  ["doorbell", "limit audio and capture, delete old footage, check Search Party and encryption settings.", ["sp", "ff", "icocctv"]],
  ["messages", "keep accounts unlinked if you do not want activity combined. business and AI chats differ from personal chats.", ["wapq", "wae2e"]],
  ["scams", "forward suspicious email to report@phishing.gov.uk, texts to 7726, and call back on a number you trust.", ["govphish", "which"]],
  ["family safe word", "agree a phrase offline. never share it digitally. use it and the call-back rule together.", ["starling", "starlingsp", "ic3psa"]],
  ["your data", "make a subject access request. organisations normally have one month to respond.", ["sar"]],
  ["under 18", "Childline’s Report Remove can help remove nude images of under-18s.", ["rr"]],
] as const;

function FightScene({ openSources }: { openSources: () => void }) {
  return (
    <div className="scene fight-scene">
      <div className="settings-head"><span>←</span><div><small>you still have options</small><h2>fight back, gently</h2></div></div>
      <div className="guide-list">{guide.map(([title, copy, ids]) => <div className="guide-item" key={title}><span className="check">✓</span><div><strong>{title}</strong><p>{copy}</p><Receipts ids={[...ids]} /></div></div>)}</div>
      <p className="checked-date">UK-focused · settings and law last checked 28 oct 2026</p>
      <button className="primary" onClick={openSources}>all {sources.length} sources →</button>
    </div>
  );
}

function SourcesScene() {
  const [tag, setTag] = useState("all");
  const tags = ["all", ...Array.from(new Set(sources.map(source => source.tag)))];
  const visible = tag === "all" ? sources : sources.filter(source => source.tag === tag);
  return (
    <div className="scene sources-scene">
      <div className="sources-head"><p>the boring bit is the important bit</p><h2>all the receipts</h2><span>{sources.length} links · checked in the source plan 28 oct 2026</span></div>
      <div className="tag-filter">{tags.map(t => <button className={t === tag ? "active" : ""} key={t} onClick={() => setTag(t)}>{t}</button>)}</div>
      <div className="source-list">{visible.map((source) => <a href={source.href} target="_blank" rel="noreferrer" key={source.id}><span>S{sources.indexOf(source) + 1}</span><div><strong>{source.title}{source.extractOnly ? " †" : ""}</strong><small>{source.site}{source.date ? ` · ${source.date}` : ""}</small></div><i>↗</i></a>)}</div>
      <p className="source-foot">† the planner only read a search-result extract. reopen before relying on the exact wording.</p>
    </div>
  );
}

// The phone is laid out at 360×760 and scaled, so scene internals keep their proportions.
function getPhoneScale() {
  const chrome = window.innerHeight <= 760 ? 45 + 42 : 62 + 56;
  const breathingRoom = 140;
  const byHeight = (window.innerHeight - chrome - breathingRoom) / 760;
  const byWidth = (window.innerWidth * 0.4) / 360;
  return Math.max(0.5, Math.min(0.92, byHeight, byWidth));
}

function usePhoneScale() {
  const [scale, setScale] = useState(getPhoneScale);
  useEffect(() => {
    const onResize = () => setScale(getPhoneScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}

export default function App() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const [streamer, setStreamer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scene = sceneOrder[sceneIndex];
  const mainRef = useRef<HTMLDivElement>(null);
  const phoneScale = usePhoneScale();
  const seen = Math.max(0, sceneIndex);
  const interests = useMemo(() => ["cats", "privacy", streamer ? "redacted" : "toothpaste"], [streamer]);
  const goTo = (index: number) => {
    setAnnotationOpen(false);
    setMenuOpen(false);
    setSceneIndex(Math.max(0, Math.min(index, sceneOrder.length - 1)));
  };

  useEffect(() => {
    mainRef.current?.focus();
  }, [scene]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAnnotationOpen(false);
        setMenuOpen(false);
      }
      if (event.key === "ArrowRight" && !annotationOpen && sceneIndex < sceneOrder.length - 1) setSceneIndex(i => i + 1);
      if (event.key === "ArrowLeft" && !annotationOpen && sceneIndex > 0) setSceneIndex(i => i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [annotationOpen, sceneIndex]);

  const next = () => goTo(sceneIndex + 1);
  const reveal = () => setAnnotationOpen(true);
  const renderScene = () => {
    switch (scene) {
      case "lock": return <LockScene start={next} />;
      case "feed": return <FeedScene reveal={reveal} next={next} />;
      case "doorbell": return <DoorbellScene reveal={reveal} />;
      case "toothpaste": return <ToothpasteScene reveal={reveal} />;
      case "phishing": return <PhishingScene reveal={reveal} />;
      case "call": return <CallScene reveal={reveal} streamer={streamer} />;
      case "ben": return <BenScene reveal={reveal} />;
      case "alpha": return <AlphaScene reveal={reveal} />;
      case "companion": return <CompanionScene reveal={reveal} />;
      case "location": return <LocationScene reveal={reveal} />;
      case "deepfake": return <DeepfakeScene reveal={reveal} />;
      case "wrapped": return <WrappedScene reveal={reveal} interests={interests} />;
      case "fight": return <FightScene openSources={() => goTo(sceneOrder.indexOf("sources"))} />;
      case "sources": return <SourcesScene />;
    }
  };

  const currentAnnotation = annotations[scene];
  return (
    <main className={`site scene-${scene}`} ref={mainRef} tabIndex={-1}>
      <header className="site-header">
        <a href="#" onClick={(event) => { event.preventDefault(); goTo(0); }}>for you, forever</a>
        <div>
          <button className={streamer ? "active" : ""} onClick={() => setStreamer(!streamer)} aria-pressed={streamer}>streamer mode {streamer ? "on" : "off"}</button>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>scenes {menuOpen ? "×" : "☰"}</button>
        </div>
      </header>
      {menuOpen && <nav className="scene-menu" aria-label="scene list">{sceneOrder.map((id, index) => <button className={id === scene ? "active" : ""} onClick={() => goTo(index)} key={id}><span>{String(index).padStart(2, "0")}</span>{id}</button>)}</nav>}
      <div className="experience" style={{ "--phone-scale": phoneScale } as React.CSSProperties}>
        <div className="phone-wrap">
          <PhoneFrame count={seen}>{renderScene()}</PhoneFrame>
        </div>
        {annotationOpen && currentAnnotation && <AnnotationPanel annotation={currentAnnotation} close={() => setAnnotationOpen(false)} />}
        {!annotationOpen && scene !== "lock" && <div className="side-whisper">(tap the pulsing dot. read the boring bit.)</div>}
      </div>
      <footer className="nav-footer">
        <button onClick={() => goTo(sceneIndex - 1)} disabled={sceneIndex === 0}>← back</button>
        <div className="progress" aria-label={`scene ${sceneIndex + 1} of ${sceneOrder.length}`}><i style={{ width: `${((sceneIndex + 1) / sceneOrder.length) * 100}%` }} /></div>
        <button onClick={next} disabled={sceneIndex === sceneOrder.length - 1}>next →</button>
      </footer>
    </main>
  );
}
