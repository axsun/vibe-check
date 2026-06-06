# Vibe Check — working context for Claude Code

Full spec: `vibe-check-claude-code-spec.md`. Read it before large changes.

## What this is
Mobile web app: record ~20s of a venue → Gemini analyzes the audio into a structured
vibe → it appears on a Leaflet map + feed near the user. ElevenLabs "Vibe Narrator"
(TTS) speaks summaries aloud. Hackathon (ElevenLabs × Rebuild), 5pm hard deadline,
local-only demo, 2-person team (user = Person B / backend).

## Architecture
- Frontend: React + Vite (`/src`), proxies `/api` → Express.
- Backend: Express (`/server`), keys server-side only.
- Shared contract: `/shared/types.ts` (the API shapes) + `/shared/score.ts` (popping score). Don't fork these.
- AI: Gemini 2.5 Flash (audio→JSON) in `server/lib/gemini.ts`. ElevenLabs TTS in `server/lib/elevenlabs.ts`.
- Data: **local files by default** — `data/vibes.json` + `data/clips/` via `server/lib/localStore.ts`
  (clips served at `/clips`, proxied through Vite). `server/lib/store.ts` dispatches storage.
  Supabase is kept fully working behind `STORAGE_MODE=supabase` (one env var to switch back).

## Graceful degradation (important)
Every external dep is behind a flag in `server/lib/env.ts`. Missing key = mock, not crash:
no Gemini → random mock vibe; storage defaults to local files; no ElevenLabs → narrator 503.

## Conventions / gotchas
- Build the vertical slice first; timebox stretch (cut by ~1:45pm if MVP isn't solid).
- Audio: browsers record webm (Chrome) or mp4 (iOS); neither is Gemini-friendly, so
  `server/lib/transcode.ts` converts to mp3 via ffmpeg-static. Keep that step.
- Mic + geolocation need a secure context (localhost or HTTPS tunnel for phone).
- Never commit `.env`. Rotate the ElevenLabs key after the event (it was shared in chat).
- Keep the analyzer prompt in `server/prompts/vibe-analyzer.txt`, strict JSON.
- Set `DEMO_CENTER` in `shared/seed-data.ts` to the venue coords.
