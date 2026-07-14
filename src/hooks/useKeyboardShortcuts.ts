import { useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'

/**
 * Global keyboard shortcuts for the caption editor.
 * Skips when focus is inside inputs/textareas (except Space on video area).
 */
export function useKeyboardShortcuts(videoRef: {
  current: HTMLVideoElement | null
}): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      const {
        isPlaying,
        setPlaying,
        selectedId,
        deleteCaption,
        addCaption,
        currentTimeMs,
        captions,
        selectCaption,
        splitCaption,
        setCurrentTime,
        video,
      } = useEditorStore.getState()

      // Cmd/Ctrl + S handled elsewhere for export
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('caption-studio:export'))
        return
      }

      if (isTyping) return

      switch (e.key) {
        case ' ': {
          e.preventDefault()
          const videoEl = videoRef.current
          if (!videoEl) return
          if (isPlaying) {
            videoEl.pause()
            setPlaying(false)
          } else {
            void videoEl.play()
            setPlaying(true)
          }
          break
        }
        case 'Delete':
        case 'Backspace': {
          if (selectedId) {
            e.preventDefault()
            deleteCaption(selectedId)
          }
          break
        }
        case 'n':
        case 'N': {
          e.preventDefault()
          addCaption(currentTimeMs)
          break
        }
        case 's':
        case 'S': {
          if (selectedId) {
            e.preventDefault()
            splitCaption(selectedId, currentTimeMs)
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          const step = e.shiftKey ? 1000 : 100
          const next = Math.max(0, currentTimeMs - step)
          setCurrentTime(next)
          if (videoRef.current) videoRef.current.currentTime = next / 1000
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          const step = e.shiftKey ? 1000 : 100
          const max = video?.durationMs ?? Number.POSITIVE_INFINITY
          const next = Math.min(max, currentTimeMs + step)
          setCurrentTime(next)
          if (videoRef.current) videoRef.current.currentTime = next / 1000
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          navigateSelection(captions, selectedId, -1, selectCaption)
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          navigateSelection(captions, selectedId, 1, selectCaption)
          break
        }
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [videoRef])
}

function navigateSelection(
  captions: { id: string }[],
  selectedId: string | null,
  delta: number,
  select: (id: string | null) => void,
): void {
  if (!captions.length) return
  const idx = captions.findIndex((c) => c.id === selectedId)
  const next = idx < 0 ? 0 : Math.min(captions.length - 1, Math.max(0, idx + delta))
  select(captions[next].id)
}
