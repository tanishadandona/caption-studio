import {
  useCallback,
  useMemo,
  useRef,
  memo,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { formatDisplayTime, clamp } from '@/lib/time'
import { cn } from '@/lib/cn'
import type { CaptionCue } from '@/types/caption'

const TRACK_HEIGHT = 36
const LAYERS = 2
const BASE_PX_PER_SEC = 80

type DragMode = 'move' | 'resize-start' | 'resize-end'

export function Timeline() {
  const video = useEditorStore((s) => s.video)
  const captions = useEditorStore((s) => s.captions)
  const timelineZoom = useEditorStore((s) => s.timelineZoom)
  
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime)
  const setTimelineZoom = useEditorStore((s) => s.setTimelineZoom)

  const scrollRef = useRef<HTMLDivElement>(null)

  const durationMs = video?.durationMs || 10_000
  const pxPerMs = (BASE_PX_PER_SEC * timelineZoom) / 1000
  const widthPx = Math.max(600, durationMs * pxPerMs)

  const ticks = useMemo(() => {
    const stepMs = timelineZoom >= 2 ? 1000 : timelineZoom >= 1 ? 2000 : 5000
    const items: number[] = []
    for (let t = 0; t <= durationMs; t += stepMs) items.push(t)
    return items
  }, [durationMs, timelineZoom])

  // Group captions by layer to avoid filtering on every render
  const captionsByLayer = useMemo(() => {
    const layers: CaptionCue[][] = Array.from({ length: LAYERS }, () => [])
    for (let i = 0; i < captions.length; i++) {
      const c = captions[i]
      if (c.layer >= 0 && c.layer < LAYERS) {
        layers[c.layer].push(c)
      }
    }
    return layers
  }, [captions])

  const handleSeek = useCallback(
    (clientX: number) => {
      const scroller = scrollRef.current
      if (!scroller) return
      const rect = scroller.getBoundingClientRect()
      const x = clientX - rect.left + scroller.scrollLeft
      const ms = clamp(x / pxPerMs, 0, durationMs)
      setCurrentTime(ms)
      
      const videoEl = document.querySelector('video')
      if (videoEl) videoEl.currentTime = ms / 1000
    },
    [durationMs, pxPerMs, setCurrentTime],
  )

  return (
    <section className="rounded-xl border border-slate-200 bg-white" aria-labelledby="timeline-heading">
      <TimelineHeader zoom={timelineZoom} onZoom={setTimelineZoom} />

      <div
        ref={scrollRef}
        className="overflow-x-auto"
        onClick={(e) => handleSeek(e.clientX)}
      >
        <div className="relative select-none" style={{ width: widthPx, minHeight: 120 }}>
          <Ruler ticks={ticks} pxPerMs={pxPerMs} />

          {captionsByLayer.map((layerCaptions, layerIndex) => (
            <LayerTrack
              key={layerIndex}
              layerIndex={layerIndex}
              captions={layerCaptions}
              pxPerMs={pxPerMs}
              durationMs={durationMs}
            />
          ))}

          <Playhead pxPerMs={pxPerMs} />
        </div>
      </div>
    </section>
  )
}

// --- Subcomponents ---

const TimelineHeader = memo(function TimelineHeader({
  zoom,
  onZoom,
}: {
  zoom: number
  onZoom: (z: number) => void
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
      <div>
        <h2 id="timeline-heading" className="font-display text-sm font-semibold text-slate-900">
          Timeline
        </h2>
        <p className="text-xs text-slate-500">Drag segments · handles resize · click ruler to seek</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => onZoom(zoom - 0.25)}
          className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:border-teal-400"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center font-mono text-[11px] text-slate-500">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => onZoom(zoom + 0.25)}
          className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:border-teal-400"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
})

const Ruler = memo(function Ruler({ ticks, pxPerMs }: { ticks: number[]; pxPerMs: number }) {
  return (
    <div className="relative h-7 border-b border-slate-100 bg-slate-50">
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute top-0 h-full border-l border-slate-200 pl-1"
          style={{ left: t * pxPerMs }}
        >
          <span className="font-mono text-[10px] text-slate-400">
            {formatDisplayTime(t, false)}
          </span>
        </div>
      ))}
    </div>
  )
})

const LayerTrack = memo(function LayerTrack({
  layerIndex,
  captions,
  pxPerMs,
  durationMs,
}: {
  layerIndex: number
  captions: CaptionCue[]
  pxPerMs: number
  durationMs: number
}) {
  return (
    <div
      className="relative border-b border-slate-100 bg-[linear-gradient(90deg,transparent_49%,rgba(148,163,184,0.15)_50%,transparent_51%)] bg-[length:20px_100%]"
      style={{ height: TRACK_HEIGHT + 8 }}
      aria-label={`Caption layer ${layerIndex}`}
    >
      <span className="sticky left-0 z-10 inline-block bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        L{layerIndex}
      </span>
      {captions.map((cue) => (
        <CaptionSegment
          key={cue.id}
          cue={cue}
          pxPerMs={pxPerMs}
          durationMs={durationMs}
        />
      ))}
    </div>
  )
})

const CaptionSegment = memo(function CaptionSegment({
  cue,
  pxPerMs,
  durationMs,
}: {
  cue: CaptionCue
  pxPerMs: number
  durationMs: number
}) {
  // Targeted selector: only re-renders when this specific caption becomes selected/unselected
  const selected = useEditorStore((s) => s.selectedId === cue.id)
  
  const selectCaption = useEditorStore((s) => s.selectCaption)
  const updateCaption = useEditorStore((s) => s.updateCaption)
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime)

  const dragRef = useRef<{
    mode: DragMode
    originX: number
    originStart: number
    originEnd: number
  } | null>(null)

  const hasError = cue.errors.length > 0
  const left = cue.startMs * pxPerMs
  const width = Math.max(8, (cue.endMs - cue.startMs) * pxPerMs)

  const handlePointerDown = (e: ReactPointerEvent, mode: DragMode) => {
    e.stopPropagation()
    e.preventDefault()
    selectCaption(cue.id)
    dragRef.current = {
      mode,
      originX: e.clientX,
      originStart: cue.startMs,
      originEnd: cue.endMs,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current
    if (!drag) return

    const deltaMs = (e.clientX - drag.originX) / pxPerMs

    if (drag.mode === 'move') {
      const dur = drag.originEnd - drag.originStart
      let start = drag.originStart + deltaMs
      start = clamp(start, 0, Math.max(0, durationMs - dur))
      updateCaption(cue.id, { startMs: Math.round(start), endMs: Math.round(start + dur) })
    } else if (drag.mode === 'resize-start') {
      const start = clamp(drag.originStart + deltaMs, 0, drag.originEnd - 100)
      updateCaption(cue.id, { startMs: Math.round(start) })
    } else {
      const end = clamp(drag.originEnd + deltaMs, drag.originStart + 100, durationMs)
      updateCaption(cue.id, { endMs: Math.round(end) })
    }
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectCaption(cue.id)
      setCurrentTime(cue.startMs)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Caption ${cue.index}: ${cue.text.slice(0, 40)}`}
      className={cn(
        'absolute top-1.5 flex h-8 items-stretch overflow-hidden rounded-md text-[11px] font-medium shadow-sm transition-colors',
        selected
          ? 'z-20 bg-teal-600 text-white ring-2 ring-teal-300'
          : hasError
            ? 'z-10 bg-amber-500 text-white'
            : 'z-10 bg-slate-700 text-slate-50 hover:bg-slate-600',
      )}
      style={{ left, width }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <Handle edge="start" onPointerDown={(e) => handlePointerDown(e, 'resize-start')} />
      <div
        className="flex flex-1 cursor-grab items-center truncate px-1 active:cursor-grabbing"
        onPointerDown={(e) => handlePointerDown(e, 'move')}
      >
        {cue.text || 'Empty'}
      </div>
      <Handle edge="end" onPointerDown={(e) => handlePointerDown(e, 'resize-end')} />
    </div>
  )
})

const Handle = memo(function Handle({
  edge,
  onPointerDown,
}: {
  edge: 'start' | 'end'
  onPointerDown: (e: ReactPointerEvent) => void
}) {
  return (
    <div
      className={cn(
        'w-1.5 shrink-0 cursor-ew-resize bg-black/20 hover:bg-black/40',
        edge === 'start' ? 'rounded-l-md' : 'rounded-r-md',
      )}
      onPointerDown={onPointerDown}
      aria-hidden
    />
  )
})

const Playhead = memo(function Playhead({ pxPerMs }: { pxPerMs: number }) {
  // Isolate high-frequency currentTimeMs updates to only re-render the playhead!
  const currentTimeMs = useEditorStore((s) => s.currentTimeMs)
  
  return (
    <div
      className="pointer-events-none absolute bottom-0 top-0 z-30 w-px bg-rose-500"
      style={{ left: currentTimeMs * pxPerMs }}
      aria-hidden
    >
      <div className="absolute -left-1.5 top-0 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-rose-500" />
    </div>
  )
})
