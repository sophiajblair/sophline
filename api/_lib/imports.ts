import { dirname, join, normalize } from "node:path/posix";

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g;
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

export type ImportGraph = Map<string, { imports: Set<string>; importers: Set<string> }>;

function resolve(from: string, specifier: string, known: Set<string>): string | null {
  const base = normalize(join(dirname(from), specifier)).replace(/\.js$/, "");
  for (const extension of EXTENSIONS) if (known.has(base + extension)) return base + extension;
  return null;
}

/** Relative imports between the repo's own source files. */
export function importGraph(files: { path: string; content: string }[]): ImportGraph {
  const known = new Set(files.map((file) => file.path));
  const graph: ImportGraph = new Map(files.map((file) => [file.path, { imports: new Set<string>(), importers: new Set<string>() }]));
  for (const file of files) {
    if (!/\.(ts|tsx)$/.test(file.path)) continue;
    for (const match of file.content.matchAll(SPECIFIER)) {
      const target = resolve(file.path, match[1], known);
      if (!target || target === file.path) continue;
      graph.get(file.path)!.imports.add(target);
      graph.get(target)!.importers.add(file.path);
    }
  }
  return graph;
}

/** The given files plus everything they import and everything that imports them. */
export function relatedFiles(graph: ImportGraph, paths: string[]): string[] {
  const out = new Set<string>();
  for (const path of paths) {
    out.add(path);
    const node = graph.get(path);
    node?.imports.forEach((p) => out.add(p));
    node?.importers.forEach((p) => out.add(p));
  }
  return [...out].sort();
}

export function importMapText(graph: ImportGraph): string {
  return [...graph]
    .filter(([, node]) => node.imports.size)
    .map(([path, node]) => `${path} imports ${[...node.imports].sort().join(", ")}`)
    .join("\n");
}
