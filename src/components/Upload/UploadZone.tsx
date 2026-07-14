import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { Upload, Film, Captions, AlertCircle, CheckCircle2 } from 'lucide-react'
import { parseSrt } from '@/lib/srt'
import { extractEmbeddedSubtitles } from '@/lib/embeddedSubtitles'
import { useEditorStore } from '@/store/editorStore'
import { cn } from '@/lib/cn'

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
const SRT_EXT = /\.srt$/i

type UploadZoneProps = {
  onReady: () => void
}

export function UploadZone({ onReady }: UploadZoneProps) {
  const setVideo = useEditorStore((s) => s.setVideo)
  const setCaptions = useEditorStore((s) => s.setCaptions)
  const setNotice = useEditorStore((s) => s.setNotice)
  const video = useEditorStore((s) => s.video)
  const captions = useEditorStore((s) => s.captions)
  const subtitleSource = useEditorStore((s) => s.subtitleSource)

  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const srtInputRef = useRef<HTMLInputElement>(null)

  const handleVideoFile = useCallback(
    async (file: File) => {
      if (!VIDEO_TYPES.includes(file.type) && !/\.(mp4|webm|mov|ogg)$/i.test(file.name)) {
        setNotice({
          type: 'error',
          message: 'Unsupported video format. Use MP4, WebM, or MOV.',
        })
        return
      }

      setBusy(true)
      setStatus('Loading video…')

      const prev = useEditorStore.getState().video
      if (prev?.url) URL.revokeObjectURL(prev.url)

      const url = URL.createObjectURL(file)
      const probe = document.createElement('video')
      probe.preload = 'metadata'
      probe.muted = true
      probe.src = url

      try {
        await new Promise<void>((resolve, reject) => {
          probe.onloadedmetadata = () => resolve()
          probe.onerror = () => reject(new Error('Could not read video metadata.'))
        })

        setVideo({
          name: file.name,
          url,
          durationMs: Math.round((probe.duration || 0) * 1000),
          width: probe.videoWidth,
          height: probe.videoHeight,
        })

        setStatus('Checking for embedded captions…')
        const embedded = await extractEmbeddedSubtitles(probe)

        if (embedded.source === 'text-track' && embedded.captions.length > 0) {
          setCaptions(embedded.captions, 'embedded')
          setNotice({
            type: 'success',
            message: embedded.message,
          })
        } else {
          setNotice({
            type: 'info',
            message: embedded.message,
          })
        }

        setStatus(null)
        onReady()
      } catch (err) {
        URL.revokeObjectURL(url)
        setNotice({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to load video.',
        })
        setStatus(null)
      } finally {
        setBusy(false)
        probe.removeAttribute('src')
        probe.load()
      }
    },
    [onReady, setCaptions, setNotice, setVideo],
  )

  const handleSrtFile = useCallback(
    async (file: File) => {
      if (!SRT_EXT.test(file.name) && file.type !== 'application/x-subrip' && file.type !== 'text/plain') {
        setNotice({
          type: 'error',
          message: 'Please upload a valid .srt subtitle file.',
        })
        return
      }

      setBusy(true)
      try {
        const text = await file.text()
        const { captions: parsed, warnings } = parseSrt(text)

        if (!parsed.length) {
          setNotice({
            type: 'error',
            message: 'No captions found in SRT file. Check the format.',
          })
          return
        }

        setCaptions(parsed, 'external')
        setNotice({
          type: warnings.length ? 'warning' : 'success',
          message: warnings.length
            ? `Loaded ${parsed.length} captions. ${warnings[0]}`
            : `Loaded ${parsed.length} captions from ${file.name}.`,
        })
        onReady()
      } catch {
        setNotice({
          type: 'error',
          message: 'Failed to parse SRT file.',
        })
      } finally {
        setBusy(false)
      }
    },
    [onReady, setCaptions, setNotice],
  )

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    const videoFile = files.find(
      (f) => VIDEO_TYPES.includes(f.type) || /\.(mp4|webm|mov|ogg)$/i.test(f.name),
    )
    const srtFile = files.find((f) => SRT_EXT.test(f.name))

    if (videoFile) await handleVideoFile(videoFile)
    if (srtFile) await handleSrtFile(srtFile)

    if (!videoFile && !srtFile) {
      setNotice({
        type: 'error',
        message: 'Drop a video file and/or an .srt subtitle file.',
      })
    }
  }

  const onVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleVideoFile(file)
    e.target.value = ''
  }

  const onSrtChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleSrtFile(file)
    e.target.value = ''
  }

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-16"
      aria-labelledby="upload-heading"
    >
      <div className="text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
          Caption Studio
        </p>
        <h1
          id="upload-heading"
          className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl"
        >
          Edit captions in real time
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">
          Import a video and SRT, style overlays, and fine-tune timing on an
          interactive timeline — all in the browser.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop video and subtitle files here"
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            videoInputRef.current?.click()
          }
        }}
        className={cn(
          'group relative overflow-hidden rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all duration-300',
          'bg-[radial-gradient(ellipse_at_top,_#ecfeff_0%,_#f8fafc_55%,_#f1f5f9_100%)]',
          dragging
            ? 'border-teal-500 scale-[1.01] shadow-lg shadow-teal-900/10'
            : 'border-slate-300 hover:border-teal-400',
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%230ea5a4\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M0 0h20v20H0zM20 20h20v20H20z\'/%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <Upload
          className={cn(
            'relative mx-auto h-10 w-10 transition-transform duration-300',
            dragging ? 'scale-110 text-teal-600' : 'text-slate-400 group-hover:text-teal-600',
          )}
          aria-hidden
        />
        <p className="relative mt-4 font-display text-lg font-semibold text-slate-800">
          Drag & drop video + SRT
        </p>
        <p className="relative mt-1 text-sm text-slate-500">
          or choose files below · MP4 / WebM / MOV + .srt
        </p>

        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => videoInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60"
          >
            <Film className="h-4 w-4" aria-hidden />
            Upload video
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => srtInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-teal-400 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60"
          >
            <Captions className="h-4 w-4" aria-hidden />
            Upload SRT
          </button>
        </div>

        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov"
          className="sr-only"
          onChange={onVideoChange}
        />
        <input
          ref={srtInputRef}
          type="file"
          accept=".srt,application/x-subrip,text/plain"
          className="sr-only"
          onChange={onSrtChange}
        />

        {status && (
          <p className="relative mt-6 text-sm font-medium text-teal-800" role="status">
            {status}
          </p>
        )}
      </div>

      {(video || captions.length > 0) && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {video && (
              <p className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-teal-600" aria-hidden />
                Video: <span className="font-medium">{video.name}</span>
              </p>
            )}
            {captions.length > 0 ? (
              <p className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-teal-600" aria-hidden />
                Captions: {captions.length} cues
                {subtitleSource ? ` (${subtitleSource})` : ''}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="h-4 w-4" aria-hidden />
                No captions yet — upload an SRT or extract embedded tracks
              </p>
            )}
          </div>
          {video && (
            <button
              type="button"
              onClick={onReady}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Open editor
            </button>
          )}
        </div>
      )}
    </section>
  )
}
