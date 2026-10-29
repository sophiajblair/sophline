import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOS } from "../os/context";
import { AppShell, VideoSlot } from "../os/ui";

type Post =
  | { id: string; kind: "clip"; slot: string; title: string; handle: string; interest: string; hue: string }
  | { id: string; kind: "toothpaste" }
  | { id: string; kind: "gadget" };

const clips: Post[] = [
  { id: "cat", kind: "clip", slot: "feed-cat-opera", title: "cat performs a tiny opera", handle: "@content_farm_404", interest: "cats", hue: "violet" },
  { id: "gadget", kind: "gadget" },
  { id: "kitchen", kind: "clip", slot: "feed-flooded-kitchen", title: "kitchen floods with blue jelly", handle: "@oddly_satisfying_bot", interest: "chaos", hue: "aqua" },
  { id: "ceo", kind: "clip", slot: "feed-motivational-ceo", title: "ceo wakes up at 3:44am (apparently)", handle: "@grindset.exe", interest: "hustle", hue: "rust" },
];

function useLinger(onLinger: () => void) {
  const ref = useRef<HTMLElement>(null);
  const callback = useRef(onLinger);
  useEffect(() => {
    callback.current = onLinger;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (entry.intersectionRatio > 0.7) timer = setTimeout(() => callback.current(), 1800);
      },
      { threshold: [0, 0.7, 1] },
    );
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);
  return ref;
}

function ClipPost({ post }: { post: Extract<Post, { kind: "clip" }> }) {
  const os = useOS();
  const [guessed, setGuessed] = useState(false);
  const [liked, setLiked] = useState(false);
  const ref = useLinger(() => {
    setGuessed(true);
    os.addInterest(post.interest);
  });
  return (
    <section ref={ref} className={`post post-${post.hue}`} aria-label={post.title}>
      <span className="post-ai">probably made by a machine</span>
      <VideoSlot id={post.slot} className="post-video">
        <div className="poster-dither" />
      </VideoSlot>
      <div className="post-meta">
        <strong>{post.title}</strong>
        <small>{post.handle} · #oddlyspecific</small>
      </div>
      <div className="post-rail">
        <motion.button
          className={liked ? "is-on" : ""}
          aria-pressed={liked}
          aria-label="like"
          whileTap={{ scale: 1.4 }}
          onClick={() => {
            setLiked(!liked);
            setGuessed(true);
            os.addInterest(post.interest);
          }}
        >
          ♥<small>{liked ? "42.9k" : "42.8k"}</small>
        </motion.button>
        <span>
          ◌<small>812</small>
        </span>
      </div>
      <AnimatePresence>
        {guessed && (
          <motion.button
            className="interest-chip"
            initial={{ opacity: 0, x: 30, rotate: 6 }}
            animate={{ opacity: 1, x: 0, rotate: 2 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            onClick={(event) => os.tip("feed", event.currentTarget)}
          >
            interest guessed: {post.interest} ?
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}

function GadgetPost() {
  const os = useOS();
  return (
    <section className="post post-gadget" aria-label="sponsored: the everything gadget">
      <span className="post-ai is-ad">AI AD · probably</span>
      <VideoSlot id="ai-gadget-ad" className="post-video gadget-video">
        <div className="poster-gadget" />
      </VideoSlot>
      <div className="post-meta">
        <strong>THE EVERYTHING GADGET</strong>
        <small>peels. glows. definitely changes your life.</small>
      </div>
      <motion.button className="buy-button" whileTap={{ scale: 0.94 }} onClick={(event) => os.tip("ben", event.currentTarget)}>
        buy now???
      </motion.button>
    </section>
  );
}

type Guess = { label: string; reply: string };

const guesses: Guess[] = [
  { label: "it listened", reply: "no proof it did. it didn’t need to." },
  { label: "it read the text", reply: "it couldn’t. the chat was end-to-end encrypted, like personal whatsapp chats." },
  { label: "something else i did", reply: "closest. that’s usually how it works." },
  { label: "nobody knows", reply: "half right. but there are usual suspects." },
];

const routes = [
  "activity: what you searched, bought or lingered on, here or on accounts you chose to link.",
  "customer lists: a shop you’ve bought from can upload your email or number and match it to you.",
  "timing: everyone runs out of toothpaste. a coincidence can feel like surveillance.",
];

function ToothpastePost() {
  const os = useOS();
  const adRef = useRef<HTMLDivElement>(null);
  const [asking, setAsking] = useState(false);
  const [guess, setGuess] = useState<Guess | null>(null);
  return (
    <section className="post post-toothpaste" aria-label="sponsored: mint toothpaste">
      <span className="post-ai is-ad">SPONSORED</span>
      <div ref={adRef} className="paste-ad">
        <VideoSlot id="toothpaste-ad" className="post-video paste-video" />
      </div>
      <div className="post-meta">
        <strong>the paste that knows you</strong>
        <small>{os.name("for people who just ran out", "for people like you")}</small>
      </div>
      <motion.button className="buy-button" whileTap={{ scale: 0.94 }} onClick={() => setAsking(true)}>
        shop now
      </motion.button>
      {guess && (
        <div className="post-reveal" aria-live="polite">
          <p>
            you guessed “{guess.label}”. {guess.reply}
          </p>
          <strong>so how did it know?</strong>
          <ul>
            {routes.map((route) => (
              <li key={route}>{route}</li>
            ))}
          </ul>
          <p>which one was it this time? nobody can tell you. you can’t audit it.</p>
        </div>
      )}
      <AnimatePresence>
        {asking && !guess && (
          <motion.div
            className="sheet"
            role="dialog"
            aria-label="how did that happen?"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <strong>wait. how did that happen?</strong>
            {guesses.map((g) => (
              <button
                key={g.label}
                onClick={() => {
                  setGuess(g);
                  os.tip("toothpaste", adRef.current);
                }}
              >
                {g.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function Loop() {
  const os = useOS();
  const showAd = os.fired.has("ad");
  const posts: Post[] = showAd ? [{ id: "ad", kind: "toothpaste" }, ...clips] : clips;
  return (
    <AppShell app="loop" title="loop · just for u">
      <div className="feed" tabIndex={0} aria-label="video feed, scroll for more">
        {posts.map((post) =>
          post.kind === "clip" ? <ClipPost key={post.id} post={post} /> : post.kind === "gadget" ? <GadgetPost key={post.id} /> : <ToothpastePost key={post.id} />,
        )}
        <section className="post post-end">
          <p>you reached the end.</p>
          <small>(there is no end. we just stopped making them.)</small>
        </section>
      </div>
      <div className="feed-hint" aria-hidden="true">
        ↑ scroll
      </div>
    </AppShell>
  );
}
