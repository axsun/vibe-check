import type { Vibe } from '../../shared/types'

export interface EmojiTag {
  key: string
  label: string
  emoji: string
}

const REGISTER_EMOJI: Record<string, string> = {
  hyped: '⚡',
  lively: '✨',
  chill: '😌',
  dead: '💀',
}

export function vibeTags(v: Vibe): EmojiTag[] {
  const out: EmojiTag[] = []
  if (v.music_present && v.music_genre) out.push({ key: 'genre', label: v.music_genre, emoji: '🎶' })
  if (v.music_present) {
    const k = v.has_lyrics ? 'lyrics' : 'no lyrics'
    out.push({ key: k, label: k, emoji: v.has_lyrics ? '🎤' : '🎵' })
  } else {
    out.push({ key: 'no music', label: 'no music', emoji: '🗣️' })
  }
  out.push({ key: v.emotional_register, label: v.emotional_register, emoji: REGISTER_EMOJI[v.emotional_register] ?? '✨' })
  return out
}
