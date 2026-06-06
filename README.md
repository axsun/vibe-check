# ✨ Vibe Check

A location-based, crowdsourced "vibe map" for going out. Record ~20s of a venue's ambient sound, get a structured read on the vibe (loudness, music, genre, crowd chatter, a popping score, a witty one-liner), and see what your people vouch for nearby.

Built to run **fully locally** for a hackathon demo. **No accounts, no API keys required** to play with the UI — it ships with seeded data and a mock analyzer. Add keys to light up the real services.

## Stack

- **Frontend:** React 18 + Vite, TypeScript. Mobile-web first.
- **Map:** Google Maps via `@vis.gl/react-google-maps` (dark colour scheme, AdvancedMarkers w/ heat-color pins, gold ring for friends, pulse for fresh).
- **Audio orb:** ElevenLabs `Orb` component (three.js shader, vendored from `elevenlabs/ui`). Reacts to live mic before record button is pressed; colours track the heat scale.
- **Backend:** Express on `:3001`, server-side keys only. Vite proxies `/api`.
- **AI:** Gemini 2.5 Flash (audio → vibe JSON). ElevenLabs TTS optional ("hear it read" — tucked away, never auto-plays).
- **Data:** Supabase (Postgres + Storage). Falls back to in-memory seeded store when Supabase isn't configured.
- **Design system:** see `DESIGN.md`. Violet/indigo heat scale, Clash Display + General Sans, gold reserved for social signals.

## Run it

```bash
npm install
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3001 (started together via the `dev` script)

App ships with 5 seeded vibes so the feed/map aren't empty. Force a reseed with `npm run seed`.

## Optional: real services

```bash
cp .env.example .env
```

Fill any of these to switch from mock → real:

- `GEMINI_API_KEY` — real audio analysis (Gemini 2.5 Flash).
- `SUPABASE_URL` + `SUPABASE_*_KEY` — multi-device persistence + clip storage.
- `ELEVENLABS_API_KEY` — TTS narrator (optional, off by default per design).
- `VITE_GOOGLE_MAPS_API_KEY` — real map tiles. Without it, the map shows a stylized empty state.

> ⚠️ The Google Maps key is exposed in the browser bundle. **Restrict it by HTTP referrer** in GCP Console → Credentials before sharing the URL.

Every key is read server-side only (except `VITE_*`). Missing keys never crash the app — every external dep is gated behind a flag in `server/lib/env.ts`.

## ⚠️ Demoing on a phone (secure-context gotcha)

The mic + Geolocation APIs only work in a **secure context**.

- **Laptop demo:** `http://localhost:5173` counts as secure — everything just works.
- **Phone demo / QR code:** `http://192.168.x.x` is **not** secure, so the mic + location silently fail. Front the dev server with HTTPS:

  ```bash
  npx ngrok http 5173
  # or: cloudflared tunnel --url http://localhost:5173
  ```

## How it works

```
Browser                              Express API (server/)
  Drop a Vibe (CheckIn):
   ambient mic open on mount ─────►  Orb reacts to room before tap
   tap orb → 20s record (MediaRecorder)
   POST /api/vibe (clip + meta) ───► 1. clip → mp3 (ffmpeg-static)
                                     2. analyze → Gemini or mock → vibe JSON
                                     3. compute popping_score (shared/score.ts)
                                     4. store in Supabase / in-memory
  Discover (Feed-as-home):
   GET /api/feed?lat&lng ──────────► recent vibes, distance-filtered
   Feed → proximity-sorted, friends floated to top
   Lens toggle → same set as map pins
```

## Two key flows

- **Drop a Vibe (capture → reveal):** ambient orb listens to the room → tap to record 20s → "reading the room" beat → score reveal w/ count-up + heat-coloured glow + emoji tags → post drops a fresh pulsing pin.
- **Discover Nearby (feed home + map toggle):** lands in proximity-sorted feed, friends gold and first, search + filter pills (lively/chill/lyrics/genre), Feed⇄Map toggle flips the same set into a heat-coloured pin map. Tap card or pin → expand w/ real clip + "Take me there" → opens spot in Google Maps.

## Project layout

```
server/
  index.ts          Express app: /api/vibe, /api/feed, /api/narrate
  lib/
    gemini.ts       audio → vibe JSON
    elevenlabs.ts   TTS narrator
    transcode.ts    webm/mp4 → mp3 (ffmpeg-static)
    store.ts        Supabase or in-memory fallback
    env.ts          single source for keys / feature flags
  prompts/
    vibe-analyzer.txt
shared/
  types.ts          API contract (Vibe, VibeDimensions)
  score.ts          popping_score from dimensions
  seed-data.ts      DEMO_CENTER + 5 seed vibes
  friends.ts        mocked followed-handles list + isFriend(), friendsAt()
src/
  App.tsx           Feed home + Check-in (raised gradient orb dock)
  views/CheckIn.tsx capture → reveal flow
  components/
    Orb.tsx         vendored from elevenlabs/ui
    Feed.tsx        search, filter pills, lens toggle (Feed⇄Map)
    MapView.tsx     Google Maps + heat pins + InfoWindow w/ 5s sample
    VibeCard.tsx    Dice-glanceable card, social footer, expandable clip
    VibeReveal.tsx  count-up + tag stagger + glow burst
    ReadingRoom.tsx pulsing rings + rotating copy
  lib/
    ambientMic.ts   getUserMedia on mount, live RMS via levelRef
    recorder.ts     MediaRecorder, reuses ambient stream
    mockVibe.ts     client-side mock derived from real loudness
    heat.ts         single source for score → tier color/label
    distance.ts     haversine, fresh/distance labels
    vibeTags.ts     emoji tag mapping, shared by Card + Reveal
    api.ts          /api/vibe, /api/feed, /api/narrate
    geo.ts          Geolocation wrapper
DESIGN.md           design system (foundations, kit, guardrails)
```

## Vibe schema

`loudness` 0–10 · `music_present` · `music_volume` 0–10 · `music_genre` · `has_lyrics` · `talk_level` 0–10 · `emotional_register` (hyped/lively/chill/dead) · `summary` · `popping_score` 0–100 · `place_name`, `lat`, `lng`, `handle`, `clip_url`, `created_at`.

## Notes / known shortcuts

- Bundle is ~1.1MB (three.js shader orb). Acceptable for hackathon; code-split if shipping.
- Friend graph + "friends at place" is mocked (`shared/friends.ts`). No auth.
- The `mockVibe` analyzer derives plausible dimensions from real recorded mic levels — swap to `/api/vibe` by replacing one call in `views/CheckIn.tsx`.
- iOS Safari records `audio/mp4` (not `webm`); the recorder picks the supported type. Server transcodes either to mp3.
- Don't auto-play TTS over the reveal — it kills the moment. The real 20s clip is the audio payoff.
