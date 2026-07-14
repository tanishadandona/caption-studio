/** Time helpers for caption timestamps (ms ↔ SRT / display formats). */

export function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}

/** Convert milliseconds to SRT timestamp: HH:MM:SS,mmm */
export function msToSrtTime(ms: number): string {
  const clamped = Math.max(0, Math.round(ms))
  const hours = Math.floor(clamped / 3_600_000)
  const minutes = Math.floor((clamped % 3_600_000) / 60_000)
  const seconds = Math.floor((clamped % 60_000) / 1000)
  const millis = clamped % 1000
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`
}

/** Parse SRT / VTT-like timestamp to milliseconds. */
export function srtTimeToMs(value: string): number {
  const normalized = value.trim().replace('.', ',')
  const match = normalized.match(
    /^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2}),(\d{1,3})$/,
  )
  if (!match) {
    throw new Error(`Invalid timestamp: "${value}"`)
  }
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  const millis = Number(match[4].padEnd(3, '0'))
  return hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + millis
}

/** Compact UI display: m:ss.ms or h:mm:ss */
export function formatDisplayTime(ms: number, showMillis = true): string {
  const clamped = Math.max(0, Math.round(ms))
  const hours = Math.floor(clamped / 3_600_000)
  const minutes = Math.floor((clamped % 3_600_000) / 60_000)
  const seconds = Math.floor((clamped % 60_000) / 1000)
  const millis = clamped % 1000
  const base =
    hours > 0
      ? `${hours}:${pad(minutes)}:${pad(seconds)}`
      : `${minutes}:${pad(seconds)}`
  return showMillis ? `${base}.${pad(millis, 3).slice(0, 2)}` : base
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
