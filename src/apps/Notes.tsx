import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useOS } from "../os/context";
import { cetDate, cetTime, useCetClock } from "../os/cet";
import { AppShell } from "../os/ui";

const steps = [
  "a notification buzzes. tap it to open that app.",
  "look for the odd thing inside the app, and tap it.",
  "read the explanation that pops up. tap × to close it.",
  "tap ‹ home, then open the glowing app.",
  "keep going until the phone runs out of things to show you.",
];

type MyNote = { id: number; text: string; updated: number };

/** Notes written on the phone last until the page is closed, and never leave the browser. */
let savedNotes: MyNote[] = [];
let nextId = 1;

const titleOf = (text: string) => text.split("\n").find((line) => line.trim())?.trim() ?? "new note";
const previewOf = (text: string) => {
  const lines = text.split("\n").filter((line) => line.trim());
  return lines.length > 1 ? lines.slice(1).join(" ") : "no additional text";
};
const stamp = (ms: number) => {
  const date = new Date(ms);
  return cetDate(date) === cetDate() ? cetTime(date) : cetDate(date);
};

function ComposeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="M18.4 3.6a1.8 1.8 0 0 1 2.5 2.5L12 15l-3.5 1 1-3.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  );
}

function Instructions({ onBack }: { onBack: () => void }) {
  const os = useOS();
  const time = useCetClock();
  const [ticked, setTicked] = useState<string[]>([]);
  const started = os.flags.has("notesRead");
  return (
    <div className="notes-page">
      {started && (
        <button className="notes-nav" onClick={onBack}>
          ‹ notes
        </button>
      )}
      <p className="notes-date">
        {cetDate()} · {time}
      </p>
      <h2>this isn’t your phone. explore it.</h2>
      <p className="notes-who">
        you’ve got a few minutes with someone else’s phone. tap around and see what it quietly knows about them. everything here is made up, and nothing leaves your browser.
      </p>
      <h3 className="notes-how">how it works</h3>
      <ol className="notes-list" aria-label="how it works">
        {steps.map((step, index) => {
          const on = ticked.includes(step);
          return (
            <li key={step}>
              <button
                aria-pressed={on}
                className={on ? "is-on" : ""}
                onClick={() => setTicked((prev) => (on ? prev.filter((s) => s !== step) : [...prev, step]))}
              >
                <i aria-hidden="true">{on ? "✓" : index + 1}</i>
                <span>{step}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <motion.button
        className="notes-start"
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          os.setFlag("notesRead");
          os.home();
        }}
      >
        {started ? "back to the phone →" : "got it. let’s explore →"}
      </motion.button>
    </div>
  );
}

function Editor({ note, onDone }: { note: MyNote; onDone: (text: string | null) => void }) {
  const [text, setText] = useState(note.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="note-editor">
      <div className="notes-toolbar is-top">
        <button className="notes-nav" onClick={() => onDone(text)}>
          ‹ notes
        </button>
        <button className="notes-nav" onClick={() => onDone(text)}>
          done
        </button>
      </div>
      <p className="notes-date">{stamp(note.updated)}</p>
      <textarea
        ref={ref}
        value={text}
        maxLength={1000}
        placeholder="start typing…"
        aria-label="note"
        onChange={(event) => setText(event.target.value)}
      />
      <div className="notes-toolbar">
        <button className="notes-icon" aria-label="delete note" onClick={() => onDone(null)}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

type View = { name: "list" } | { name: "instructions" } | { name: "edit"; id: number };

export function Notes() {
  const os = useOS();
  const [mine, setMine] = useState<MyNote[]>(savedNotes);
  const [view, setView] = useState<View>(os.flags.has("notesRead") ? { name: "list" } : { name: "instructions" });
  const update = (next: MyNote[]) => {
    savedNotes = next;
    setMine(next);
  };
  const compose = () => {
    const note = { id: nextId++, text: "", updated: Date.now() };
    update([note, ...mine]);
    setView({ name: "edit", id: note.id });
  };
  const finish = (id: number, text: string | null) => {
    update(
      text === null || !text.trim()
        ? mine.filter((n) => n.id !== id)
        : mine.map((n) => (n.id === id ? { ...n, text, updated: n.text === text ? n.updated : Date.now() } : n)),
    );
    setView({ name: "list" });
  };
  const editing = view.name === "edit" ? mine.find((n) => n.id === view.id) : undefined;
  const sorted = [...mine].sort((a, b) => b.updated - a.updated);

  return (
    <AppShell app="notes" title="notes">
      {view.name === "instructions" ? (
        <Instructions onBack={() => setView({ name: "list" })} />
      ) : editing ? (
        <Editor note={editing} onDone={(text) => finish(editing.id, text)} />
      ) : (
        <div className="notes-home">
          <h2 className="notes-big">notes</h2>
          <ul className="notes-rows">
            <li>
              <button onClick={() => setView({ name: "instructions" })}>
                <strong>📌 this isn’t your phone. explore it.</strong>
                <small>
                  <span>pinned</span> how it works
                </small>
              </button>
            </li>
            {sorted.map((note) => (
              <li key={note.id}>
                <button onClick={() => setView({ name: "edit", id: note.id })}>
                  <strong>{titleOf(note.text)}</strong>
                  <small>
                    <span>{stamp(note.updated)}</span> {previewOf(note.text)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          <div className="notes-toolbar is-bottom">
            <span className="notes-count">
              {mine.length + 1} {mine.length ? "notes" : "note"}
            </span>
            <button className="notes-icon" aria-label="new note" onClick={compose}>
              <ComposeIcon />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
