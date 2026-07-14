import type { ReactNode } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { FONT_OPTIONS, STYLE_PRESETS } from '@/lib/styles'
import type { CaptionAlign } from '@/types/caption'
import { cn } from '@/lib/cn'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'

export function StylePanel() {
  const style = useEditorStore((s) => s.style)
  const activePreset = useEditorStore((s) => s.activePreset)
  const setStyle = useEditorStore((s) => s.setStyle)
  const applyPreset = useEditorStore((s) => s.applyPreset)

  return (
    <section
      className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white"
      aria-labelledby="style-panel-heading"
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <h2
          id="style-panel-heading"
          className="font-display text-sm font-semibold text-slate-900"
        >
          Style
        </h2>
        <p className="text-xs text-slate-500">
          Presets, typography, and overlay position
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Presets
          </p>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                title={preset.description}
                className={cn(
                  'rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition',
                  activePreset === preset.id
                    ? 'border-teal-500 bg-teal-50 text-teal-900'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Font">
          <select
            value={style.fontFamily}
            onChange={(e) => setStyle({ fontFamily: e.target.value })}
            className="field-input"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Size ${style.fontSize}px`}>
            <input
              type="range"
              min={16}
              max={72}
              value={style.fontSize}
              onChange={(e) => setStyle({ fontSize: Number(e.target.value) })}
              className="w-full accent-teal-600"
            />
          </Field>
          <Field label={`Weight ${style.fontWeight}`}>
            <input
              type="range"
              min={400}
              max={900}
              step={100}
              value={style.fontWeight}
              onChange={(e) => setStyle({ fontWeight: Number(e.target.value) })}
              className="w-full accent-teal-600"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Text color">
            <input
              type="color"
              value={style.color}
              onChange={(e) => setStyle({ color: e.target.value })}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 bg-white"
            />
          </Field>
          <Field label="Background">
            <input
              type="color"
              value={style.backgroundColor}
              onChange={(e) => setStyle({ backgroundColor: e.target.value })}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 bg-white"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Opacity ${Math.round(style.opacity * 100)}%`}>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={style.opacity}
              onChange={(e) => setStyle({ opacity: Number(e.target.value) })}
              className="w-full accent-teal-600"
            />
          </Field>
          <Field
            label={`BG opacity ${Math.round(style.backgroundOpacity * 100)}%`}
          >
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={style.backgroundOpacity}
              onChange={(e) =>
                setStyle({ backgroundOpacity: Number(e.target.value) })
              }
              className="w-full accent-teal-600"
            />
          </Field>
        </div>

        <Field label="Alignment">
          <div className="flex gap-1">
            {(
              [
                ['left', AlignLeft],
                ['center', AlignCenter],
                ['right', AlignRight],
              ] as const
            ).map(([align, Icon]) => (
              <button
                key={align}
                type="button"
                aria-label={`Align ${align}`}
                aria-pressed={style.textAlign === align}
                onClick={() => setStyle({ textAlign: align as CaptionAlign })}
                className={cn(
                  'flex h-9 flex-1 items-center justify-center rounded-lg border transition',
                  style.textAlign === align
                    ? 'border-teal-500 bg-teal-50 text-teal-800'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Pos X ${Math.round(style.position.x)}%`}>
            <input
              type="range"
              min={5}
              max={95}
              value={style.position.x}
              onChange={(e) =>
                setStyle({
                  position: { ...style.position, x: Number(e.target.value) },
                })
              }
              className="w-full accent-teal-600"
            />
          </Field>
          <Field label={`Pos Y ${Math.round(style.position.y)}%`}>
            <input
              type="range"
              min={5}
              max={95}
              value={style.position.y}
              onChange={(e) =>
                setStyle({
                  position: { ...style.position, y: Number(e.target.value) },
                })
              }
              className="w-full accent-teal-600"
            />
          </Field>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          Tip: drag the caption on the video preview to reposition it. Position
          is shared across all cues for consistent framing.
        </p>
      </div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  )
}
