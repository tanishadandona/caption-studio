export type CaptionAlign = 'left' | 'center' | 'right'

export type CaptionPosition = {
  x: number // 0–100 percentage of video width
  y: number // 0–100 percentage of video height
}

export type CaptionStyle = {
  fontFamily: string
  fontSize: number
  fontWeight: number
  color: string
  opacity: number
  backgroundColor: string
  backgroundOpacity: number
  textAlign: CaptionAlign
  textShadow: string
  textStroke: string
  letterSpacing: number
  lineHeight: number
  paddingX: number
  paddingY: number
  borderRadius: number
  position: CaptionPosition
}

export type CaptionCue = {
  id: string
  index: number
  startMs: number
  endMs: number
  text: string
  layer: number
  errors: CaptionError[]
}

export type CaptionErrorCode =
  | 'EMPTY_TEXT'
  | 'INVALID_RANGE'
  | 'OVERLAP'
  | 'OUT_OF_BOUNDS'

export type CaptionError = {
  code: CaptionErrorCode
  message: string
}

export type StylePresetId =
  | 'clean'
  | 'bold'
  | 'shadow'
  | 'outline'
  | 'boxed'
  | 'neon'
  | 'classic'

export type StylePreset = {
  id: StylePresetId
  label: string
  description: string
  style: Partial<CaptionStyle>
}

export type VideoAsset = {
  name: string
  url: string
  durationMs: number
  width: number
  height: number
}

export type SubtitleSource = 'embedded' | 'external' | 'manual' | null

export type ProjectSnapshot = {
  id: string
  name: string
  updatedAt: string
  videoName: string | null
  captionCount: number
  style: CaptionStyle
  captions: CaptionCue[]
}
