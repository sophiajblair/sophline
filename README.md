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

There are no next buttons or scene menu. The story moves forward when you tap things on the phone itself.

- The phone wakes on its own when the first notification arrives. Tap a notification to open it, or unlock and roam the home screen freely.
- Notifications arrive on a timeline in `src/content/timeline.ts`. Each event waits for something you have already seen (a reply, a tapped explanation, the call ending) and also has a time fallback, so nobody gets stuck. Unread items show as badges, and idle visitors get a nudge.
- Tapping a meaningful element (an ad, a sender address, a map pin, a message) opens a cited explanation beside the phone, with a pointer line to that element. On narrow screens it floats over the phone instead. The phone itself never moves, scales or tilts.
- The voice-clone call arrives as a full-screen incoming call with a content note. Declining skips it and leaves a voicemail transcript. It uses captions and an abstract waveform only: no cloned or recorded voice. Add `?caller=brother` or `?caller=mum` to the URL to choose the variant; otherwise one is picked at random per visit.
- `Escape` closes an explanation, or goes back to the home screen. Everything is a real button or link, so the whole journey works from the keyboard.
- Streamer mode (top right, or in the phone’s settings app) replaces family names with generic labels.
- Reduced-motion preferences replace the springs and zooms with simple fades.

## Add the videos

No third-party video is bundled, downloaded or embedded. Every moving-image surface is a clearly labelled placeholder until Hannah supplies a clip she has the rights to use.

The single manifest is [`src/content/videos.ts`](src/content/videos.ts). It records each slot’s scene, brief, length, aspect ratio and stable file paths. Export either MP4 or WebM with one of these exact basenames and drop it into `public/videos/`:

| Basename | Needed content | Length / ratio |
| --- | --- | --- |
| `feed-cat-opera` | obviously synthetic cat opera | 6–10s, 9:16 |
| `feed-flooded-kitchen` | impossible flooded/jelly kitchen | 6–10s, 9:16 |
| `feed-motivational-ceo` | fictional synthetic hustle guru | 6–10s, 9:16 |
| `doorbell-porch` | staged porch with consenting performer, or empty | 5–8s, 16:9 |
| `ai-gadget-ad` | original ad for the fictional Everything Gadget | 6–10s, 9:16 |

For example, `public/videos/feed-cat-opera.mp4` replaces that poster automatically. No code or manifest flag needs changing. If both formats are present, the browser prefers WebM.

Recommended delivery:

- H.264 MP4 (`yuv420p`, no audio) and/or VP9 WebM
- muted-autoplay friendly, with no essential spoken information
- 1080×1920 for vertical slots; 1280×720 for the porch slot
- seamless loop, ideally under 2 MB per clip and no more than 4 MB
- captions burned in when needed, with enough safe area for the overlaid UI

Only add clips Hannah owns or has explicit rights and performer consent to use. Do not use platform downloads, creator footage, real app interfaces, real product branding, passers-by or identifiable addresses.

## Typefaces

The outside context annotations use **Silkscreen**, created by the Silkscreen Project Authors (original design by Jason Kottke), under the [SIL Open Font License 1.1](public/fonts/OFL-Silkscreen.txt). The WOFF2 files are self-hosted; the site makes no font requests to Google.

Volter (Goldfish) is not bundled. Its DaFont page provides no explicit licence text, and the available font file is reported as embedding-restricted. Do not self-host it without written web-embedding permission from the rights holder.

There is one replacement slot at the top of `src/styles.css`: the `Annotation Pixel` `@font-face` declarations and `--annotation-font` variable. To use a properly licensed Volter webfont later, place its WOFF2 file in `public/fonts/`, change the `src` URL in that slot, and retain the new licence and credit beside it.

Inside the phone, short UI text (app bars, labels, buttons, the clock) uses **Pixelify Sans** by The Pixelify Sans Project Authors, under the [SIL Open Font License 1.1](public/fonts/OFL-PixelifySans.txt), self-hosted from `public/fonts/`. Longer in-phone copy such as messages, emails and captions stays in the system font for readability.

The phone frame, icons and eye motif are hand-built SVG pixel art in `src/phone/` and `src/pixel/`; no image assets are used.

## Deploy

Production is [https://sophline.online](https://sophline.online), served by Vercel. Every push to `main` deploys automatically, and the Vercel status shows on each commit.

The Vercel project uses the detected Vite defaults:

- Build command: `npm run build`
- Output directory: `dist`

`vite.config.ts` uses `base: "/"` because the site is served from the domain root. Keep it at `/` unless the site moves to a subpath.

## Content notes

The source material was checked in the supplied plan on 28 October 2026. Links marked `†` were checked there through search-result extracts only and should be reopened before relying on exact wording. Several scenes clearly label geographic, vendor-survey and date limitations. Settings and law change; recheck the guide before publication.
