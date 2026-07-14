# Design Decisions

## Product framing

Caption Studio is a **frontend-only** caption workstation. Users import media + SRT, edit text/timing/style, preview overlays live, and export an updated SubRip file for an external encode pipeline.

## Stack choices

| Concern | Choice | Why |
|--------|--------|-----|
| UI | React 19 + TypeScript | Assignment preference; strong component model |
| Bundler | Vite | Fast DX, native ESM, Vitest integration |
| State | Zustand | Minimal ceremony, fine-grained selectors for playhead updates |
| Styling | Tailwind CSS v4 | Utility speed + `@theme` tokens for a coherent look |
| Parsing | Custom SRT lib | Transparent errors, tiny footprint, easy unit tests |
| Preview | HTML5 video + DOM overlay | Instant feedback without FFmpeg.wasm cost on every scrub |
| Persistence | `localStorage` mock API | Demonstrates save/load without a backend |

## UX structure

1. **Upload composition** — brand-forward first screen with a single primary action (drop files).
2. **Editor layout** — video preview + caption list + style panel + timeline. One job per panel.
3. **Feedback** — toast notices for parse/import/save; per-cue validation inline.

## Challenges & approaches

### Embedded subtitles rarely surface in browsers

Most softsubs inside MP4 are not exposed as `textTracks`. We attempt TextTrack extraction, clearly explain failure, and always allow (or prefer) an external SRT — matching the assignment’s flexibility requirement.

### Keeping playhead updates cheap

`timeupdate` writes only `currentTimeMs` into Zustand. Caption list / style panel subscribe to other slices so scrubbing does not re-render heavy trees needlessly.

### Synchronization integrity

Every mutation goes through `validateCaptions()` which checks empty text, inverted ranges, same-layer overlaps, and video bounds. Errors appear on cues and in the header count.

### Timeline interaction model

Pointer capture + three drag modes (move, resize-start, resize-end) keep timing edits precise without a heavy timeline library.

## Scalability notes

- Virtualize the caption list and timeline for 1,000+ cues
- Move style to per-cue overrides with a “linked to global” toggle
- Add undo/redo via temporal middleware on the store
- Replace mock API with REST/GraphQL project endpoints
- Optional FFmpeg.wasm burn-in for client-side proof-of-export
