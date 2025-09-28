'use client'

import { useEffect, useRef, useState } from 'react'

// In-view observer (fires once)
function useInViewOnce(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!ref.current || inView) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, { threshold: 0.3, ...options })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [options, inView])
  return { ref, inView } as const
}

function Counter({ to, duration = 1200, suffix = '+' }: { to: number; duration?: number; suffix?: string }) {
  const { ref, inView } = useInViewOnce()
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const from = 0
    const animate = (t: number) => {
      const elapsed = t - start
      const p = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setVal(Math.round(from + (to - from) * eased))
      if (p < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])
  return (
    <span ref={ref as any} className="tabular-nums">
      {val}
      {suffix}
    </span>
  )
}

export default function HeroCounters() {
  const items: Array<{ label: string; to?: number; text?: string; suffix?: string }> = [
    { to: 500, suffix: '+', label: 'عميل راضٍ' },
    { to: 1000, suffix: '+', label: 'طلب مكتمل' },
    { to: 50, suffix: '+', label: 'تصميم فريد' },
    { text: '24/7', label: 'دعم العملاء' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      {items.map((it, idx) => (
        <div key={idx} className="opacity-90 hover:opacity-100 transition-opacity duration-300">
          <div className="text-yellow-500 text-2xl md:text-3xl font-extrabold">
            {typeof it.to === 'number' ? <Counter to={it.to} suffix={it.suffix} /> : it.text}
          </div>
          <div className="text-white/75 text-xs md:text-sm">{it.label}</div>
        </div>
      ))}
    </div>
  )
}
