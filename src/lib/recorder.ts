// Clip recorder — captures a Blob via MediaRecorder. Either acquires its own
// mic stream, or reuses an existing one (e.g. from useAmbientMic) so the orb
// keeps receiving mic levels during the take.

export function pickMime(): string {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

export interface Recording {
  stop: () => Promise<{ blob: Blob; durationMs: number }>
  cancel: () => void
}

export interface StartOptions {
  /** Reuse an already-open mic stream. If omitted, the recorder opens its own. */
  stream?: MediaStream | null
}

export async function startRecording(opts: StartOptions = {}): Promise<Recording> {
  const ownStream = !opts.stream
  const stream = opts.stream ?? (await navigator.mediaDevices.getUserMedia({ audio: true }))
  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)

  const startedAt = performance.now()
  rec.start(250)

  const teardown = () => {
    if (ownStream) stream.getTracks().forEach((t) => t.stop())
  }

  return {
    stop: () =>
      new Promise<{ blob: Blob; durationMs: number }>((resolve) => {
        rec.onstop = () => {
          teardown()
          resolve({
            blob: new Blob(chunks, { type: rec.mimeType || mime || 'audio/mp4' }),
            durationMs: performance.now() - startedAt,
          })
        }
        if (rec.state !== 'inactive') rec.stop()
        else {
          teardown()
          resolve({
            blob: new Blob(chunks, { type: rec.mimeType || mime || 'audio/mp4' }),
            durationMs: performance.now() - startedAt,
          })
        }
      }),
    cancel: () => {
      teardown()
      if (rec.state !== 'inactive') {
        try { rec.stop() } catch {}
      }
    },
  }
}
