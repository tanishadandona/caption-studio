import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { styleToCss } from '@/lib/styles'
import { formatDisplayTime } from '@/lib/time'
import { cn } from '@/lib/cn'

type VideoPlayerProps = {
  videoRef: RefObject<HTMLVideoElement | null>
}

export function VideoPlayer({ videoRef }: VideoPlayerProps) {
  const video = useEditorStore((s) => s.video)
  const style = useEditorStore((s) => s.style)
  const captions = useEditorStore((s) => s.captions)
  const currentTimeMs = useEditorStore((s) => s.currentTimeMs)
  const isPlaying = useEditorStore((s) => s.isPlaying)
  const selectedId = useEditorStore((s) => s.selectedId)
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime)
  const setPlaying = useEditorStore((s) => s.setPlaying)
  const setPosition = useEditorStore((s) => s.setPosition)
  const selectCaption = useEditorStore((s) => s.selectCaption)

  const overlayRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const active =
    captions.find(
      (c) => currentTimeMs >= c.startMs && currentTimeMs < c.endMs,
    ) ?? null

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onTimeUpdate = () => setCurrentTime(el.currentTime * 1000)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [videoRef, setCurrentTime, setPlaying, video?.url])

  const seek = useCallback(
    (ms: number) => {
      const el = videoRef.current
      if (!el) return
      el.currentTime = ms / 1000
      setCurrentTime(ms)
    },
    [videoRef, setCurrentTime],
  )

  const togglePlay = () => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }

  const onOverlayPointerDown = (e: ReactPointerEvent) => {
    if (!overlayRef.current) return
    e.preventDefault()
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    moveToPointer(e)
  }

  const onOverlayPointerMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return
    moveToPointer(e)
  }

  const onOverlayPointerUp = () => {
    dragging.current = false
  }

  const moveToPointer = (e: ReactPointerEvent) => {
    const box = overlayRef.current?.getBoundingClientRect()
    if (!box) return
    const x = ((e.clientX - box.left) / box.width) * 100
    const y = ((e.clientY - box.top) / box.height) * 100
    setPosition(x, y)
  }

  if (!video) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-200 text-sm text-slate-500">
        No video loaded
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={overlayRef}
        className="relative aspect-video overflow-hidden rounded-xl bg-slate-950 shadow-inner ring-1 ring-slate-800/40"
      >
        <video
          ref={videoRef}
          src={video.url}
          className="h-full w-full object-contain"
          playsInline
          aria-label={`Video preview: ${video.name}`}
        />

        {/* Caption overlay — drag to reposition */}
        <div
          className="absolute inset-0 cursor-crosshair"
          onPointerDown={onOverlayPointerDown}
          onPointerMove={onOverlayPointerMove}
          onPointerUp={onOverlayPointerUp}
          onPointerCancel={onOverlayPointerUp}
          role="presentation"
        >
          {active && (
            <div
              className={cn(
                'absolute max-w-[90%] -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75',
                selectedId === active.id && 'ring-2 ring-teal-400 ring-offset-2 ring-offset-transparent',
              )}
              style={{
                left: `${style.position.x}%`,
                top: `${style.position.y}%`,
                ...styleToCss(style),
              }}
              onClick={(e) => {
                e.stopPropagation()
                selectCaption(active.id)
              }}
              aria-live="polite"
            >
              {active.text || (
                <span className="italic opacity-60">Empty caption</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <IconButton
            label="Jump back 1s"
            onClick={() => seek(Math.max(0, currentTimeMs - 1000))}
          >
            <SkipBack className="h-4 w-4" />
          </IconButton>
          <IconButton label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay}>
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </IconButton>
          <IconButton
            label="Jump forward 1s"
            onClick={() =>
              seek(Math.min(video.durationMs, currentTimeMs + 1000))
            }
          >
            <SkipForward className="h-4 w-4" />
          </IconButton>
        </div>

        <input
          type="range"
          min={0}
          max={video.durationMs || 1}
          step={10}
          value={currentTimeMs}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-teal-600"
          aria-label="Seek video"
        />

        <span className="min-w-[7.5rem] text-right font-mono text-xs text-slate-600 tabular-nums">
          {formatDisplayTime(currentTimeMs)} /{' '}
          {formatDisplayTime(video.durationMs, false)}
        </span>
      </div>
    </div>
  )
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-teal-400 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
    >
      {children}
    </button>
  )
}
