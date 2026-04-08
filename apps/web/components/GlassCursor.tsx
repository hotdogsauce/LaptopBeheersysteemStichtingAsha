import { useEffect, useRef } from 'react'

export default function GlassCursor() {
  const dotRef     = useRef<HTMLDivElement>(null)
  const outlineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Desktop only + respect reduced motion
    if (window.innerWidth < 1024) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dot     = dotRef.current!
    const outline = outlineRef.current!

    dot.style.opacity     = '1'
    outline.style.opacity = '1'

    let mouseX = -100, mouseY = -100
    let outX   = -100, outY   = -100
    let rafId  = 0

    function onMove(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`
    }

    function loop() {
      const delay = 0.12
      outX += (mouseX - outX) * delay
      outY += (mouseY - outY) * delay
      outline.style.transform = `translate(${outX}px, ${outY}px)`
      rafId = requestAnimationFrame(loop)
    }

    // Grow outline on interactive elements
    function onEnter() { outline.classList.add('glass-cursor-grow') }
    function onLeave() { outline.classList.remove('glass-cursor-grow') }

    document.addEventListener('mousemove', onMove)
    document.querySelectorAll('a, button, [role="button"], input, select, textarea, label')
      .forEach(el => { el.addEventListener('mouseenter', onEnter); el.addEventListener('mouseleave', onLeave) })

    rafId = requestAnimationFrame(loop)

    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      {/* Dot — snaps instantly */}
      <div ref={dotRef} style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99999,
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--black)',
        pointerEvents: 'none', opacity: 0,
        transform: 'translate(-100px,-100px)',
        marginLeft: -4, marginTop: -4,
        transition: 'background 0.2s',
        mixBlendMode: 'difference',
      }} />

      {/* Outline — trails with glass blur */}
      <div ref={outlineRef} style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99998,
        width: 38, height: 38, borderRadius: '50%',
        border: '1.5px solid rgba(120,130,160,0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        background: 'rgba(255,255,255,0.08)',
        pointerEvents: 'none', opacity: 0,
        transform: 'translate(-100px,-100px)',
        marginLeft: -19, marginTop: -19,
        transition: 'width 0.2s, height 0.2s, margin 0.2s',
      }} />

      <style>{`
        .glass-cursor-grow {
          width: 56px !important;
          height: 56px !important;
          margin-left: -28px !important;
          margin-top: -28px !important;
        }
        * { cursor: none !important; }
        @media (max-width: 1023px) { * { cursor: auto !important; } }
      `}</style>
    </>
  )
}
