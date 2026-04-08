/**
 * Thin progress bar at the top of every page during navigation.
 * No external package — hooks into Next.js router events directly.
 * Frutiger Aero feel: subtle gradient, soft glow.
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'

export default function PageProgressBar() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [width,   setWidth]   = useState(0)
  const timer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frame  = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)

  function clear() {
    if (timer.current)  clearTimeout(timer.current)
    if (frame.current)  cancelAnimationFrame(frame.current)
  }

  function start() {
    clear()
    setVisible(true)
    setWidth(0)

    // Animate to ~85% quickly, then crawl — never reaches 100% until done
    let w = 0
    function step() {
      w = w < 40  ? w + 3
        : w < 70  ? w + 1.2
        : w < 85  ? w + 0.4
        : w + 0.05
      if (w > 85) w = 85
      setWidth(w)
      if (w < 85) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }

  function finish() {
    clear()
    setWidth(100)
    // Brief pause at 100% then fade out
    timer.current = setTimeout(() => {
      setVisible(false)
      setWidth(0)
    }, 320)
  }

  useEffect(() => {
    router.events.on('routeChangeStart',    start)
    router.events.on('routeChangeComplete', finish)
    router.events.on('routeChangeError',    finish)
    return () => {
      router.events.off('routeChangeStart',    start)
      router.events.off('routeChangeComplete', finish)
      router.events.off('routeChangeError',    finish)
      clear()
    }
  }, [])

  if (!visible && width === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 2, zIndex: 9999, pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        width: `${width}%`,
        background: 'linear-gradient(90deg, transparent, var(--black) 20%, var(--black) 80%, transparent)',
        opacity: visible ? 1 : 0,
        transition: width === 100
          ? 'width 0.18s ease-out, opacity 0.28s ease 0.06s'
          : 'width 0.08s linear, opacity 0.15s ease',
        boxShadow: '0 0 8px 1px rgba(0,0,0,0.15)',
      }} />
    </div>
  )
}
