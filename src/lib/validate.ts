import type { CaptionCue, CaptionError } from '@/types/caption'

const MIN_DURATION_MS = 100

/**
 * Validate captions and attach per-cue errors.
 * Pure function — safe to call on every store update.
 */
export function validateCaptions(
  captions: Omit<CaptionCue, 'errors'>[] | CaptionCue[],
  videoDurationMs = 0,
): CaptionCue[] {
  const withBase: CaptionCue[] = captions.map((cue, i) => ({
    ...cue,
    index: i + 1,
    errors: [] as CaptionError[],
  }))

  // Group by layer for overlap checks
  const byLayer = new Map<number, CaptionCue[]>()
  for (const cue of withBase) {
    const list = byLayer.get(cue.layer) ?? []
    list.push(cue)
    byLayer.set(cue.layer, list)
  }

  for (const layerCues of byLayer.values()) {
    const sorted = [...layerCues].sort((a, b) => a.startMs - b.startMs)
    for (let i = 0; i < sorted.length; i++) {
      const cue = sorted[i]
      const errors: CaptionError[] = []

      if (!cue.text.trim()) {
        errors.push({
          code: 'EMPTY_TEXT',
          message: 'Caption text is empty.',
        })
      }

      if (cue.endMs <= cue.startMs) {
        errors.push({
          code: 'INVALID_RANGE',
          message: 'End time must be after start time.',
        })
      } else if (cue.endMs - cue.startMs < MIN_DURATION_MS) {
        errors.push({
          code: 'INVALID_RANGE',
          message: `Caption is shorter than ${MIN_DURATION_MS}ms.`,
        })
      }

      if (videoDurationMs > 0 && cue.startMs > videoDurationMs) {
        errors.push({
          code: 'OUT_OF_BOUNDS',
          message: 'Caption starts after video ends.',
        })
      }

      if (i > 0) {
        const prev = sorted[i - 1]
        if (cue.startMs < prev.endMs) {
          errors.push({
            code: 'OVERLAP',
            message: `Overlaps previous caption on layer ${cue.layer}.`,
          })
        }
      }

      cue.errors = errors
    }
  }

  return withBase.sort((a, b) => a.startMs - b.startMs || a.index - b.index)
}

export function countErrors(captions: CaptionCue[]): number {
  return captions.reduce((sum, c) => sum + c.errors.length, 0)
}
