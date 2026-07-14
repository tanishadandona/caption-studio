import type { CaptionCue } from '@/types/caption'
import { msToSrtTime, srtTimeToMs } from '@/lib/time'

export type ParseSrtResult = {
  captions: Omit<CaptionCue, 'errors'>[]
  warnings: string[]
}

let idCounter = 0

export function createCaptionId(): string {
  idCounter += 1
  return `cue-${Date.now().toString(36)}-${idCounter}`
}

/** Reset id counter — useful in tests. */
export function resetCaptionIdCounter(): void {
  idCounter = 0
}

/**
 * Parse SubRip (.srt) content into caption cues.
 * Tolerant of CRLF, blank lines, and optional BOM.
 */
export function parseSrt(content: string): ParseSrtResult {
  const warnings: string[] = []
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim()

  if (!normalized) {
    return { captions: [], warnings: ['SRT file is empty.'] }
  }

  const blocks = normalized.split(/\n{2,}/)
  const captions: Omit<CaptionCue, 'errors'>[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0)
    if (lines.length === 0) continue

    let offset = 0
    // Optional numeric index line
    if (/^\d+$/.test(lines[0])) {
      offset = 1
    }

    const timingLine = lines[offset]
    if (!timingLine) {
      warnings.push(`Skipped incomplete caption block: "${block.slice(0, 40)}"`)
      continue
    }

    const timingMatch = timingLine.match(
      /^(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/,
    )

    if (!timingMatch) {
      warnings.push(`Skipped block with invalid timing: "${timingLine}"`)
      continue
    }

    let startMs: number
    let endMs: number
    try {
      startMs = srtTimeToMs(timingMatch[1])
      endMs = srtTimeToMs(timingMatch[2])
    } catch {
      warnings.push(`Skipped block with unparsable timing: "${timingLine}"`)
      continue
    }

    const text = lines.slice(offset + 1).join('\n').trim()
    const index = captions.length + 1

    captions.push({
      id: createCaptionId(),
      index,
      startMs,
      endMs,
      text,
      layer: 0,
    })
  }

  return { captions, warnings }
}

/** Serialize captions back to valid SRT. */
export function serializeSrt(captions: CaptionCue[]): string {
  const sorted = [...captions].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)

  return sorted
    .map((cue, i) => {
      const header = String(i + 1)
      const timing = `${msToSrtTime(cue.startMs)} --> ${msToSrtTime(cue.endMs)}`
      return `${header}\n${timing}\n${cue.text}`
    })
    .join('\n\n')
    .concat(sorted.length ? '\n' : '')
}

/** Convert WebVTT cue list / TextTrackCueList-like data to captions. */
export function cuesFromVttLike(
  cues: Array<{ startTime: number; endTime: number; text: string }>,
): Omit<CaptionCue, 'errors'>[] {
  return cues.map((cue, i) => ({
    id: createCaptionId(),
    index: i + 1,
    startMs: Math.round(cue.startTime * 1000),
    endMs: Math.round(cue.endTime * 1000),
    text: cue.text.replace(/<[^>]+>/g, '').trim(),
    layer: 0,
  }))
}
