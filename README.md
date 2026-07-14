# Caption Studio

Web-based caption editing system (frontend) similar in spirit to Submagic — import a video + SRT, edit cues inline, style overlays in real time, and fine-tune timing on an interactive multi-layer timeline.

> **Scope:** Frontend only. Video encoding / burned-in caption export is intentionally excluded and assumed to live in an external pipeline. Project save/load is mocked via `localStorage`.

## Quick start

### Requirements

- Node.js 20+ (recommended)
- npm 10+

### Setup

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

### Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest unit/integration tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | Oxlint |

### Sample assets

- Sample SRT: [`public/sample.srt`](public/sample.srt)
- Use any local MP4/WebM/MOV for the video

## Features

- **Drag-and-drop upload** for video and `.srt` (together or separately)
- **Embedded subtitle detection** via the browser TextTrack API when available
- **External SRT override** even if an embedded track exists
- **Inline caption editor** — add / delete / edit text + timestamps
- **Real-time validation** — empty text, invalid ranges, overlaps, out-of-bounds
- **Live video overlay** with drag-to-reposition captions
- **Style panel** — font, size, weight, colors, opacity, alignment, position
- **7 style presets** (Clean, Bold, Shadowed, Outlined, Boxed, Highlight, Classic)
- **Timeline** — zoomable ruler, draggable segments, resize handles, 2 layers
- **Keyboard shortcuts** + focus-visible / screen-reader friendly labels
- **Export SRT** + **mock project save** (`localStorage`)

## Architecture

```
src/
  components/
    Upload/          # Drag-drop import flow
    Player/          # Video + caption overlay
    Editor/          # Caption list / inline editing
    Style/           # Presets + style controls
    Timeline/        # Multi-layer timeline editor
    AppShell.tsx     # Layout, save/export, shortcuts UI
  store/
    editorStore.ts   # Zustand store (source of truth)
  lib/
    srt.ts           # Parse / serialize SubRip
    time.ts          # Timestamp helpers
    validate.ts      # Caption integrity checks
    styles.ts        # Default style + presets
    embeddedSubtitles.ts  # TextTrack extraction
    mockApi.ts       # Mock project persistence
  hooks/
    useKeyboardShortcuts.ts
  types/
    caption.ts
```

### State management

Zustand holds video asset metadata, caption cues, global caption style, selection, playhead, and notices. Caption updates always re-run `validateCaptions()` so the UI stays consistent.

### Real-time preview

Preview uses the native HTML5 `<video>` element plus a positioned CSS overlay. This keeps the frontend light and responsive for editing. Heavy WebCodecs / FFmpeg.wasm work is reserved for a future export backend (out of scope here).

### Mock API

`src/lib/mockApi.ts` stubs:

- `projectApi.save(snapshot)` → persists JSON to `localStorage`
- `projectApi.load()` → restores snapshot
- `projectApi.clear()` → removes snapshot

Key: `caption-studio:project`

Swap these for real HTTP endpoints without changing UI code.

## Design decisions

1. **Zustand over Redux** — less boilerplate for a focused editor state tree; selector subscriptions keep the player smooth.
2. **Own SRT parser** — no heavy subtitle libs; transparent error handling and easy testing.
3. **CSS overlay vs canvas** — crisp text, easy drag positioning, accessible DOM text for screen readers.
4. **Validation on every mutation** — catches empty / overlapping / out-of-sync cues immediately.
5. **Layered timeline** — same-layer overlaps are errors; different layers may overlap for future multi-style workflows.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / pause |
| `←` / `→` | Seek ±0.1s (`Shift` = ±1s) |
| `↑` / `↓` | Select previous / next cue |
| `N` | Add caption at playhead |
| `S` | Split selected caption at playhead |
| `Backspace` / `Delete` | Delete selected cue |
| `⌘/Ctrl + S` | Export SRT |

## Accessibility

- Semantic landmarks and labelled controls
- `aria-live` overlay text; alert roles for cue errors
- Focus-visible outlines on interactive controls
- Keyboard operation for upload zone, timeline segments, and player
- `prefers-reduced-motion` respected for enter animations

## Assumptions & limitations

- Many MP4 “soft subtitle” tracks are not exposed by browsers — UI prompts for an external SRT when extraction fails.
- Style/position is **global** across cues (broadcast-style consistency). Per-cue styles can be a follow-up.
- No final re-encode / burned captions (assignment exclusion).
- Large SRT files are fine for editing; timeline width grows with zoom — virtualization can be added later.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Video won't load | Use MP4 (H.264), WebM, or MOV. Check browser console for codec errors. |
| “No embedded subtitle track” | Normal for most files — upload `public/sample.srt` or your own SRT. |
| Overlay not visible | Playhead may be outside cue ranges — click a cue or seek on the timeline. |
| Timestamps rejected | Use `HH:MM:SS,mmm` (comma or dot millis). |
| Save does nothing visible | Save writes to `localStorage`; success toast confirms. DevTools → Application → Local Storage. |
| Tests fail with path alias | Ensure Vitest uses `vite.config.ts` resolve alias (`@` → `src`). |

## Future extensions

- Per-cue style overrides and word-level highlighting
- Undo/redo history stack
- Timeline virtualization for 1k+ cues
- FFmpeg.wasm burn-in preview (client-side) before backend export
- Collaboration / cloud project sync replacing the mock API

## Evaluation mapping

| Criteria | How this project addresses it |
|----------|-------------------------------|
| Adaptability & customization | 7 presets + full style controls + drag position |
| Performance | Zustand selectors, CSS overlay, lightweight SRT parser |
| Maintainability | Typed modules, clear folders, pure lib functions |
| UX/UI | Responsive editor layout, toast feedback, shortcuts |
| Testing | Vitest + Testing Library covering parser, validation, store, upload UI |

## License

Private assignment submission — all rights reserved by the author unless otherwise stated.
