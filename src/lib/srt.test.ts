import { describe, it, expect, beforeEach } from 'vitest'
import { parseSrt, serializeSrt, resetCaptionIdCounter } from '@/lib/srt'
import { msToSrtTime, srtTimeToMs, formatDisplayTime } from '@/lib/time'
import { validateCaptions, countErrors } from '@/lib/validate'

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:03,500
Hello world

2
00:00:04,000 --> 00:00:06,000
Second line
with a break
`

describe('time utilities', () => {
  it('converts ms to SRT time', () => {
    expect(msToSrtTime(0)).toBe('00:00:00,000')
    expect(msToSrtTime(1500)).toBe('00:00:01,500')
    expect(msToSrtTime(3_661_234)).toBe('01:01:01,234')
  })

  it('parses SRT time to ms', () => {
    expect(srtTimeToMs('00:00:01,500')).toBe(1500)
    expect(srtTimeToMs('01:01:01.234')).toBe(3_661_234)
  })

  it('throws on invalid timestamps', () => {
    expect(() => srtTimeToMs('not-a-time')).toThrow()
  })

  it('formats display time', () => {
    expect(formatDisplayTime(1500)).toBe('0:01.50')
    expect(formatDisplayTime(3_661_000, false)).toBe('1:01:01')
  })
})

describe('SRT parser', () => {
  beforeEach(() => {
    resetCaptionIdCounter()
  })

  it('parses a valid SRT file', () => {
    const { captions, warnings } = parseSrt(SAMPLE_SRT)
    expect(warnings).toHaveLength(0)
    expect(captions).toHaveLength(2)
    expect(captions[0].text).toBe('Hello world')
    expect(captions[0].startMs).toBe(1000)
    expect(captions[0].endMs).toBe(3500)
    expect(captions[1].text).toBe('Second line\nwith a break')
  })

  it('warns on empty content', () => {
    const { captions, warnings } = parseSrt('   ')
    expect(captions).toHaveLength(0)
    expect(warnings[0]).toMatch(/empty/i)
  })

  it('skips invalid blocks and continues', () => {
    const broken = `1
bad timing
Hello

2
00:00:02,000 --> 00:00:03,000
OK
`
    const { captions, warnings } = parseSrt(broken)
    expect(captions).toHaveLength(1)
    expect(captions[0].text).toBe('OK')
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('round-trips through serializeSrt', () => {
    const { captions } = parseSrt(SAMPLE_SRT)
    const withErrors = captions.map((c) => ({ ...c, errors: [] }))
    const out = serializeSrt(withErrors)
    const again = parseSrt(out)
    expect(again.captions).toHaveLength(2)
    expect(again.captions[0].text).toBe('Hello world')
    expect(again.captions[1].startMs).toBe(4000)
  })
})

describe('caption validation', () => {
  it('flags empty text and invalid ranges', () => {
    const result = validateCaptions([
      {
        id: 'a',
        index: 1,
        startMs: 1000,
        endMs: 500,
        text: '',
        layer: 0,
      },
    ])
    expect(result[0].errors.map((e) => e.code)).toEqual(
      expect.arrayContaining(['EMPTY_TEXT', 'INVALID_RANGE']),
    )
  })

  it('detects overlaps on the same layer', () => {
    const result = validateCaptions([
      {
        id: 'a',
        index: 1,
        startMs: 0,
        endMs: 2000,
        text: 'One',
        layer: 0,
      },
      {
        id: 'b',
        index: 2,
        startMs: 1500,
        endMs: 3000,
        text: 'Two',
        layer: 0,
      },
    ])
    expect(result.find((c) => c.id === 'b')?.errors.some((e) => e.code === 'OVERLAP')).toBe(
      true,
    )
  })

  it('allows overlap across different layers', () => {
    const result = validateCaptions([
      {
        id: 'a',
        index: 1,
        startMs: 0,
        endMs: 2000,
        text: 'One',
        layer: 0,
      },
      {
        id: 'b',
        index: 2,
        startMs: 1500,
        endMs: 3000,
        text: 'Two',
        layer: 1,
      },
    ])
    expect(countErrors(result)).toBe(0)
  })

  it('flags out-of-bounds cues', () => {
    const result = validateCaptions(
      [
        {
          id: 'a',
          index: 1,
          startMs: 12_000,
          endMs: 13_000,
          text: 'Late',
          layer: 0,
        },
      ],
      10_000,
    )
    expect(result[0].errors.some((e) => e.code === 'OUT_OF_BOUNDS')).toBe(true)
  })
})
