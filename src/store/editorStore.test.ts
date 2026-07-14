import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/store/editorStore'
import { resetCaptionIdCounter } from '@/lib/srt'

describe('editorStore', () => {
  beforeEach(() => {
    resetCaptionIdCounter()
    useEditorStore.getState().resetProject()
  })

  it('sets captions and selects the first cue', () => {
    useEditorStore.getState().setCaptions(
      [
        {
          id: 'c1',
          index: 1,
          startMs: 0,
          endMs: 1000,
          text: 'Hi',
          layer: 0,
        },
      ],
      'external',
    )

    const state = useEditorStore.getState()
    expect(state.captions).toHaveLength(1)
    expect(state.selectedId).toBe('c1')
    expect(state.subtitleSource).toBe('external')
  })

  it('updates caption text and revalidates', () => {
    useEditorStore.getState().setCaptions(
      [
        {
          id: 'c1',
          index: 1,
          startMs: 0,
          endMs: 1000,
          text: 'Hi',
          layer: 0,
        },
      ],
      'manual',
    )

    useEditorStore.getState().updateCaption('c1', { text: '' })
    expect(useEditorStore.getState().captions[0].errors[0].code).toBe(
      'EMPTY_TEXT',
    )
  })

  it('adds and deletes captions', () => {
    useEditorStore.getState().setVideo({
      name: 'demo.mp4',
      url: 'blob:demo',
      durationMs: 10_000,
      width: 1280,
      height: 720,
    })

    useEditorStore.getState().addCaption(2000)
    expect(useEditorStore.getState().captions).toHaveLength(1)

    const id = useEditorStore.getState().captions[0].id
    useEditorStore.getState().deleteCaption(id)
    expect(useEditorStore.getState().captions).toHaveLength(0)
  })

  it('splits a caption at playhead', () => {
    useEditorStore.getState().setCaptions(
      [
        {
          id: 'c1',
          index: 1,
          startMs: 0,
          endMs: 4000,
          text: 'Long',
          layer: 0,
        },
      ],
      'manual',
    )

    useEditorStore.getState().splitCaption('c1', 2000)
    const cues = useEditorStore.getState().captions
    expect(cues).toHaveLength(2)
    expect(cues[0].endMs).toBe(2000)
    expect(cues[1].startMs).toBe(2000)
  })

  it('applies style presets', () => {
    useEditorStore.getState().applyPreset('boxed')
    const state = useEditorStore.getState()
    expect(state.activePreset).toBe('boxed')
    expect(state.style.backgroundOpacity).toBeGreaterThan(0.5)
  })
})
