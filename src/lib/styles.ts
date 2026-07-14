import type { CSSProperties } from 'react'
import type { CaptionStyle, StylePreset } from '@/types/caption'

export const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: '"DM Sans", system-ui, sans-serif',
  fontSize: 36,
  fontWeight: 700,
  color: '#FFFFFF',
  opacity: 1,
  backgroundColor: '#000000',
  backgroundOpacity: 0.55,
  textAlign: 'center',
  textShadow: '0 2px 8px rgba(0,0,0,0.55)',
  textStroke: '',
  letterSpacing: 0,
  lineHeight: 1.25,
  paddingX: 16,
  paddingY: 8,
  borderRadius: 8,
  position: { x: 50, y: 85 },
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'clean',
    label: 'Clean',
    description: 'Minimal white text with soft shadow',
    style: {
      fontFamily: '"DM Sans", system-ui, sans-serif',
      fontWeight: 600,
      color: '#FFFFFF',
      backgroundOpacity: 0,
      textShadow: '0 1px 4px rgba(0,0,0,0.7)',
      textStroke: '',
      fontSize: 34,
    },
  },
  {
    id: 'bold',
    label: 'Bold',
    description: 'Heavy type for short-form punch',
    style: {
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      fontWeight: 700,
      fontSize: 42,
      color: '#FFFFFF',
      backgroundColor: '#0F172A',
      backgroundOpacity: 0.75,
      textShadow: 'none',
      textStroke: '',
      borderRadius: 12,
    },
  },
  {
    id: 'shadow',
    label: 'Shadowed',
    description: 'Deep drop shadow for busy footage',
    style: {
      fontFamily: '"DM Sans", system-ui, sans-serif',
      fontWeight: 700,
      color: '#FFFFFF',
      backgroundOpacity: 0,
      textShadow: '0 4px 0 #0F172A, 0 8px 24px rgba(0,0,0,0.45)',
      textStroke: '',
    },
  },
  {
    id: 'outline',
    label: 'Outlined',
    description: 'Stroke outline for high contrast',
    style: {
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      fontWeight: 800,
      color: '#FFFFFF',
      backgroundOpacity: 0,
      textShadow: 'none',
      textStroke: '2px #0F172A',
    },
  },
  {
    id: 'boxed',
    label: 'Boxed',
    description: 'Solid caption bar',
    style: {
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      fontWeight: 600,
      color: '#F8FAFC',
      backgroundColor: '#0EA5A4',
      backgroundOpacity: 0.95,
      textShadow: 'none',
      textStroke: '',
      borderRadius: 4,
      paddingX: 20,
      paddingY: 10,
    },
  },
  {
    id: 'neon',
    label: 'Highlight',
    description: 'Warm accent for key moments',
    style: {
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      fontWeight: 700,
      color: '#0F172A',
      backgroundColor: '#FDE047',
      backgroundOpacity: 1,
      textShadow: 'none',
      textStroke: '',
      borderRadius: 6,
    },
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'Traditional broadcast look',
    style: {
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      fontWeight: 500,
      fontSize: 32,
      color: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.7,
      textShadow: 'none',
      textStroke: '',
      borderRadius: 0,
      position: { x: 50, y: 90 },
    },
  },
]

export const FONT_OPTIONS = [
  { label: 'DM Sans', value: '"DM Sans", system-ui, sans-serif' },
  { label: 'Space Grotesk', value: '"Space Grotesk", system-ui, sans-serif' },
  { label: 'IBM Plex Sans', value: '"IBM Plex Sans", system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
] as const

/** Build inline CSS for the live caption overlay. */
export function styleToCss(style: CaptionStyle): CSSProperties {
  const bgAlpha = Math.round(style.backgroundOpacity * 255)
    .toString(16)
    .padStart(2, '0')
  const background =
    style.backgroundOpacity > 0
      ? `${style.backgroundColor}${bgAlpha}`
      : 'transparent'

  return {
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    fontWeight: style.fontWeight,
    color: style.color,
    opacity: style.opacity,
    textAlign: style.textAlign,
    letterSpacing: `${style.letterSpacing}px`,
    lineHeight: style.lineHeight,
    textShadow: style.textShadow || undefined,
    WebkitTextStroke: style.textStroke || undefined,
    backgroundColor: background,
    padding: `${style.paddingY}px ${style.paddingX}px`,
    borderRadius: `${style.borderRadius}px`,
    maxWidth: '90%',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }
}
