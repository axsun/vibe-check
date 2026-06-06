// Mocked social graph (POC). No accounts/auth — just a small followed-handles list.
// Match against the existing emoji `handle` strings in seed-data.ts.

export const FOLLOWED_HANDLES: readonly string[] = [
  '🌙 nora',
  '🍸 emma',
  '🦄 nightowl',
] as const

/** Mock: nearby friends "also vibed here" — surfaces under a gold social footer. */
export const FRIENDS_AT_PLACE: Record<string, string[]> = {
  'Le Bain (rooftop)': ['🦄 nightowl', '🍸 emma'],
  'The Smith': ['🍸 emma'],
  'Quiet Bean': ['🌙 nora', '🍸 emma'],
  'Banter Bar': ['🌙 nora'],
}

export function friendsAt(placeName: string): string[] {
  return FRIENDS_AT_PLACE[placeName] ?? []
}

export function isFriend(handle: string | null | undefined): boolean {
  if (!handle) return false
  return FOLLOWED_HANDLES.includes(handle)
}

export function friendCountAtPlace(handles: string[]): number {
  return handles.filter(isFriend).length
}
