// Pick a MediaRecorder mime the current browser actually supports.
// iOS Safari only does audio/mp4; Chrome/Firefox do webm. Server transcodes either.
export function pickMime(): string {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

export interface Recording {
  stop: () => Promise<Blob>
}

/** Start recording from the mic. Resolves with a controller exposing stop(). */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  rec.start()

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
          resolve(new Blob(chunks, { type: rec.mimeType || mime || 'audio/mp4' }))
        }
        rec.stop()
      }),
  }
}
