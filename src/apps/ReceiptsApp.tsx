import { useState } from "react";
import { sources } from "../content/sources";
import { AppShell } from "../os/ui";

const tags = ["all", ...Array.from(new Set(sources.map((source) => source.tag)))];

export function ReceiptsApp() {
  const [tag, setTag] = useState("all");
  const visible = tag === "all" ? sources : sources.filter((source) => source.tag === tag);
  return (
    <AppShell app="receipts" title="receipts">
      <div className="sources">
        <p className="settings-kicker">the boring bit is the important bit</p>
        <h2>all the receipts</h2>
        <small className="sources-count">{sources.length} links · checked in the source plan 28 oct 2026</small>
        <div className="tag-filter" role="group" aria-label="filter sources by topic">
          {tags.map((t) => (
            <button key={t} className={t === tag ? "is-on" : ""} aria-pressed={t === tag} onClick={() => setTag(t)}>
              {t}
            </button>
          ))}
        </div>
        <ul className="source-list">
          {visible.map((source) => (
            <li key={source.id}>
              <a href={source.href} target="_blank" rel="noreferrer">
                <span>S{sources.indexOf(source) + 1}</span>
                <div>
                  <strong>
                    {source.title}
                    {source.extractOnly ? " †" : ""}
                  </strong>
                  <small>
                    {source.site}
                    {source.date ? ` · ${source.date}` : ""}
                  </small>
                </div>
                <i aria-hidden="true">↗</i>
              </a>
            </li>
          ))}
        </ul>
        <p className="tiny-note">† the planner only read a search-result extract. reopen before relying on the exact wording.</p>
      </div>
    </AppShell>
  );
}
