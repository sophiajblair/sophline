import { useRef, useState } from "react";
import { motion } from "motion/react";
import { useOS } from "../os/context";
import { cetDate, useCetClock } from "../os/cet";
import { AppShell } from "../os/ui";

const steps = [
  "a notification buzzes. tap it to open that app.",
  "look for the odd thing inside the app, and tap it.",
  "read the explanation that pops up. tap × to close it.",
  "tap ‹ home, then open the glowing app.",
  "keep going until the phone runs out of things to show you.",
];

type MyNote = { id: number; text: string; time: string };

/** Notes written on the phone last until the page is closed, and never leave the browser. */
let savedNotes: MyNote[] = [];
let nextId = 1;

export function Notes() {
  const os = useOS();
  const time = useCetClock();
  const [ticked, setTicked] = useState<string[]>([]);
  const [mine, setMine] = useState<MyNote[]>(savedNotes);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const update = (next: MyNote[]) => {
    savedNotes = next;
    setMine(next);
  };
  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    update([{ id: nextId++, text, time: `${cetDate()} · ${time}` }, ...mine]);
    setDraft("");
    inputRef.current?.focus();
  };
  const started = os.flags.has("notesRead");
  return (
    <AppShell app="notes" title="notes">
      <div className="notes-page">
        <p className="notes-date">{cetDate()} · {time}</p>
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
        <section className="my-notes" aria-label="your notes">
          <h3 className="notes-how">your notes</h3>
          <p className="notes-hint">write your own note. it stays on this phone until you close the page.</p>
          <form
            className="note-form"
            onSubmit={(event) => {
              event.preventDefault();
              addNote();
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              maxLength={200}
              rows={3}
              placeholder="write something…"
              aria-label="new note"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  addNote();
                }
              }}
            />
            <button type="submit" className="note-add" disabled={!draft.trim()}>
              + add note
            </button>
          </form>
          <ul className="my-note-list">
            {mine.map((note) => (
              <li key={note.id}>
                <p>{note.text}</p>
                <small>{note.time}</small>
                <button aria-label="delete note" onClick={() => update(mine.filter((n) => n.id !== note.id))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
