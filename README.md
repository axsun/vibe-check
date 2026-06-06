# Vibe Check 🎧

Record ~20s of a room → AI reads the vibe (loudness, music, lyrics, energy) → it lands
on a live map + feed near you. Plus a **Vibe Narrator** (ElevenLabs TTS) that speaks each
vibe aloud in a persona voice.

Built for the ElevenLabs × Rebuild hackathon. See `vibe-check-claude-code-spec.md` for the full spec.

## Run it (works with ZERO keys — mock analyzer + in-memory feed)

```bash
npm install
npm run dev        # client :5173  +  server :3001
```
Open http://localhost:5173. Mic + geolocation work on `localhost` automatically.

## Go live (flip mocks → real)

Fill in `.env` (copy from `.env.example`):

| Key | What lights up |
|---|---|
| `GEMINI_API_KEY` | Real audio → vibe analysis (else random mock vibe) |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Persistent storage + clip playback (else in-memory) |
| `ELEVENLABS_API_KEY` | The 🔊 Vibe Narrator |

**Supabase setup:** create a project → run `supabase/schema.sql` in the SQL editor →
Storage → new **public** bucket named `clips` → grab URL + anon + service_role keys →
`npm run seed` to populate nearby demo vibes.

Set your demo venue coords in `shared/seed-data.ts` (`DEMO_CENTER`).

## Phone / QR demo (the hero move)

Mic + geolocation need HTTPS off `localhost`. Front the dev server with a tunnel:
```bash
ngrok http 5173        # or: cloudflared tunnel --url http://localhost:5173
```
QR the tunnel URL onto the projector → audience records the room → feed fills live.

## Architecture

```
React+Vite (5173) ──/api proxy──► Express (3001)
  ├─ POST /api/vibe     clip+lat,lng+handle → [Supabase Storage] + [Gemini audio→JSON] → score → DB → row
  ├─ GET  /api/feed     recent nearby vibes
  └─ POST /api/narrate  text → ElevenLabs TTS → audio/mpeg
```
Shared contract lives in `shared/types.ts` + `shared/score.ts`.
