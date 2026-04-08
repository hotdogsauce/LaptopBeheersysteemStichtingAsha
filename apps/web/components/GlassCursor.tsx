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
        width: 5, height: 5, borderRadius: '50%',
        background: 'var(--black)',
        pointerEvents: 'none', opacity: 0,
        transform: 'translate(-100px,-100px)',
        marginLeft: -2.5, marginTop: -2.5,
        mixBlendMode: 'difference',
      }} />

      {/* Outline — trails with glass blur */}
      <div ref={outlineRef} style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99998,
        width: 22, height: 22, borderRadius: '50%',
        border: '1px solid rgba(120,130,160,0.40)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        background: 'rgba(255,255,255,0.06)',
        pointerEvents: 'none', opacity: 0,
        transform: 'translate(-100px,-100px)',
        marginLeft: -11, marginTop: -11,
        transition: 'width 0.18s, height 0.18s, margin 0.18s',
      }} />

      <style>{`
        .glass-cursor-grow {
          width: 32px !important;
          height: 32px !important;
          margin-left: -16px !important;
          margin-top: -16px !important;
        }
        * { cursor: none !important; }
        @media (max-width: 1023px) { * { cursor: auto !important; } }
      `}</style>
    </>
  )
}
