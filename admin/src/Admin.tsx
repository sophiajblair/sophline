import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, setCsrf, type HistoryItem, type Preview, type Proposal, type SessionInfo, type Stage } from "./api";

type Phase = "idle" | "thinking" | "checking" | "fixing" | "review" | "committing" | "deploying" | "live" | "failed";

type Pipeline = {
  phase: Phase;
  prompt: string;
  proposal?: Proposal;
  sha?: string;
  branch?: string;
  since: number;
  detail?: string;
  link?: string | null;
  commitUrl?: string;
  /** the check gave no result within CHECK_LIMIT_MS; polling stops until "check again" */
  timedOut?: boolean;
  lastState?: Stage["state"];
  /** build errors (or apply errors) to show; on a failed check these are the compiler and lint lines */
  errors?: string[];
  errorsTitle?: string;
};

const STORE = "sophline-admin-pipeline";
const POLL_MS = 4000;
const CHECK_LIMIT_MS = 4 * 60_000;
const steps: { phase: Phase; label: string }[] = [
  { phase: "thinking", label: "thinking" },
  { phase: "checking", label: "build check" },
  { phase: "review", label: "proposed diff" },
  { phase: "committing", label: "committing" },
  { phase: "deploying", label: "deploying" },
  { phase: "live", label: "live" },
];
const order = steps.map((step) => step.phase);

const idle = (): Pipeline => ({ phase: "idle", prompt: "", since: Date.now() });

function loadPipeline(): Pipeline {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null") as Pipeline | null;
    if (saved && saved.sha && (saved.phase === "checking" || saved.phase === "fixing" || saved.phase === "deploying" || saved.phase === "review")) {
      return saved.phase === "fixing" ? { ...saved, phase: "checking" } : saved;
    }
  } catch {
    // ignore unreadable state
  }
  return idle();
}

const message = (error: unknown) => (error instanceof Error ? error.message : "something went wrong.");

function Login({ onDone }: { onDone: (csrf: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel login"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          const result = await api<{ csrf: string }>("login", { password });
          setPassword("");
          onDone(result.csrf);
        } catch (err) {
          setError(message(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>log in</h2>
      <label htmlFor="password">admin password</label>
      <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary" disabled={busy || !password}>
        {busy ? "checking…" : "enter"}
      </button>
    </form>
  );
}

function Diff({ text }: { text: string }) {
  const lines = text.split("\n").filter((line, i) => i > 1 || !line.startsWith("====="));
  return (
    <pre className="diff">
      {lines.map((line, i) => {
        const kind = line.startsWith("+++") || line.startsWith("---") ? "head" : line.startsWith("@@") ? "hunk" : line[0] === "+" ? "add" : line[0] === "-" ? "del" : "ctx";
        return (
          <span key={i} className={`line ${kind}`}>
            {line || " "}
            {"\n"}
          </span>
        );
      })}
    </pre>
  );
}

function Stepper({ phase }: { phase: Phase }) {
  const failedAt = phase === "failed";
  const current = order.indexOf(phase === "fixing" ? "checking" : phase);
  return (
    <ol className="stepper" aria-label="change status">
      {steps.map((step, index) => {
        const state = failedAt ? "" : index < current || phase === "live" ? "done" : index === current ? "now" : "";
        return (
          <li key={step.phase} className={state} aria-current={state === "now" ? "step" : undefined}>
            <span aria-hidden="true">{state === "done" ? "■" : state === "now" ? "▶" : "□"}</span>
            {step.label}
          </li>
        );
      })}
      {failedAt && (
        <li className="fail">
          <span aria-hidden="true">✕</span>stopped
        </li>
      )}
    </ol>
  );
}

const clock = (ms: number) => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

function Elapsed({ since, limit }: { since: number; limit?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="elapsed">
      {clock(now - since)}
      {limit ? ` / ${clock(limit)}` : ""}
    </span>
  );
}

function History({ refreshKey, busy, onUndone }: { refreshKey: number; busy: boolean; onUndone: (url: string) => void }) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [undoable, setUndoable] = useState<HistoryItem | null>(null);
  const [error, setError] = useState("");
  const [undoing, setUndoing] = useState(false);
  useEffect(() => {
    let live = true;
    api<{ items: HistoryItem[]; undoable: HistoryItem | null }>("history")
      .then((data) => {
        if (!live) return;
        setItems(data.items);
        setUndoable(data.undoable);
        setError("");
      })
      .catch((err) => live && setError(message(err)));
    return () => {
      live = false;
    };
  }, [refreshKey]);
  return (
    <section className="panel" aria-labelledby="history-title">
      <div className="panel-head">
        <h2 id="history-title">recent changes</h2>
        <button
          className="btn danger"
          disabled={!undoable || busy || undoing}
          onClick={async () => {
            if (!undoable || !window.confirm(`undo “${undoable.title}”? this adds a new revert commit to main.`)) return;
            setUndoing(true);
            try {
              const result = await api<{ commitUrl: string }>("undo", { sha: undoable.sha });
              onUndone(result.commitUrl);
            } catch (err) {
              setError(message(err));
            } finally {
              setUndoing(false);
            }
          }}
        >
          {undoing ? "undoing…" : "undo last admin change"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {items === null && !error && <p className="muted">loading…</p>}
      {items?.length === 0 && <p className="muted">no admin changes yet.</p>}
      <ul className="history">
        {items?.map((item) => (
          <li key={item.sha} className={item.reverted ? "is-reverted" : ""}>
            <time dateTime={item.date}>{new Date(item.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time>
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.title}
            </a>
            <span className="tag">{item.kind === "undo" ? "undo" : item.reverted ? "undone" : item.sha === undoable?.sha ? "latest" : ""}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Workspace({ session, onExpired }: { session: SessionInfo; onExpired: () => void }) {
  const [pipeline, setPipelineState] = useState<Pipeline>(loadPipeline);
  const [prompt, setPrompt] = useState("");
  const [historyKey, setHistoryKey] = useState(0);
  const [polls, setPolls] = useState(0);

  const latest = useRef(pipeline);
  const setPipeline = useCallback((next: Pipeline) => {
    latest.current = next;
    sessionStorage.setItem(STORE, JSON.stringify(next));
    setPipelineState(next);
  }, []);
  /** a poll answer only counts if the page is still on the same commit and phase, and nothing newer has landed */
  const pollSeq = useRef(0);
  const appliedSeq = useRef(0);
  const stillCurrent = (p: Pipeline, seq: number) => {
    if (seq < appliedSeq.current || latest.current.sha !== p.sha || latest.current.phase !== p.phase) return false;
    appliedSeq.current = seq;
    return true;
  };
  const [previews, setPreviews] = useState<Preview[] | null>(null);
  const [previewsKey, setPreviewsKey] = useState(0);

  const fixing = useRef(false);

  const fail = useCallback(
    (from: Pipeline, err: unknown) => {
      if (err instanceof ApiError && err.status === 401) onExpired();
      const errors = err instanceof ApiError ? err.errors : [];
      setPipeline({ ...from, phase: "failed", detail: message(err), errors: errors.length ? errors : from.errors, errorsTitle: errors.length ? "errors" : from.errorsTitle });
    },
    [onExpired, setPipeline],
  );

  const checking = (p: Pipeline, proposal: Proposal): Pipeline => {
    const attempt = proposal.attempt ?? 0;
    const fixed = attempt ? ` claude fixed the build (fix ${attempt} of ${proposal.maxFixes ?? 2}).` : "";
    return {
      ...p,
      phase: "checking",
      proposal,
      sha: proposal.sha,
      branch: proposal.branch,
      commitUrl: proposal.commitUrl,
      since: Date.now(),
      detail: `${fixed} checking that it lints, typechecks and builds…`.trim(),
      errors: proposal.fixedErrors,
      errorsTitle: proposal.fixedErrors?.length ? "errors claude just fixed" : undefined,
      link: null,
      timedOut: false,
      lastState: undefined,
    };
  };

  const autoFix = useCallback(
    async (p: Pipeline, errors: string[], link: string | null) => {
      const proposal = p.proposal;
      if (!proposal?.token || fixing.current) return;
      fixing.current = true;
      const n = (proposal.attempt ?? 0) + 1;
      const waiting: Pipeline = {
        ...p,
        phase: "fixing",
        since: Date.now(),
        link,
        errors,
        errorsTitle: "build check errors",
        detail: `the build check failed. claude is fixing it (fix ${n} of ${proposal.maxFixes ?? 2})…`,
      };
      setPipeline(waiting);
      try {
        const next = await api<Proposal>("fix", { token: proposal.token });
        setPipeline(checking(waiting, next));
        setPolls((k) => k + 1);
      } catch (err) {
        if (p.branch) await api("discard", { branch: p.branch }).catch(() => undefined);
        fail({ ...waiting, branch: undefined }, err);
      } finally {
        fixing.current = false;
      }
    },
    [fail, setPipeline],
  );

  useEffect(() => {
    const active = (pipeline.phase === "checking" && !pipeline.timedOut) || pipeline.phase === "deploying";
    if (!active) return;
    const timer = setTimeout(() => setPolls((n) => n + 1), POLL_MS);
    return () => clearTimeout(timer);
  }, [pipeline, polls]);

  useEffect(() => {
    if (!polls) return;
    const p = pipeline;
    const seq = ++pollSeq.current;
    const transient = (err: unknown) => !(err instanceof ApiError) || err.status === 0 || err.status >= 500;
    if (p.phase === "checking" && p.sha && !p.timedOut) {
      const over = Date.now() - p.since > CHECK_LIMIT_MS;
      api<Stage>("status", undefined, `?stage=check&sha=${p.sha}`)
        .then(async (stage) => {
          if (!stillCurrent(p, seq)) return;
          if (stage.published) {
            setPipeline({ ...p, phase: "deploying", since: Date.now(), branch: undefined, errors: undefined, link: null, detail: "this change is already on main. waiting for Vercel…" });
            setHistoryKey((k) => k + 1);
          } else if (stage.state === "success") {
            setPipeline({ ...p, phase: "review", link: stage.url, errors: undefined, timedOut: false, detail: "the build check passed. review the diff, then approve or discard." });
          } else if (stage.state === "failure") {
            const errors = stage.errors?.length ? stage.errors : [stage.detail];
            const used = p.proposal?.attempt ?? 0;
            if (used < (p.proposal?.maxFixes ?? 2)) return autoFix(p, errors, stage.url);
            await api("discard", { branch: p.branch }).catch(() => undefined);
            setPipeline({
              ...p,
              phase: "failed",
              branch: undefined,
              link: stage.url,
              errors,
              errorsTitle: "build check errors",
              detail: `the build check still failed after ${used} automatic fix${used === 1 ? "" : "es"}. nothing was published; the live site is unchanged.`,
            });
          } else if (over) {
            setPipeline({ ...p, timedOut: true, lastState: stage.state, link: stage.url, detail: `still no result after ${clock(CHECK_LIMIT_MS)} (${stage.detail}). nothing was published.` });
          } else {
            const used = p.proposal?.attempt ?? 0;
            const fixed = used ? `claude fixed the build (fix ${used} of ${p.proposal?.maxFixes ?? 2}). ` : "";
            setPipeline({ ...p, lastState: stage.state, link: stage.url, detail: `${fixed}${stage.detail} the diff below can't be approved until it passes.` });
          }
        })
        .catch((err) => {
          if (!stillCurrent(p, seq)) return;
          if (!transient(err)) return fail(p, err);
          if (over) setPipeline({ ...p, timedOut: true, detail: `couldn't get the build check result after ${clock(CHECK_LIMIT_MS)} (${message(err)}). nothing was published.` });
          else setPipeline({ ...p, detail: `${message(err)} retrying…` });
        });
    } else if (p.phase === "deploying" && p.sha) {
      api<Stage>("status", undefined, `?stage=deploy&sha=${p.sha}`)
        .then((stage) => {
          if (!stillCurrent(p, seq)) return;
          if (stage.state === "success") setPipeline({ ...p, phase: "live", detail: "the change is live on sophline.online.", link: stage.url });
          else if (stage.state === "failure") setPipeline({ ...p, phase: "failed", detail: `${stage.detail} you can undo the change below.`, link: stage.url });
          else setPipeline({ ...p, detail: stage.detail, link: stage.url });
        })
        .catch((err) => {
          if (!stillCurrent(p, seq)) return;
          if (!transient(err)) return fail(p, err);
          setPipeline({ ...p, detail: `${message(err)} retrying…` });
        });
    }
    // Polling is driven by `polls`; pipeline is read as of that tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polls]);

  // Open preview branches: lets a reloaded page (or one left open across a deploy) pick up a change whose check already finished.
  useEffect(() => {
    let live = true;
    api<{ items: Preview[] }>("previews")
      .then(({ items }) => {
        if (!live) return;
        setPreviews(items);
        const p = latest.current;
        const mine = items.find((item) => item.sha === p.sha);
        if (mine && (p.phase === "checking" || p.phase === "review")) setPipeline({ ...p, proposal: mine });
      })
      .catch(() => live && setPreviews([]));
    return () => {
      live = false;
    };
  }, [previewsKey, setPipeline]);

  const checkAgain = () => {
    setPipeline({ ...pipeline, timedOut: false, since: Date.now(), detail: "checking again…" });
    setPolls((n) => n + 1);
  };

  const resume = (item: Preview, since: number) => {
    const base: Pipeline = {
      phase: "checking",
      prompt: item.prompt,
      proposal: item,
      sha: item.sha,
      branch: item.branch,
      commitUrl: item.commitUrl,
      since,
      link: item.check.url,
    };
    setPrompt(item.prompt);
    if (item.check.state === "success") setPipeline({ ...base, phase: "review", detail: "the build check passed. review the diff, then approve or discard." });
    else setPipeline({ ...base, detail: item.check.detail });
    setPolls((n) => n + 1);
  };

  const discardPreview = async (item: Preview) => {
    await api("discard", { branch: item.branch }).catch(() => undefined);
    setPreviewsKey((k) => k + 1);
  };

  const propose = async () => {
    const start: Pipeline = { phase: "thinking", prompt, since: Date.now(), detail: "Claude is reading the site and writing the change…" };
    setPipeline(start);
    try {
      const proposal = await api<Proposal>("propose", { prompt });
      if (!proposal.token) setPipeline({ ...start, phase: "failed", detail: proposal.notes || "Claude didn't propose any changes.", proposal });
      else {
        setPipeline(checking(start, proposal));
        setPolls((n) => n + 1);
      }
    } catch (err) {
      fail(start, err);
    }
  };

  const publish = async (skipCheck = false) => {
    const p = pipeline;
    if (!p.proposal?.token) return;
    if (skipCheck && !window.confirm("no build check ran. publish anyway? if Vercel's build fails, the previous version stays live.")) return;
    setPipeline({ ...p, phase: "committing", since: Date.now(), detail: "publishing to main…", errors: undefined });
    try {
      const result = await api<{ sha: string; commitUrl: string }>("approve", { token: p.proposal.token, skipCheck });
      setPipeline({ ...p, phase: "deploying", since: Date.now(), sha: result.sha, branch: undefined, detail: "committed to main. waiting for Vercel…", commitUrl: result.commitUrl, link: null, timedOut: false, errors: undefined });
      setHistoryKey((k) => k + 1);
      setPolls((n) => n + 1);
    } catch (err) {
      fail(p, err);
    }
  };

  const reset = async () => {
    if (pipeline.branch && pipeline.phase !== "live" && pipeline.phase !== "deploying") await api("discard", { branch: pipeline.branch }).catch(() => undefined);
    sessionStorage.removeItem(STORE);
    latest.current = idle();
    setPipelineState(latest.current);
    setPreviewsKey((k) => k + 1);
  };

  const busy = pipeline.phase !== "idle" && pipeline.phase !== "live" && pipeline.phase !== "failed";
  const proposal = pipeline.proposal;

  return (
    <>
      {!session.canChange && (
        <section className="panel warn" role="alert">
          <h2>not configured</h2>
          <p>changes are disabled until these Vercel environment variables are set:</p>
          <ul>{session.missing?.map((name) => <li key={name}>{name}</li>)}</ul>
        </section>
      )}
      <section className="panel" aria-labelledby="ask-title">
        <h2 id="ask-title">describe a change</h2>
        <label htmlFor="prompt" className="muted">
          plain english. e.g. “make the study buddy tooltip title shorter” or “add this source to the phishing tooltip: …”
        </label>
        <textarea id="prompt" rows={5} value={prompt} maxLength={4000} onChange={(e) => setPrompt(e.target.value)} disabled={busy || !session.canChange} />
        <div className="row">
          <button className="btn primary" disabled={busy || !session.canChange || prompt.trim().length < 3} onClick={propose}>
            ask claude
          </button>
          <span className="muted">claude proposes; nothing changes until you approve.</span>
        </div>
      </section>

      {!busy && previews && previews.some((item) => item.sha !== pipeline.sha) && (
        <section className="panel" aria-labelledby="waiting-title">
          <h2 id="waiting-title">waiting for you</h2>
          <p className="muted">changes claude already committed to a preview branch. nothing here is live yet.</p>
          <ul className="previews">
            {previews
              .filter((item) => item.sha !== pipeline.sha)
              .map((item) => (
                <li key={item.sha}>
                  <p>
                    <strong>{item.commitMessage.replace(/^admin:\s*/, "")}</strong>{" "}
                    <time dateTime={item.date}>{new Date(item.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time>
                  </p>
                  <p className={item.check.state === "failure" ? "error" : "muted"}>
                    {item.check.state === "success" ? "build check passed." : item.check.detail}
                    {item.stale && " needs a re-run: another change went live after this one was made, so publishing it would undo that change. re-run the request to redo it on top of the live site."}
                  </p>
                  <details>
                    <summary>
                      diff · {item.files.map((file) => file.path).join(", ")}
                    </summary>
                    {item.files.map((file) => (
                      <Diff key={file.path} text={file.diff} />
                    ))}
                  </details>
                  <div className="row">
                    {!item.stale && (
                      <button className="btn primary" onClick={() => resume(item, Date.now())}>
                        {item.check.state === "success" ? "review & approve" : "resume"}
                      </button>
                    )}
                    {item.stale && (
                      <button className="btn primary" onClick={() => setPrompt(item.prompt)}>
                        re-run this request
                      </button>
                    )}
                    {item.check.url && (
                      <a className="btn" href={item.check.url} target="_blank" rel="noreferrer">
                        check on GitHub ↗
                      </a>
                    )}
                    <button className="btn" onClick={() => discardPreview(item)}>
                      discard
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}

      {pipeline.phase !== "idle" && (
        <section className="panel" aria-labelledby="status-title" aria-live="polite">
          <div className="panel-head">
            <h2 id="status-title">status</h2>
            {busy && <Elapsed since={pipeline.since} />}
          </div>
          <Stepper phase={pipeline.phase} />
          <p className={pipeline.phase === "failed" ? "error" : "detail"}>{pipeline.detail}</p>
          {pipeline.errors && pipeline.errors.length > 0 && (
            <div className={`errors${pipeline.errorsTitle === "errors claude just fixed" ? " is-fixed" : ""}`}>
              <p className="errors-title">{pipeline.errorsTitle ?? "errors"}</p>
              <ul>
                {pipeline.errors.map((e) => (
                  <li key={e}>
                    <code>{e}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="links">
            {pipeline.link && (
              <a href={pipeline.link} target="_blank" rel="noreferrer">
                details ↗
              </a>
            )}
            {pipeline.commitUrl && (
              <a href={pipeline.commitUrl} target="_blank" rel="noreferrer">
                commit ↗
              </a>
            )}
            {pipeline.phase === "live" && (
              <a href="/" target="_blank" rel="noreferrer">
                open the site ↗
              </a>
            )}
          </p>
          {(pipeline.phase === "checking" || pipeline.phase === "fixing") && !pipeline.timedOut && (
            <p className="muted check-clock">
              build check running: <Elapsed since={pipeline.since} limit={CHECK_LIMIT_MS} />
            </p>
          )}
          {pipeline.timedOut && pipeline.phase === "checking" && (
            <div className="row timed-out">
              <button className="btn primary" onClick={checkAgain}>
                check again
              </button>
              {pipeline.link && (
                <a className="btn" href={pipeline.link} target="_blank" rel="noreferrer">
                  view the check on GitHub ↗
                </a>
              )}
              {pipeline.lastState === "missing" && (
                <button className="btn" onClick={() => publish(true)}>
                  publish without check
                </button>
              )}
              <span className="muted">{pipeline.lastState === "missing" ? "no check started. GitHub Actions may be disabled." : "the diff below is unchanged; check again whenever you like."}</span>
            </div>
          )}
          {proposal?.token && (pipeline.phase === "checking" || pipeline.phase === "fixing" || pipeline.phase === "review") && (
            <div className="proposal">
              <p className="summary">{proposal.summary}</p>
              {proposal.fixes && proposal.fixes.length > 0 && (
                <ul className="fixes">
                  {proposal.fixes.map((f, i) => (
                    <li key={i}>
                      build fix {i + 1}: {f}
                    </li>
                  ))}
                </ul>
              )}
              {proposal.notes && <p className="notes">note from claude: {proposal.notes}</p>}
              {proposal.warnings.length > 0 && (
                <ul className="warnings">
                  {proposal.warnings.map((w) => (
                    <li key={w}>⚠ {w}</li>
                  ))}
                </ul>
              )}
              <p className="muted">
                commit: <code>{proposal.commitMessage}</code> · {proposal.model}
              </p>
              {proposal.files.map((file) => (
                <details key={file.path} open>
                  <summary>
                    {file.status} · <code>{file.path}</code>
                  </summary>
                  <Diff text={file.diff} />
                </details>
              ))}
              <div className="row">
                <button className="btn primary" onClick={() => publish()} disabled={pipeline.phase !== "review"}>
                  {pipeline.phase === "review" ? "approve & publish" : "approve (after the build check)"}
                </button>
                <button className="btn" onClick={reset}>
                  discard
                </button>
              </div>
            </div>
          )}
          {(pipeline.phase === "live" || pipeline.phase === "failed") && (
            <button className="btn" onClick={reset}>
              start a new change
            </button>
          )}
        </section>
      )}

      {session.canChange && (
        <History
          refreshKey={historyKey}
          busy={busy}
          onUndone={(url) => {
            setHistoryKey((k) => k + 1);
            setPipeline({ phase: "deploying", prompt: "undo", since: Date.now(), sha: url.split("/").pop(), commitUrl: url, detail: "reverted. waiting for Vercel…" });
            setPolls((n) => n + 1);
          }}
        />
      )}
    </>
  );
}

export function Admin() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let live = true;
    api<SessionInfo>("session")
      .then((info) => {
        if (!live) return;
        setCsrf(info.csrf);
        setSession(info);
      })
      .catch((err) => live && setError(message(err)));
    return () => {
      live = false;
    };
  }, [refresh]);

  return (
    <main className="admin">
      <header className="top">
        <h1>
          for you, forever <span>/ admin</span>
        </h1>
        {session?.authenticated && (
          <button
            className="btn"
            onClick={async () => {
              await api("logout", {}).catch(() => undefined);
              setCsrf("");
              setRefresh((n) => n + 1);
            }}
          >
            log out
          </button>
        )}
      </header>
      {error && <p className="error panel">{error}</p>}
      {!session && !error && <p className="muted">loading…</p>}
      {session && !session.configured && (
        <section className="panel warn" role="alert">
          <h2>admin not configured</h2>
          <p>set these environment variables in Vercel (Project Settings → Environment Variables), then redeploy:</p>
          <ul>{session.missing?.map((name) => <li key={name}>{name}</li>)}</ul>
          <p className="muted">the public site is unaffected.</p>
        </section>
      )}
      {session?.configured && !session.authenticated && <Login onDone={() => setRefresh((n) => n + 1)} />}
      {session?.authenticated && <Workspace session={session} onExpired={() => setRefresh((n) => n + 1)} />}
      {session?.authenticated && (
        <footer className="foot muted">
          {session.repo}@{session.branch} · model {session.model} · login limits: {session.rateLimitStore === "redis" ? "shared store" : "per-instance memory"} · deploy
          status: {session.vercelApi ? "Vercel API" : "GitHub commit status"}
        </footer>
      )}
    </main>
  );
}
