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

## Admin page (`/admin`)

`/admin` lets you describe a change in plain English. Claude writes the change, you check the diff, and on approval it is committed to `main`. Vercel then redeploys the site. The page is not linked from the site, and it is served with `noindex`.

Until the environment variables below are set, `/admin` shows "not configured" and every `/api/admin/*` endpoint returns `503 not_configured`. The public site does not use any of this code.

### How a change goes live

1. **Thinking.** The server reads the editable files from GitHub. It sends them, your request and [`api/_lib/system-prompt.ts`](api/_lib/system-prompt.ts) to Claude. Claude replies with structured edits.
2. **Proposed diff.** The edits are applied on the server and checked against the file allowlist and a secret scanner, and you get a diff. Nothing is written yet. The proposal is signed and expires after 30 minutes.
3. **Build check.** When you press Approve, the change is committed to a temporary `admin/preview-<sha>` branch. The `admin build check` GitHub Action then runs `npm ci`, `npm run lint` and `npm run build` on it. Vercel does not deploy these branches.
4. **Committing.** Only if the check passes is `main` fast-forwarded to that commit. It is never force-pushed. If `main` moved in the meantime, you are asked to propose again. If the check fails, `main` is untouched and the preview branch is deleted.
5. **Deploying, then live.** The page follows the Vercel deployment for that commit. It uses the Vercel API if `VERCEL_TOKEN` is set, and otherwise the Vercel status on the GitHub commit. If a Vercel build fails, Vercel keeps serving the previous deployment.

Admin commits start with `admin:`. **Undo last admin change** adds a normal `Revert "admin: …"` commit to `main` that restores the files the most recent unreverted admin commit changed. Git history is never rewritten. Undo refuses if a later commit touched the same files; in that case, ask for the fix as a new change.

Claude may only edit `src/content/**`, `src/apps/**`, `src/os/**`, `src/phone/**`, `src/pixel/**`, `src/App.tsx`, `src/styles.css` and `public/videos/README.md`. It can never edit `api/**`, `admin/**`, `scripts/**`, `.github/**`, `.env*`, `package.json`, the lockfile, the Vite, Vercel, TypeScript or ESLint config, `index.html` or `src/main.tsx`. The rules are in [`api/_lib/policy.ts`](api/_lib/policy.ts).

To change what Claude is told about the project (cite facts, never invent sources, keep the dark pixel mood, and so on), edit [`api/_lib/system-prompt.ts`](api/_lib/system-prompt.ts) and push. Admin changes can't edit that file.

### Setup, step by step

**1. Anthropic API key**

1. Sign in to the [Anthropic Console](https://console.anthropic.com/) and add billing credit under **Billing**.
2. Open **API keys**, then **Create key**. Name it `sophline-admin` and copy it. It starts with `sk-ant-`.
3. Optional: under **Limits**, set a monthly spend limit. Each request sends the editable site files, roughly 150 KB, so a change costs a few tens of pence at most.

**2. GitHub fine-grained token**

1. Go to GitHub, then **Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token** ([direct link](https://github.com/settings/personal-access-tokens/new)).
2. Name: `sophline-admin`. Expiration: pick a date. You'll need to make a new token when it expires.
3. Resource owner: `hannahblair`. Repository access: **Only select repositories**, then `hannahblair/sophline`.
4. Repository permissions. Leave everything else as "No access".

   | Permission | Access | Why |
   | --- | --- | --- |
   | Contents | Read and write | read files, create commits and branches, move `main` |
   | Actions | Read-only | see the `admin build check` result |
   | Commit statuses | Read-only | see the Vercel deploy status |
   | Metadata | Read-only | required by GitHub, set automatically |

5. Generate the token and copy it. It starts with `github_pat_`.

GitHub Actions must be enabled for the repo (**Settings › Actions › General › Allow all actions**) so the build check can run. On a private repo, each check uses about a minute of the free Actions allowance.

**3. Password and session secret**

- `ADMIN_PASSWORD`: at least 12 characters, and not used anywhere else. A password manager's generated passphrase is ideal.
- `ADMIN_SESSION_SECRET`: at least 32 random characters, used to sign the login cookie and proposals. Generate one with `openssl rand -base64 48`, or with your password manager set to 48 characters. Changing it, or the password, logs everyone out.

**4. Add the variables in Vercel**

In the Vercel dashboard, open the `sophline` project and go to **Settings › Environment Variables**. Add each variable below for the **Production** environment. Mark the secrets as **Sensitive**.

| Variable | Required | Value |
| --- | --- | --- |
| `ADMIN_PASSWORD` | yes | your admin password |
| `ADMIN_SESSION_SECRET` | yes | the random secret from step 3 |
| `ANTHROPIC_API_KEY` | yes | the `sk-ant-…` key |
| `GITHUB_TOKEN` | yes | the `github_pat_…` token |
| `ANTHROPIC_MODEL` | no | Claude model id. Default `claude-opus-5-5`. |
| `VERCEL_TOKEN` | no | a Vercel token ([Account Settings › Tokens](https://vercel.com/account/tokens)) for more precise deploy status |
| `VERCEL_PROJECT_ID` | with `VERCEL_TOKEN` | from **Project Settings › General › Project ID** |
| `VERCEL_TEAM_ID` | with `VERCEL_TOKEN` | from **Team Settings › General › Team ID** |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | no, recommended | added automatically when you connect an **Upstash Redis** store under the project's **Storage** tab. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` also work. |

Without `VERCEL_TOKEN`, the deploy status comes from the Vercel status on the GitHub commit, which works fine.

**5. Redeploy**

Environment variables only reach new deployments. Go to **Deployments**, open the latest production deployment, then choose **⋯ › Redeploy**. When it is ready, open `https://sophline.online/admin` and log in.

### Security notes

- All secrets are stored only in Vercel. No secret is in the repo or the browser bundle. The page only ever sees the names of missing variables, never their values. Claude's output is scanned for anything that looks like a key or token, and is rejected if it finds one.
- The password is compared in constant time. A login sets a 30-minute `__Host-` cookie that is `HttpOnly`, `Secure` and `SameSite=Strict`, signed with HMAC-SHA256.
- Every change endpoint requires a same-origin request, a JSON body and a per-session CSRF token header.
- Login lockout: after 5 wrong passwords, an IP is locked out for 15 minutes, and after 25 wrong passwords across all IPs, login stops for an hour. Each wrong attempt is also slowed down. **Limitation:** without Upstash Redis, these counters live in each serverless instance's memory. They reset on cold starts and aren't shared between instances, so connect Upstash for real lockout. The footer of `/admin` shows which store is active.
- The GitHub token can only touch this one repo, can't edit workflows and can't administer the repo. To lock everyone out immediately, revoke it on GitHub, or delete `ADMIN_PASSWORD` in Vercel and redeploy.
- Review every diff. Claude is told never to invent sources, but you are the final check on facts and links.

### Testing locally with mocks

```bash
npm run build
npm run admin:mock
```

Open <http://localhost:8787/admin> and log in with the password `local-mock-password`. The script starts fake GitHub and Anthropic APIs in memory, so no real keys are used and nothing leaves your machine. Prompts that contain `doorbell`, `break`, `package.json` or `nothing` try the other paths.

## Content notes

The source material was checked in the supplied plan on 28 October 2026. Links marked `†` were checked there through search-result extracts only and should be reopened before relying on exact wording. Several scenes clearly label geographic, vendor-survey and date limitations. Settings and law change; recheck the guide before publication.
