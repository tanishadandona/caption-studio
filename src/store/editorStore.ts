import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  CaptionCue,
  CaptionStyle,
  StylePresetId,
  SubtitleSource,
  VideoAsset,
} from '@/types/caption'
import { createCaptionId } from '@/lib/srt'
import { DEFAULT_STYLE, STYLE_PRESETS } from '@/lib/styles'
import { validateCaptions } from '@/lib/validate'
import { clamp } from '@/lib/time'

type Notice = {
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
} | null

type EditorState = {
  video: VideoAsset | null
  captions: CaptionCue[]
  style: CaptionStyle
  activePreset: StylePresetId | null
  selectedId: string | null
  currentTimeMs: number
  isPlaying: boolean
  subtitleSource: SubtitleSource
  notice: Notice
  timelineZoom: number

  setVideo: (video: VideoAsset | null) => void
  setCaptions: (
    captions: Omit<CaptionCue, 'errors'>[],
    source: SubtitleSource,
  ) => void
  selectCaption: (id: string | null) => void
  updateCaption: (id: string, patch: Partial<CaptionCue>) => void
  addCaption: (atMs?: number) => void
  deleteCaption: (id: string) => void
  splitCaption: (id: string, atMs: number) => void
  setStyle: (patch: Partial<CaptionStyle>) => void
  applyPreset: (presetId: StylePresetId) => void
  setPosition: (x: number, y: number) => void
  setCurrentTime: (ms: number) => void
  setPlaying: (playing: boolean) => void
  setTimelineZoom: (zoom: number) => void
  setNotice: (notice: Notice) => void
  getActiveCaption: () => CaptionCue | null
  resetProject: () => void
}

function reindexAndValidate(
  captions: Omit<CaptionCue, 'errors'>[] | CaptionCue[],
  durationMs: number,
): CaptionCue[] {
  return validateCaptions(captions, durationMs)
}

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    video: null,
    captions: [],
    style: { ...DEFAULT_STYLE, position: { ...DEFAULT_STYLE.position } },
    activePreset: 'clean',
    selectedId: null,
    currentTimeMs: 0,
    isPlaying: false,
    subtitleSource: null,
    notice: null,
    timelineZoom: 1,

    setVideo: (video) => {
      set({ video, currentTimeMs: 0, isPlaying: false })
      // Re-validate against new duration
      const { captions } = get()
      if (captions.length) {
        set({
          captions: reindexAndValidate(captions, video?.durationMs ?? 0),
        })
      }
    },

    setCaptions: (captions, source) => {
      const duration = get().video?.durationMs ?? 0
      const validated = reindexAndValidate(captions, duration)
      set({
        captions: validated,
        subtitleSource: source,
        selectedId: validated[0]?.id ?? null,
      })
    },

    selectCaption: (id) => set({ selectedId: id }),

    updateCaption: (id, patch) => {
      const { captions, video } = get()
      const next = captions.map((c) =>
        c.id === id
          ? {
              ...c,
              ...patch,
              id: c.id,
            }
          : c,
      )
      set({
        captions: reindexAndValidate(next, video?.durationMs ?? 0),
      })
    },

    addCaption: (atMs) => {
      const { captions, video, currentTimeMs } = get()
      const start = Math.round(atMs ?? currentTimeMs)
      const duration = video?.durationMs ?? start + 2000
      const end = Math.min(start + 2000, duration || start + 2000)

      const cue: Omit<CaptionCue, 'errors'> = {
        id: createCaptionId(),
        index: captions.length + 1,
        startMs: start,
        endMs: Math.max(start + 500, end),
        text: 'New caption',
        layer: 0,
      }

      const validated = reindexAndValidate([...captions, cue], duration)
      set({ captions: validated, selectedId: cue.id })
    },

    deleteCaption: (id) => {
      const { captions, video, selectedId } = get()
      const next = captions.filter((c) => c.id !== id)
      const validated = reindexAndValidate(next, video?.durationMs ?? 0)
      set({
        captions: validated,
        selectedId:
          selectedId === id ? (validated[0]?.id ?? null) : selectedId,
      })
    },

    splitCaption: (id, atMs) => {
      const { captions, video } = get()
      const target = captions.find((c) => c.id === id)
      if (!target) return
      if (atMs <= target.startMs + 100 || atMs >= target.endMs - 100) return

      const left: Omit<CaptionCue, 'errors'> = {
        ...target,
        endMs: atMs,
      }
      const right: Omit<CaptionCue, 'errors'> = {
        id: createCaptionId(),
        index: target.index + 1,
        startMs: atMs,
        endMs: target.endMs,
        text: target.text,
        layer: target.layer,
      }

      const next = captions.flatMap((c) =>
        c.id === id ? [left, right] : [c],
      )
      set({
        captions: reindexAndValidate(next, video?.durationMs ?? 0),
        selectedId: right.id,
      })
    },

    setStyle: (patch) => {
      set((state) => ({
        style: {
          ...state.style,
          ...patch,
          position: patch.position
            ? { ...patch.position }
            : state.style.position,
        },
        activePreset: null,
      }))
    },

    applyPreset: (presetId) => {
      const preset = STYLE_PRESETS.find((p) => p.id === presetId)
      if (!preset) return
      set((state) => ({
        style: {
          ...state.style,
          ...preset.style,
          position: preset.style.position
            ? { ...preset.style.position }
            : state.style.position,
        },
        activePreset: presetId,
      }))
    },

    setPosition: (x, y) => {
      set((state) => ({
        style: {
          ...state.style,
          position: {
            x: clamp(x, 5, 95),
            y: clamp(y, 5, 95),
          },
        },
        activePreset: null,
      }))
    },

    setCurrentTime: (ms) => set({ currentTimeMs: Math.max(0, ms) }),
    setPlaying: (playing) => set({ isPlaying: playing }),
    setTimelineZoom: (zoom) =>
      set({ timelineZoom: clamp(zoom, 0.5, 4) }),
    setNotice: (notice) => set({ notice }),

    getActiveCaption: () => {
      const { captions, currentTimeMs } = get()
      return (
        captions.find(
          (c) => currentTimeMs >= c.startMs && currentTimeMs < c.endMs,
        ) ?? null
      )
    },

    resetProject: () => {
      const { video } = get()
      if (video?.url) URL.revokeObjectURL(video.url)
      set({
        video: null,
        captions: [],
        style: { ...DEFAULT_STYLE, position: { ...DEFAULT_STYLE.position } },
        activePreset: 'clean',
        selectedId: null,
        currentTimeMs: 0,
        isPlaying: false,
        subtitleSource: null,
        notice: null,
        timelineZoom: 1,
      })
    },
  })),
)
