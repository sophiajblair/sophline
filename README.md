# for you, forever

An interactive, phone-sized story about AI slop, inferred advertising, surveillance, phishing, voice cloning, AI childhood and the profile built from ordinary taps.

The project uses an original interface—no real app UI, logos or embeds. It has no analytics, cookies, backend or persistent storage. The end card is generated in memory and disappears on refresh.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production check:

```bash
npm run lint
npm run build
npm run preview
```

## Interaction

- Use the on-screen controls, the scene menu, or the footer arrows.
- On a keyboard, `←` and `→` move between scenes and `Escape` closes an annotation.
- Every factual scene has a pulsing “why am i seeing this?” button and source links.
- Streamer mode replaces family names with generic labels.
- The voice-clone scene uses captions and an abstract waveform only. It contains no cloned or recorded voice.
- Reduced-motion preferences disable non-essential animation. All interactions are available without hover.

## Deploy

### GitHub Pages

The included workflow in `.github/workflows/deploy-pages.yml` builds and publishes `dist/` on pushes to `main`. In the repository settings, set **Pages → Source** to **GitHub Actions**.

`vite.config.ts` automatically uses `/sophline/` as the base path in GitHub Actions.

### Vercel

Import the repository and keep the detected Vite defaults:

- Build command: `npm run build`
- Output directory: `dist`

## Content notes

The source material was checked in the supplied plan on 28 October 2026. Links marked `†` were checked there through search-result extracts only and should be reopened before relying on exact wording. Several scenes clearly label geographic, vendor-survey and date limitations. Settings and law change; recheck the guide before publication.
