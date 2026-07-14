import type { CaptionCue } from '@/types/caption'
import { cuesFromVttLike, parseSrt } from '@/lib/srt'

export type EmbeddedTrackResult = {
  captions: Omit<CaptionCue, 'errors'>[]
  trackLabel: string | null
  source: 'text-track' | 'none'
  message: string
}

/**
 * Attempt to extract caption cues from an HTML video element's text tracks.
 * Works when the browser exposes in-band or already-attached tracks.
 * Many mp4 files embed softsubs that browsers don't expose — in that case
 * we return source: 'none' and the UI prompts for an external SRT.
 */
export async function extractEmbeddedSubtitles(
  video: HTMLVideoElement,
  timeoutMs = 2500,
): Promise<EmbeddedTrackResult> {
  // Ensure metadata is available
  if (video.readyState < 1) {
    await waitForEvent(video, 'loadedmetadata', timeoutMs)
  }

  const tracks = Array.from(video.textTracks)

  // Prefer caption / subtitle kind
  const preferred =
    tracks.find((t) => t.kind === 'captions' || t.kind === 'subtitles') ??
    tracks[0]

  if (!preferred) {
    return {
      captions: [],
      trackLabel: null,
      source: 'none',
      message:
        'No embedded subtitle track detected. Upload an SRT file to continue.',
    }
  }

  preferred.mode = 'hidden'

  // Some browsers populate cues asynchronously after mode change
  await wait(300)

  const cues = preferred.cues
  if (!cues || cues.length === 0) {
    return {
      captions: [],
      trackLabel: preferred.label || preferred.language || 'Track 1',
      source: 'none',
      message:
        'An embedded track was found but no cues are readable in-browser. Upload an external SRT file.',
    }
  }

  const extracted: Array<{ startTime: number; endTime: number; text: string }> =
    []

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i] as TextTrackCue & { text?: string }
    const text =
      'text' in cue && typeof cue.text === 'string'
        ? cue.text
        : (cue as VTTCue).getCueAsHTML?.()
          ? stripHtml((cue as VTTCue).getCueAsHTML().textContent ?? '')
          : ''

    extracted.push({
      startTime: cue.startTime,
      endTime: cue.endTime,
      text: typeof text === 'string' ? text : '',
    })
  }

  return {
    captions: cuesFromVttLike(extracted),
    trackLabel: preferred.label || preferred.language || 'Embedded',
    source: 'text-track',
    message: `Extracted ${extracted.length} cue(s) from embedded track.`,
  }
}

/**
 * Attach an external VTT/SRT blob as a text track for native playback testing.
 * Primary editing still uses our parsed CaptionCue model.
 */
export function attachExternalTrack(
  video: HTMLVideoElement,
  srtContent: string,
  label = 'External SRT',
): () => void {
  // Convert SRT → WebVTT for <track>
  const vtt = srtToVtt(srtContent)
  const blob = new Blob([vtt], { type: 'text/vtt' })
  const url = URL.createObjectURL(blob)

  const track = document.createElement('track')
  track.kind = 'captions'
  track.label = label
  track.srclang = 'en'
  track.src = url
  track.default = false

  video.appendChild(track)

  return () => {
    track.remove()
    URL.revokeObjectURL(url)
  }
}

export function srtToVtt(srt: string): string {
  const { captions } = parseSrt(srt)
  const body = captions
    .map((c) => {
      const start = msToVtt(c.startMs)
      const end = msToVtt(c.endMs)
      return `${start} --> ${end}\n${c.text}`
    })
    .join('\n\n')
  return `WEBVTT\n\n${body}\n`
}

function msToVtt(ms: number): string {
  const clamped = Math.max(0, Math.round(ms))
  const h = Math.floor(clamped / 3_600_000)
  const m = Math.floor((clamped % 3_600_000) / 60_000)
  const s = Math.floor((clamped % 60_000) / 1000)
  const millis = clamped % 1000
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(millis, 3)}`
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim()
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForEvent(
  el: HTMLMediaElement,
  event: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for ${event}`))
    }, timeoutMs)

    const onEvent = () => {
      cleanup()
      resolve()
    }

    const cleanup = () => {
      clearTimeout(timer)
      el.removeEventListener(event, onEvent)
    }

    el.addEventListener(event, onEvent)
  })
}
