import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Vibe } from '../../shared/types'
import { makeSeedVibes } from '../../shared/seed-data'

// ── Local file store: zero external deps, persists across restarts ──
// data/vibes.json holds rows; data/clips/ holds the audio files (served at /clips).
export const DATA_DIR = join(process.cwd(), 'data')
export const CLIPS_DIR = join(DATA_DIR, 'clips')
const VIBES_FILE = join(DATA_DIR, 'vibes.json')

async function ensureDirs() {
  await mkdir(CLIPS_DIR, { recursive: true })
}

async function readAll(): Promise<Vibe[]> {
  try {
    return JSON.parse(await readFile(VIBES_FILE, 'utf8')) as Vibe[]
  } catch {
    return []
  }
}

async function writeAll(rows: Vibe[]): Promise<void> {
  await ensureDirs()
  await writeFile(VIBES_FILE, JSON.stringify(rows, null, 2))
}

export async function localList(): Promise<Vibe[]> {
  return readAll()
}

export async function localInsert(vibe: Omit<Vibe, 'id' | 'created_at'>): Promise<Vibe> {
  const rows = await readAll()
  const row: Vibe = { ...vibe, id: randomUUID(), created_at: new Date().toISOString() }
  rows.unshift(row)
  await writeAll(rows)
  return row
}

export async function localSaveClip(buffer: Buffer, contentType: string): Promise<string> {
  await ensureDirs()
  const ext = contentType.includes('mp4')
    ? 'm4a'
    : contentType.includes('webm')
      ? 'webm'
      : contentType.includes('mpeg')
        ? 'mp3'
        : 'audio'
  const filename = `${randomUUID()}.${ext}`
  await writeFile(join(CLIPS_DIR, filename), buffer)
  return `/clips/${filename}` // served by Express, proxied through Vite
}

/** Write starter vibes if the store is empty so the map/feed is never blank. */
export async function localSeedIfEmpty(): Promise<number> {
  const rows = await readAll()
  if (rows.length) return rows.length
  const seeds = makeSeedVibes()
  await writeAll(seeds)
  return seeds.length
}

/** Force-replace all rows with fresh seeds (npm run seed). */
export async function localReseed(): Promise<number> {
  const seeds = makeSeedVibes()
  await writeAll(seeds)
  return seeds.length
}
