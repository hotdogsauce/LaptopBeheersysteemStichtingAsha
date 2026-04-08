import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  file: File
  onConfirm: (dataUrl: string) => void
  onCancel: () => void
}

const PREVIEW = 240
const OUTPUT  = 80

export default function AvatarCropModal({ file, onConfirm, onCancel }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const imgRef     = useRef<HTMLImageElement | null>(null)
  const dragStart  = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const [zoom,      setZoom]      = useState(1)
  const [offset,    setOffset]    = useState({ x: 0, y: 0 })
  const [dragging,  setDragging]  = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  // Load image from File
  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { imgRef.current = img; setImgLoaded(true) }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Render preview canvas
  const draw = useCallback(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const img = imgRef.current
    ctx.clearRect(0, 0, PREVIEW, PREVIEW)

    // Circular clip
    ctx.save()
    ctx.beginPath()
    ctx.arc(PREVIEW / 2, PREVIEW / 2, PREVIEW / 2, 0, Math.PI * 2)
    ctx.clip()

    const scale = Math.max(PREVIEW / img.width, PREVIEW / img.height) * zoom
    const w = img.width  * scale
    const h = img.height * scale
    const x = (PREVIEW - w) / 2 + offset.x
    const y = (PREVIEW - h) / 2 + offset.y
    ctx.drawImage(img, x, y, w, h)
    ctx.restore()

    // Subtle border
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(PREVIEW / 2, PREVIEW / 2, PREVIEW / 2 - 1, 0, Math.PI * 2)
    ctx.stroke()
  }, [imgLoaded, zoom, offset])

  useEffect(() => { draw() }, [draw])

  // Mouse drag
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    })
  }
  function onMouseUp() { setDragging(false) }

  // Touch drag
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    setDragging(true)
    dragStart.current = { x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return
    const t = e.touches[0]
    setOffset({
      x: dragStart.current.ox + t.clientX - dragStart.current.x,
      y: dragStart.current.oy + t.clientY - dragStart.current.y,
    })
  }
  function onTouchEnd() { setDragging(false) }

  function handleConfirm() {
    if (!imgRef.current) return
    const out = document.createElement('canvas')
    out.width  = OUTPUT
    out.height = OUTPUT
    const ctx  = out.getContext('2d')!

    // Circular clip
    ctx.save()
    ctx.beginPath()
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2)
    ctx.clip()

    // Same transform as preview, scaled to OUTPUT
    const ratio = OUTPUT / PREVIEW
    const img   = imgRef.current
    const scale = Math.max(PREVIEW / img.width, PREVIEW / img.height) * zoom
    const w = img.width  * scale * ratio
    const h = img.height * scale * ratio
    const x = ((PREVIEW - img.width  * scale) / 2 + offset.x) * ratio
    const y = ((PREVIEW - img.height * scale) / 2 + offset.y) * ratio
    ctx.drawImage(img, x, y, w, h)
    ctx.restore()

    onConfirm(out.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(10px) saturate(1.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fade-in 0.18s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.75)',
        borderRadius: 20,
        padding: '28px 28px 24px',
        width: 300,
        display: 'grid',
        gap: 20,
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        animation: 'crop-modal-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>Profielfoto aanpassen</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--grey)' }}>Sleep om te positioneren · zoom in/uit</p>
        </div>

        {/* Canvas preview */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {imgLoaded ? (
            <canvas
              ref={canvasRef}
              width={PREVIEW}
              height={PREVIEW}
              style={{
                borderRadius: '50%',
                cursor: dragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                userSelect: 'none',
                width: PREVIEW, height: PREVIEW,
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            />
          ) : (
            <div style={{
              width: PREVIEW, height: PREVIEW, borderRadius: '50%',
              background: 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: 'var(--grey)',
            }}>
              Laden…
            </div>
          )}
        </div>

        {/* Zoom slider */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 8 }}>
            Inzoomen
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--black)' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Annuleer</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!imgLoaded}>
            Opslaan
          </button>
        </div>
      </div>
    </div>
  )
}
