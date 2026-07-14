import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Download,
  Keyboard,
  Loader2,
  Save,
  Captions,
} from 'lucide-react'
import { VideoPlayer } from '@/components/Player/VideoPlayer'
import { CaptionList } from '@/components/Editor/CaptionList'
import { StylePanel } from '@/components/Style/StylePanel'
import { Timeline } from '@/components/Timeline/Timeline'
import { UploadZone } from '@/components/Upload/UploadZone'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { serializeSrt } from '@/lib/srt'
import { projectApi } from '@/lib/mockApi'
import { countErrors } from '@/lib/validate'
import { useEditorStore } from '@/store/editorStore'
import { cn } from '@/lib/cn'

export function AppShell() {
  const [mode, setMode] = useState<'upload' | 'editor'>('upload')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [saving, setSaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const video = useEditorStore((s) => s.video)
  const captions = useEditorStore((s) => s.captions)
  const style = useEditorStore((s) => s.style)
  const notice = useEditorStore((s) => s.notice)
  const setNotice = useEditorStore((s) => s.setNotice)
  const subtitleSource = useEditorStore((s) => s.subtitleSource)
  const resetProject = useEditorStore((s) => s.resetProject)

  useKeyboardShortcuts(videoRef)

  const exportSrt = useCallback(() => {
    const state = useEditorStore.getState()
    if (!state.captions.length) {
      state.setNotice({ type: 'warning', message: 'No captions to export.' })
      return
    }
    const content = serializeSrt(state.captions)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(state.video?.name ?? 'captions').replace(/\.[^.]+$/, '')}.srt`
    a.click()
    URL.revokeObjectURL(url)
    state.setNotice({ type: 'success', message: 'SRT file downloaded.' })
  }, [])

  useEffect(() => {
    const onExport = () => exportSrt()
    window.addEventListener('caption-studio:export', onExport)
    return () => window.removeEventListener('caption-studio:export', onExport)
  }, [exportSrt])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4500)
    return () => clearTimeout(t)
  }, [notice, setNotice])

  const saveProject = async () => {
    setSaving(true)
    try {
      await projectApi.save({
        id: 'local-demo',
        name: video?.name ?? 'Untitled project',
        updatedAt: new Date().toISOString(),
        videoName: video?.name ?? null,
        captionCount: captions.length,
        style,
        captions,
      })
      setNotice({
        type: 'success',
        message: 'Project saved locally (mock API / localStorage).',
      })
    } catch {
      setNotice({ type: 'error', message: 'Failed to save project.' })
    } finally {
      setSaving(false)
    }
  }

  const errorCount = countErrors(captions)

  return (
    <div className="min-h-screen bg-app text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {mode === 'editor' && (
              <button
                type="button"
                onClick={() => setMode('upload')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Files
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm shadow-teal-900/20">
                <Captions className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="font-display text-sm font-bold tracking-tight text-slate-900">
                  Caption Studio
                </p>
                <p className="text-[11px] text-slate-500">
                  {video ? video.name : 'Web caption editor'}
                  {subtitleSource ? ` · ${subtitleSource}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span
                className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900 sm:inline"
                role="status"
              >
                {errorCount} issue{errorCount === 1 ? '' : 's'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowShortcuts((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-teal-400"
              aria-expanded={showShortcuts}
            >
              <Keyboard className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Shortcuts</span>
            </button>
            <button
              type="button"
              onClick={() => void saveProject()}
              disabled={saving || !video}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-400 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={exportSrt}
              disabled={!captions.length}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export SRT
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className={cn(
            'mx-auto mt-3 max-w-[1600px] px-4',
          )}
        >
          <div
            className={cn(
              'rounded-lg border px-4 py-2.5 text-sm shadow-sm animate-fade-in',
              notice.type === 'error' &&
                'border-red-200 bg-red-50 text-red-900',
              notice.type === 'warning' &&
                'border-amber-200 bg-amber-50 text-amber-900',
              notice.type === 'success' &&
                'border-teal-200 bg-teal-50 text-teal-900',
              notice.type === 'info' &&
                'border-slate-200 bg-white text-slate-700',
            )}
          >
            {notice.message}
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="mx-auto mt-3 max-w-[1600px] px-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm animate-fade-in">
            <p className="font-display text-sm font-semibold text-slate-900">
              Keyboard shortcuts
            </p>
            <ul className="mt-2 grid gap-1.5 text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
              <li>
                <kbd className="kbd">Space</kbd> Play / pause
              </li>
              <li>
                <kbd className="kbd">← / →</kbd> Seek 0.1s (Shift: 1s)
              </li>
              <li>
                <kbd className="kbd">↑ / ↓</kbd> Select previous / next cue
              </li>
              <li>
                <kbd className="kbd">N</kbd> Add caption at playhead
              </li>
              <li>
                <kbd className="kbd">S</kbd> Split selected at playhead
              </li>
              <li>
                <kbd className="kbd">⌫</kbd> Delete selected
              </li>
              <li>
                <kbd className="kbd">⌘/Ctrl + S</kbd> Export SRT
              </li>
            </ul>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1600px] px-4 py-4 pb-10">
        {mode === 'upload' ? (
          <UploadZone
            onReady={() => {
              if (useEditorStore.getState().video) setMode('editor')
            }}
          />
        ) : (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="grid gap-4 lg:grid-cols-[1fr_280px_280px]">
              <VideoPlayer videoRef={videoRef} />
              <div className="min-h-[360px] lg:max-h-[520px]">
                <CaptionList />
              </div>
              <div className="min-h-[360px] lg:max-h-[520px]">
                <StylePanel />
              </div>
            </div>
            <Timeline />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
              <p>
                Final video encoding is out of scope — export SRT for your
                backend pipeline. Project save uses a mock localStorage API.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset the current project?')) {
                    resetProject()
                    setMode('upload')
                  }
                }}
                className="font-semibold text-red-600 hover:text-red-700"
              >
                Reset project
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
