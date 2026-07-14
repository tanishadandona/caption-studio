import { useEffect, useRef } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { formatDisplayTime, msToSrtTime, srtTimeToMs } from '@/lib/time'
import { cn } from '@/lib/cn'

export function CaptionList() {
  const captions = useEditorStore((s) => s.captions)
  const selectedId = useEditorStore((s) => s.selectedId)
  const selectCaption = useEditorStore((s) => s.selectCaption)
  const updateCaption = useEditorStore((s) => s.updateCaption)
  const deleteCaption = useEditorStore((s) => s.deleteCaption)
  const addCaption = useEditorStore((s) => s.addCaption)
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime)
  const video = useEditorStore((s) => s.video)

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-cue-id="${selectedId}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  const seekTo = (ms: number) => {
    setCurrentTime(ms)
    const videoEl = document.querySelector('video')
    if (videoEl) videoEl.currentTime = ms / 1000
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white"
      aria-labelledby="caption-list-heading"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2
            id="caption-list-heading"
            className="font-display text-sm font-semibold text-slate-900"
          >
            Captions
          </h2>
          <p className="text-xs text-slate-500">
            {captions.length} cue{captions.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => addCaption()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {captions.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            No captions yet. Upload an SRT or add a cue manually.
          </div>
        )}

        {captions.map((cue) => {
          const selected = cue.id === selectedId
          const hasErrors = cue.errors.length > 0

          return (
            <article
              key={cue.id}
              data-cue-id={cue.id}
              className={cn(
                'rounded-lg border p-3 transition',
                selected
                  ? 'border-teal-400 bg-teal-50/60 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300',
                hasErrors && !selected && 'border-amber-300 bg-amber-50/40',
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    selectCaption(cue.id)
                    seekTo(cue.startMs)
                  }}
                  className="font-mono text-[11px] font-medium text-slate-500 hover:text-teal-700"
                >
                  #{cue.index} · L{cue.layer}
                </button>
                <button
                  type="button"
                  aria-label={`Delete caption ${cue.index}`}
                  onClick={() => deleteCaption(cue.id)}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2">
                <TimeField
                  label="Start"
                  valueMs={cue.startMs}
                  maxMs={video?.durationMs}
                  onCommit={(ms) => updateCaption(cue.id, { startMs: ms })}
                />
                <TimeField
                  label="End"
                  valueMs={cue.endMs}
                  maxMs={video?.durationMs}
                  onCommit={(ms) => updateCaption(cue.id, { endMs: ms })}
                />
                <label className="block">
                  <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Layer
                  </span>
                  <select
                    value={cue.layer}
                    aria-label={`Layer for caption ${cue.index}`}
                    onChange={(e) =>
                      updateCaption(cue.id, { layer: Number(e.target.value) })
                    }
                    className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11px] text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value={0}>L0</option>
                    <option value={1}>L1</option>
                  </select>
                </label>
              </div>

              <label className="sr-only" htmlFor={`cue-text-${cue.id}`}>
                Caption text {cue.index}
              </label>
              <textarea
                id={`cue-text-${cue.id}`}
                value={cue.text}
                rows={2}
                onFocus={() => selectCaption(cue.id)}
                onChange={(e) => updateCaption(cue.id, { text: e.target.value })}
                className="w-full resize-y rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                placeholder="Caption text…"
              />

              {hasErrors && (
                <ul className="mt-2 space-y-1" role="alert">
                  {cue.errors.map((err) => (
                    <li
                      key={err.code + err.message}
                      className="flex items-start gap-1.5 text-[11px] text-amber-800"
                    >
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function TimeField({
  label,
  valueMs,
  maxMs,
  onCommit,
}: {
  label: string
  valueMs: number
  maxMs?: number
  onCommit: (ms: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <input
        type="text"
        defaultValue={msToSrtTime(valueMs)}
        key={valueMs}
        aria-label={`${label} time`}
        title={formatDisplayTime(valueMs)}
        onBlur={(e) => {
          try {
            let ms = srtTimeToMs(e.target.value)
            if (typeof maxMs === 'number') ms = Math.min(ms, maxMs)
            onCommit(Math.max(0, ms))
          } catch {
            e.target.value = msToSrtTime(valueMs)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className="w-full rounded-md border border-slate-200 px-2 py-1 font-mono text-[11px] text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
      />
    </label>
  )
}
