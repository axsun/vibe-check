# ✨ Vibe Check

A location-based, crowdsourced "vibe map" for going out. Record ~20s of a venue's ambient sound, get a structured read on the vibe (loudness, music, genre, crowd chatter, a popping score, a fun one-liner), and see everyone's recent vibes as pins on a map.

Built to run **fully locally** for a hackathon demo. **No accounts, no API keys required** — it ships with a mock analyzer so it works out of the box. Add a Gemini key for real audio "vibe sensing."

## Run it

```bash
npm install
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3001 (started together via the `dev` script)

On first start it seeds 5 believable nearby vibes so the map isn't empty. Force a reseed with `npm run seed`.

## Optional: real audio analysis (Gemini)

```bash
cp .env.example .env
# put your key in GEMINI_API_KEY
```

Without a key, vibes come from a built-in mock. With one, the clip is sent to **Gemini 2.0 Flash** (it hears audio natively) and returned as structured JSON. If the call fails for any reason, it silently falls back to the mock — the demo never breaks.

> Why not ElevenLabs for this? ElevenLabs does **voice** (TTS, speech-to-text, sentiment), not ambient/music scene classification. The "magic box" that hears a room is a multimodal LLM that ingests audio. Claude's text models don't ingest raw audio; Gemini does. ElevenLabs is a great add-on for TTS-ing the vibe summary or generating synthetic ambient test clips — both optional.

## ⚠️ Demoing on a phone (secure-context gotcha)

The mic and Geolocation APIs only work in a **secure context**.

- **Laptop demo:** `http://localhost:5173` counts as secure — everything just works. Easiest path.
- **Phone demo / QR code:** a phone hitting your laptop's `http://192.168.x.x` is **not** secure, so the mic *and* location are silently blocked. Put an HTTPS tunnel in front of the dev server:

  ```bash
  npx ngrok http 5173
  # or: cloudflared tunnel --url http://localhost:5173
  ```

  Then open/serve the HTTPS URL the tunnel gives you (great for the "everyone scan this QR and drop a vibe" demo).

## How it works

```
Browser                              Express API (server/)
  Check in:                          POST /api/vibe  (clip + lat,lng + handle + mode)
   get location (Geolocation API)      1. save clip to data/clips/
   record 20s (MediaRecorder) ───────► 2. analyze clip → Gemini or mock → vibe JSON
   send clip + location                3. compute popping_score
                                       4. store in data/vibes.json
  Map / Feed:
   GET /api/feed?lat&lng ────────────► recent vibes, distance-filtered → map pins + cards
```

## Project layout

```
server/
  index.js     Express app: /api/vibe (upload+analyze+store), /api/feed
  analyze.js   audio → vibe JSON (Gemini if GEMINI_API_KEY, else mock). Owns the prompt.
  score.js     popping_score (0–100) from the vibe dimensions
  store.js     local JSON store (data/vibes.json) + clip files
  seed.js      starter vibes near DEMO_CENTER
src/
  App.jsx      tabs: Map / Check in / Feed
  components/   MapView (Leaflet), CheckIn (record+geo), Feed, VibeCard
  lib/          api.js, geo.js (Geolocation), vibe.js (display helpers)
data/          vibes.json + clips/ (gitignored)
```

## Vibe schema

`loudness` 0–10 · `music_present` · `music_volume` 0–10 · `music_genre` · `has_lyrics` · `talk_level` 0–10 · `emotional_register` (hyped/lively/chill/dead) · `summary` · `popping_score` 0–100 · plus `place_name`, `lat`, `lng`, `handle`, `clip_url`, `created_at`.

## Swapping the local store for Supabase (later)

The store is isolated in `server/store.js` (just `getAll` / `insert` / `replaceAll`). To go multi-device/persistent, reimplement those three against Supabase and put clips in Supabase Storage — nothing else changes.

## Notes / next steps

- iOS Safari records `audio/mp4` (not `webm`) — the recorder already picks the supported type.
- Stretch: 🔥 reactions, "search by sound" (find a place that sounds like this), ElevenLabs TTS of the summary.
