import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadZone } from '@/components/Upload/UploadZone'

describe('UploadZone', () => {
  it('renders brand and upload actions', () => {
    render(<UploadZone onReady={() => undefined} />)
    expect(screen.getByText('Caption Studio')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /edit captions in real time/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload video/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload srt/i })).toBeInTheDocument()
  })

  it('exposes an accessible drop zone', async () => {
    const user = userEvent.setup()
    render(<UploadZone onReady={() => undefined} />)
    const zone = screen.getByRole('button', {
      name: /drop video and subtitle files here/i,
    })
    expect(zone).toBeInTheDocument()
    zone.focus()
    await user.keyboard('{Enter}')
    // Enter triggers the hidden video file input click — no throw means ok
  })
})
