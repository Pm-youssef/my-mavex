'use client'

import { useEffect, useState } from 'react'

type Star = {
  left: number
  top: number
  size: number
  opacity: number
  duration: number
  delay: number
}

export default function HeroStars({ mobileCount = 24, desktopCount = 50, speedFactor = 0.7 }: { mobileCount?: number; desktopCount?: number; speedFactor?: number }) {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    try {
      const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false
      const count = isMobile ? mobileCount : desktopCount
      const gen: Star[] = Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1.3 + Math.random() * 2.2,
        opacity: 0.35 + Math.random() * 0.5,
        duration: (2.6 + Math.random() * 5.0) * speedFactor,
        delay: Math.random() * 6,
      }))
      setStars(gen)
    } catch {}
  }, [mobileCount, desktopCount, speedFactor])

  return (
    <div className="pointer-events-none absolute inset-0 z-0" suppressHydrationWarning>
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rotate-45 twinkle-drift"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDuration: `${s.duration}s, ${s.duration * 1.8}s`,
            animationDelay: `${s.delay}s, ${s.delay / 2}s`,
            background: 'linear-gradient(90deg, rgba(234,179,8,0.95), rgba(234,179,8,0.75))',
            boxShadow: '0 0 10px rgba(234,179,8,0.35), 0 0 2px rgba(255,255,255,0.35)',
          }}
          aria-hidden
        />
      ))}
    </div>
  )
}
