'use client'

import { useState, useEffect } from 'react'
import { useScroll } from '@/contexts/ScrollContext'

const newsItems = [
  "🎉 عرض خاص: 2 تيشيرت بـ 1100 جنيه بدلاً من 1400",
  "🚚 توصيل مجاني للطلبات أكثر من 1400 جنيه",
  "⭐ جودة عالية 100% قطن مصري",
  "📱 اطلب الآن واحصل على توصيل سريع",
  "💎 تصميمات حصرية ومميزة",
  "🔥 عروض محدودة - لا تفوت الفرصة"
]

export default function NewsTicker() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { isHeaderVisible } = useScroll()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsItems.length)
    }, 4000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <div className={`bg-yellow-500 text-[#0c1420] py-2 px-4 overflow-hidden fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-in-out ${
      isHeaderVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <div className="flex items-center justify-center space-x-4 space-x-reverse">
        <span className="animate-pulse">📢</span>
        <div className="relative h-5 overflow-hidden">
          <div 
            className="transition-transform duration-1000 ease-in-out"
            style={{ transform: `translateY(-${currentIndex * 20}px)` }}
          >
            {newsItems.map((item, index) => (
              <div 
                key={index} 
                className="h-5 flex items-center justify-center font-bold text-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <span className="animate-pulse">📢</span>
      </div>
    </div>
  )
}
