# Vibe Check — Design System

> Drop-in design context for Claude Code. Read this before building any UI. The goal is a **friendly, sleek consumer app**: map-first, score-driven, powered by the people you trust, with going-out personality.

## North star

**"Going-out energy you can trust."** You open the app, see what's popping near you *right now*, weighted by your people's taste, and decide where to go — fast and fun.

### What we borrow from each reference
- **Partiful → personality.** Expressive display type, gradient + glow energy, a satisfying reveal moment, cheeky-but-warm microcopy. The app should feel like a friend hyping you up, not a utility.
- **Dice → polish.** Sleek dark cards, bold and glanceable, music/event-forward, minimal chrome. Nothing cluttered.
- **Google Maps "vibe nearby" → structure.** Map-first home, colored pins, a draggable "nearby" feed sheet, live and glanceable.
- **Beli → social trust.** People you follow, trust signals, prominent scores, taste-match. Friends' vibes are highlighted over strangers'.

Design tension to hold: **playful (Partiful) but not noisy (Dice).** When in doubt, calm the layout and let one expressive element (the score, a gradient, a reveal) carry the energy.

---

## Foundations

### Color (dark-default, violet-forward)
The palette is **monochromatic violet/indigo** — no orange, no cyan, no rainbow. Heat is read by *brightness and saturation within the violet family*, not by hopping colors. Gold stays exclusive to social signals.

```
--bg       #0B0B12   /* app background */
--panel    #15151F   /* cards, sheets */
--panel2   #1D1D2B   /* elevated / chips */
--text     #F2F2F7   /* primary */
--muted    #9AA0B5   /* secondary */
--accent   #C247FF   /* magenta-violet — primary action, hype */
--accent2  #6E5BFF   /* indigo-violet — lively / secondary */
--indigo   #4A3DFF   /* deep base / info */
--gold     #FFC861   /* SOCIAL: friends / trust signals ONLY */
--vibe-gradient: linear-gradient(135deg, #2A1B6B 0%, #4A3DFF 28%, #6E5BFF 55%, #A468FF 80%, #C247FF 100%);
```
Topbar is `--indigo → --accent2 → --heat-popping` — calm violet wash, not the loud pink→violet of v1.

### The Vibe Heat scale (the signature element)
Popping score → tier within the violet family. Hotter = brighter, more magenta. Cooler = deeper indigo. Use it everywhere a score appears (pins, chips, glows, reveal). Make it the one consistent visual language of the app.

| Score | Label | Color | Feel |
|---|---|---|---|
| 80–100 | Peak | `#E254FF` | hot magenta-violet, on fire |
| 60–79 | Popping | `#A468FF` | bright violet, buzzing |
| 40–59 | Lively | `#6E5BFF` | indigo-violet, warm |
| 20–39 | Chill | `#4A3DFF` | deep indigo, easy |
| 0–19 | Quiet | `#4B4F70` | slate-violet, low-key |

> Use **one** heat color for a score, everywhere it appears — pins, cards, the reveal. Render the score as a **chip with a soft glow** in its heat color (`box-shadow: 0 0 16px <heat>55`), not a bare number. Define it once and reuse it; never hand-pick a color per screen.

### Typography
Two free Fontshare faces; system fallbacks so it runs offline.
- **Display — "Clash Display"** (600/700): hero score numbers, big vibe labels, screen titles. This is the Partiful expressiveness. Tabular figures for scores.
- **UI/body — "General Sans"** (400/500/600): everything else. Clean, friendly, sleek (Dice).

```
Display XL  48 / 700   (score reveal, count-up)
Display L   32 / 700   (screen titles)
H1          24 / 600
H2          19 / 600
Body        16 / 450
Small       14 / 500
Micro       12 / 600 uppercase, +4% tracking (tags, labels)
```

### Shape, depth, spacing
- Radius: cards `18`, sheets `24` (top corners), buttons `14`, chips/pills `999`.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32.
- Depth: soft shadows `0 8px 24px rgba(0,0,0,.35)`; **colored glow** reserved for score chips + the record button. Map overlays use a glassy blur (`backdrop-filter: blur(16px)` over `--surface` at 70%).

### Motion
Quick and springy (180–280ms, ease-out). Reserve the "wow" for two beats:
1. **Score count-up** on reveal (0 → score, ~600ms) with the heat color filling.
2. **Fresh-pin pulse** on the map when a new vibe lands.
Everything else is subtle: sheet drag, chip select, card press (scale 0.98).

### Icon + emoji language
Vibe tags come from `tags()` in `src/components/VibeCard.tsx` (currently plain text: genre, lyrics/no lyrics, register). Upgrade to emoji-forward: 🎶 genre, 🎤 lyrics, 🗣️ chatty, 🤫 quiet, ⚡ hyped, ✨ lively, 😌 chill, 💀 dead. Nav/system icons: minimal rounded line icons only.

### Voice & microcopy
Friendly, witty, short — a hyped friend, never corny. Examples:
- Prompt: **"What's the vibe?"**
- Recording: **"Listening in…"**
- Analyzing: **"Reading the room…"**
- Reveal: **"Called it."** / **"Ooh."**
- Social proof: **"3 of your people vibed here."**
- Empty map: **"Quiet around here. Be the first to call it."**

---

## Components (the kit)

1. **Score chip** — pill or circle, tabular number + 🔥, filled with heat color, soft glow. Sizes: `sm` (cards/pins), `hero` (reveal, with count-up).
2. **Vibe card** (feed + place) — Dice-glanceable: place name (Display), score chip top-right, one-line summary, emoji tag row, mini waveform + play, and a **social footer** (Beli): stacked friend avatars + "Nora & 2 friends vibed here" in `--gold`. Press → place detail.
3. **Map pin** — a colored dot sized + colored by the heat scale; friends' vibes get a `--gold` ring; fresh (<10 min) pins pulse. Tap → place detail sheet.
4. **Bottom sheet** (Maps pattern) — drag handle, 3 detents (peek / half / full). Hosts the "vibe nearby" feed and place detail.
5. **Record CTA** — large circular button with `--vibe-gradient` fill and outer glow; center the home experience. While recording: live waveform + a ring timer counting to 20s.
6. **Filter chips** — horizontal pill row: All / ⚡ Lively / 😌 Chill / 🎤 Lyrics / 🎶 Genre. Active = filled accent.
7. **Social proof row** (Beli) — stacked rounded avatars (max 3 + "+N"), gold accent, "people you follow."
8. **Bottom nav** — 3 items: **Map** · **Check in** (center, raised, gradient orb) · **Feed**. Center button is the hero action (Instagram/Beli pattern).
9. **Clip player** — the audio payoff is playing the **real recorded clip** (hear the actual room). Make this the audio moment on cards + place detail. Synthesized voice-over is optional, off by default, never auto-played.
10. **States** — "Reading the room" listening animation (pulsing concentric rings in heat colors); empty states with playful copy; skeleton cards while the feed loads.

### Layout
Mobile-first, single column, max-width 540 centered. Map is full-bleed behind a translucent top bar and the bottom sheet. Generous touch targets (≥44px).

---

## Social layer (Beli-style), kept POC-small
- **Follow** people; their vibes are **highlighted** (gold ring/footer) and float higher in the feed.
- **Taste-match** ("Your taste twin loved this") is a *vision* element — show the UI affordance, fake the data for the demo.
- Don't build accounts/auth for the POC. Drive the gold highlighting from `shared/friends.ts` (a hardcoded followed-handles list + `isFriend(handle)`) against the existing emoji `handle`. Flag it as mocked.

---

## Guardrails (matches how we work)
- **Consistency over novelty.** This doc is the single source of truth — reuse the same tokens, components, heat-color language, and motion on every screen. No one-off styles.
- **Local-only.** No accounts, no database, no servers to configure. Seeded/mock data is fine; the app should always just run.
- **One expressive moment per screen.** Resist decorating everything. If a screen feels busy, cut chrome before adding it.
- **Design leads.** Change any code that gets in the way of a better experience.
- Mock the social graph (a small followed-handles list); don't pull in auth.
