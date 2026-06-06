# Vibe Check — Build Spec for Claude Code

> Drop this at the repo root (rename to `CLAUDE.md` if you want Claude Code to auto-load it). It's the single source of truth for what we're building today. Build the vertical slice first, polish later.

**Event:** ElevenLabs / Rebuild hackathon · **Deadline:** submissions 5:00 PM (hard)
**Team:** 2 people · **Platform:** mobile-friendly web app, **location-based** · **Run:** local-only for the demo (no deploy) · **Time left:** ~5 hours

---

## 1. Goal

Let someone walk up to a bar/café/venue, record a ~20-second clip, and instantly get a read on the vibe — how loud it is, what's playing, whether people are talking or dancing, how "popping" it is — and see what others reported nearby. Stop paying a $20 cover to walk into a room you hate.

**Core problem (from the user herself):** "It's so hard to find a place with music with lyrics these days — everyone's playing house or techno, and I don't want to pay $20 to get inside and be like, I hate it here."

**Two things make it work:** (1) an AI that turns an ambient clip into a structured vibe, and (2) a crowdsourced live feed so the data compounds. The feed is the social layer; the recording is the magic.

---

## 2. Users & use cases

Primary: people who care about vibes when going out — cafés (study vs lively) and nightlife.

Use cases, in priority order:
1. **Check-in (MVP):** "I'm here, here's the vibe." Record → get a vibe card → post to the feed.
2. **Browse the feed (MVP):** "What's good near me right now?" See recent vibes, filter by what you want (lively vs chill), tap to play the actual clip.
3. **Search by sound (STRETCH):** "Find me a place that *sounds like this*" — record your pre-game playlist, match on genre. Or "find a sports bar that's not too loud and not packed." Needs the interpretation/weighting layer below.

---

## 3. Scope (be ruthless — 5 hours, 2 people)

**MVP — must ship:**
- Mobile web app, two views: **Map** and **Check in** (feed list secondary).
- **Location-based:** grab the user's location via the browser **Geolocation API** (OS-agnostic — any phone/desktop browser) on check-in; tag every vibe with `lat`/`lng`.
- **Map view:** vibes as pins on an interactive map (**Leaflet + OpenStreetMap**, no API key, OS-agnostic). Tap a pin to open the vibe card.
- Check-in flow: record ~20s audio → upload → get back a structured vibe → appears in feed.
- AI vibe analysis: audio → structured JSON (dimensions below) + one-line summary + popping score.
- Feed: recent vibes near you, newest first, each card shows place, tags, popping score, summary, and a **play button for the clip**.
- Supabase storage for clips + vibe records.
- Seed 4–5 **nearby** places with believable vibes so the map is never empty (use coordinates near the demo venue).

**Stretch — only if MVP is solid:**
1. Search-by-sound ("sounds like this" genre match; "sports bar, not loud" weighted search).
2. 🔥 reactions + "N people vibing here now."
3. ElevenLabs sentiment for the "are people excited" dimension; TTS to read the vibe aloud.

**Explicitly out of scope today:** auth/accounts, native app, push notifications, indoor/outdoor detection (scrapped), barista/shift profiles, real recommendation algorithms.

---

## 4. Key technical decisions (read before coding)

- **The vibe analyzer is a multimodal LLM that accepts audio — NOT ElevenLabs.** ElevenLabs does voice (TTS, speech-to-text, sentiment), not ambient/music scene classification. Use **Gemini 2.0 Flash** (ingests audio natively, fast, cheap) as the "magic box": feed it the clip + a strict prompt, get back JSON. Claude's text models can't ingest raw audio, so don't route the clip to Claude directly.
- **Let the LLM interpret; don't hand-code a vibe algorithm.** One well-structured prompt that returns the dimensions below is faster and more flexible than rule-based scoring. The popping score can be derived from the returned dimensions client-side.
- **Strict split for the analysis: music *or* ambiance, not both fused.** Simpler prompt, clearer output. The clip still captures loudness either way.
- **Store summaries, not just audio.** Keep the clip in Supabase Storage for playback (users want to verify "what's actually playing"), but the feed reads from the structured vibe row — never re-analyze on read.
- **Song identification ≠ Spotify.** If you want "what song is this," that's AudD or ACRCloud (Shazam-style). Spotify is for genre/taste matching after the fact — and note its audio-features endpoints were restricted for new apps in late 2024, so verify access before depending on it. Treat all of this as stretch.
- **Where ElevenLabs fits (to use the credits + chase the bonus):** generate synthetic ambient demo clips (chatty bar, club, quiet café) to test ranking; TTS to speak the vibe summary; sentiment for emotional register. None are on the MVP critical path.
- **Maps: Leaflet + OpenStreetMap — no API key, OS-agnostic.** Avoid Google Maps (billing/key setup) and Mapbox (token) for a local hackathon build. Leaflet is a few lines, free, and runs anywhere. Location comes from the standard browser **Geolocation API** (`navigator.geolocation`), which works identically across iOS/Android/desktop.
- **Local-only for the demo — but mind the secure-context trap.** "Local" means the app runs on your laptop (Vite dev server); cloud Supabase is still fine, no deploy needed. ⚠️ **The mic and Geolocation APIs only work in a secure context.** `localhost` counts as secure, so a **laptop-browser demo just works**. But a phone hitting your laptop's LAN IP over `http://192.168.x.x` is **not** secure — mic *and* location will be silently blocked. If you want to demo on a phone (or run the QR room demo), put an HTTPS tunnel in front of the dev server: `ngrok http 5173` or `cloudflared tunnel --url http://localhost:5173`. Decide laptop-vs-phone demo early; it changes nothing in the code, only how you serve it.

---

## 5. Vibe data model

Dimensions the analyzer returns (kept from the team's working list):

| Field | Type | Notes |
|---|---|---|
| `loudness` | int 0–10 | overall ambient level (proxy for decibels) |
| `music_present` | bool | |
| `music_volume` | int 0–10 \| null | only if `music_present` |
| `music_genre` | string \| null | e.g. "2000s pop", "techno", "reggaeton" |
| `has_lyrics` | bool \| null | the core café/nightlife differentiator |
| `talk_level` | int 0–10 | how talky/conversational |
| `emotional_register` | enum: hyped / lively / chill / dead | nice-to-have; ElevenLabs sentiment can feed this |
| `summary` | string | one witty sentence — this is what people screenshot |
| `popping_score` | int 0–100 | **derived client-side** from loudness + music + talk + register |

Suggested Supabase tables:

```
vibes
  id            uuid pk
  place_name    text
  lat, lng      float8        -- nullable; manual place name ok for MVP
  handle        text          -- emoji/name, no auth
  clip_url      text          -- Supabase Storage path
  loudness      int
  music_present bool
  music_volume  int
  music_genre   text
  has_lyrics    bool
  talk_level    int
  register      text
  summary       text
  popping_score int
  created_at    timestamptz default now()

reactions (stretch)
  id, vibe_id fk, handle, type ('fire'), created_at
```

---

## 6. Architecture & API contract

```
[Mobile web]                         [Backend / serverless fn]
 Check in:                            POST /api/vibe  (multipart: clip + lat,lng + handle)
  get location (Geolocation API)       1. upload clip → Supabase Storage
  record 20s (MediaRecorder) ───────►  2. clip → Gemini (audio) → vibe JSON
  send clip + lat,lng + handle         3. compute popping_score
                                        4. insert row → vibes (with lat,lng)
                                       ◄── returns the vibe row
 Map / Feed:
  GET /api/feed?lat=&lng= ───────────► query vibes (recent, nearby by lat/lng), newest first
                                       ◄── returns vibe[]  → render as map pins + list
```

**Lock this contract first so the two of you can work in parallel without blocking.** Frontend can build against a mocked `/api/vibe` and `/api/feed` returning the shapes above while backend wires up the real thing.

⚠️ **iOS Safari mic gotcha:** `MediaRecorder` on iOS does not support `webm` — record as `audio/mp4`. Test on a real phone in the first 30 minutes, not at hour 5.

⚠️ **Secure-context gotcha (local demo):** mic + Geolocation only work over `localhost` or HTTPS. Laptop demo on `localhost` is fine; for a phone, front the dev server with an HTTPS tunnel (`ngrok`/`cloudflared`). See §4.

---

## 7. Two-person split (parallelize, agreed in planning)

**Person A — Frontend / capture, map & feed**
- Record flow: mic permission, **geolocation capture**, 20s capture (mp4), upload, loading state, vibe card result.
- **Map view (core):** Leaflet map centered on the user, vibe pins, tap-pin → card.
- Feed view: list of vibe cards, popping score, clip playback, the filter (lively ↔ chill).

**Person B — Backend / intelligence & data**
- Supabase project, schema, Storage bucket, seed data.
- `/api/vibe`: upload → Gemini prompt → JSON → score → insert. Owns the analyzer prompt (one file, strict JSON output).
- `/api/feed`: nearby + recent query.
- Stretch: search-by-sound interpretation layer (LLM decides which dimensions matter for a query and weights them; word/topic matching for things like "sports on TV").

Integration point = the API contract in §6. Agree on it before splitting.

---

## 8. Suggested stack & repo layout

- **Frontend:** React + Vite, plain CSS or Tailwind. Mobile-first.
- **Maps:** **Leaflet** (`react-leaflet`) + OpenStreetMap tiles. No API key. Location via browser **Geolocation API**.
- **Backend:** Vite API routes or a tiny Express/serverless fn. Keys server-side only.
- **DB/Storage:** Supabase (Postgres + Storage; Realtime is a free bonus for live feed). Cloud Supabase is fine even for a local app — no deploy needed.
- **AI:** Gemini 2.0 Flash for audio analysis. (Optional ElevenLabs SDK for TTS/sentiment/test clips.)

**Run locally (the demo target):**
```
npm install
npm run dev            # Vite dev server on http://localhost:5173 — laptop demo just works
# Phone / QR demo only — needs HTTPS for mic + geolocation:
ngrok http 5173        # or: cloudflared tunnel --url http://localhost:5173
```

```
/src
  /components   MapView, VibeCard, RecordButton, Feed, FilterBar
  /views        CheckIn, Map (primary), Feed
  /lib          supabase.ts, api.ts, score.ts (popping_score), geo.ts (Geolocation wrapper)
/api
  vibe.ts       POST: upload + analyze + store (with lat/lng)
  feed.ts       GET: nearby recent vibes
  /prompts      vibe-analyzer.txt  (the strict-JSON prompt)
/scripts
  seed.ts       insert 4–5 demo places near the venue coords
.env.example    GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY, (ELEVENLABS_API_KEY)
```

---

## 9. Best practices for building this with Claude Code

- **Build the vertical slice first:** record → upload → analyze → store → show in feed, even ugly. Don't polish any layer until the slice works end-to-end.
- **Pin the API contract (§6) before parallelizing.** Mock endpoints so neither person is blocked.
- **Keep the analyzer prompt in one file** (`/api/prompts/vibe-analyzer.txt`) and force strict JSON (schema / JSON mode). Have Claude Code write a couple of fixture clips' expected outputs so you can eyeball regressions.
- **Seed data early.** A social feed with no rows looks broken in a demo. This is the #1 thing that kills hackathon social apps.
- **Commit small and often; one feature branch per person.** Easy to revert when something breaks at 4pm.
- **Never commit keys.** `.env` + `.env.example`. Supabase anon key is fine client-side; Gemini/ElevenLabs keys stay server-side.
- **Timebox stretch.** If the MVP slice isn't done by ~1:45 PM, cut every stretch item.
- **Give Claude Code this doc as context** and have it work one section at a time (e.g. "implement §6 `/api/vibe` against the schema in §5"). Don't ask for the whole app in one prompt — it over-builds. Keep tasks small and verifiable.

---

## 10. Demo plan (3-min hard stop)

- **Hero move:** make the room the data. QR code on the projector → audience records the *hackathon's* vibe → feed fills live, popping score climbs. Literally answers "is this hackathon popping?" on screen.
- **Backup:** pre-record synthetic ambient clips with ElevenLabs (chatty bar, club, quiet café) and show the system correctly ranking their energy — proves the analyzer without depending on live room noise or wifi.
- **Always have:** a screen-recording of a full populated run, seeded places, and a phone hotspot. Submit by 4:50.
- Judges only need screenshots + a clear idea (per the rules), so a clean feed + one live recording beats a fragile end-to-end flow.

---

## 11. Open questions to resolve fast

- **Sample length:** is 20s enough for a reliable read, or do we need 30s? Test early with real clips.
- **Location:** ~~GPS vs picker~~ → **decided: location-based via Geolocation API + Leaflet map, in the MVP.** Keep a manual place-name field as a fallback if a browser denies location. Open sub-question: "nearby" radius for the feed query — start with a generous ~5km and tune.
- **Demo surface:** laptop (`localhost`, zero setup) vs phone via HTTPS tunnel. Decide early — affects only how you serve, not the code.
- **Music vs ambiance split:** confirm the analyzer returns both basic dimensions even when focused on one mode.
- **Reactions/realtime:** Supabase Realtime is cheap if the feed already uses Supabase — decide if it's worth the extra hour.
