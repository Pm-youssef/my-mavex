'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SOCIAL_LINKS, CONTACT_INFO } from '@/lib/constants'
import { Facebook, Instagram, Twitter, Mail, MapPin } from 'lucide-react'

export default function Footer() {
  const [settings, setSettings] = useState<any | null>(null)
  useEffect(() => {
    try { const s = (window as any).__PUBLIC_SETTINGS__; if (s) setSettings(s); } catch {}
    ;(async()=>{ try { const r = await fetch('/api/settings', { cache: 'no-store' }); const j = await r.json(); setSettings(j);} catch {} })()
  }, [])

  const socialLinksArray = [
    { name: 'Facebook', url: settings?.facebookUrl || SOCIAL_LINKS.facebook, brand: '#1877F2', icon: <Facebook className="w-6 h-6 text-white" aria-hidden /> },
    { name: 'Instagram', url: settings?.instagramUrl || SOCIAL_LINKS.instagram, brand: 'linear-gradient(135deg, #F58529, #DD2A7B, #8134AF, #515BD4)', icon: <Instagram className="w-6 h-6 text-white drop-shadow" aria-hidden /> },
    { name: 'Twitter', url: settings?.twitterUrl || SOCIAL_LINKS.twitter, brand: '#1DA1F2', icon: <Twitter className="w-6 h-6 text-white" aria-hidden /> },
  ]

  const email = settings?.storeEmail || CONTACT_INFO.email
  const address = settings?.address || CONTACT_INFO.address

  return (
    <footer className="mavex-footer">
      <div className="mavex-container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-8">
              <Link href="/" className="mavex-logo text-white group">
                <span className="group-hover:text-yellow-400 transition-colors duration-500">Mavex</span>
              </Link>
            </div>
            <p className="text-gray-300 text-xl leading-relaxed mb-12 max-w-lg">
              نقدم لكم تجربة تسوق استثنائية مع أفضل المنتجات والخدمات. 
              اكتشف مجموعتنا المميزة من التيشيرتات عالية الجودة.
            </p>
            <div className="flex space-x-6 space-x-reverse">
              {socialLinksArray.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500 hover:scale-110 hover:shadow-2xl border-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
                  style={{ background: link.brand, borderColor: typeof link.brand === 'string' && link.brand.startsWith('#') ? link.brand : 'transparent' }}
                  aria-label={link.name}
                >
                  {link.icon}
                  <span className="sr-only">{link.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-8 border-b-2 border-yellow-500 pb-4">روابط سريعة</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/" className="text-gray-300 hover:text-yellow-400 transition-all duration-300 font-bold text-lg group">
                  <span className="relative">
                    الرئيسية
                    <div className="absolute bottom-0 left-0 w-0 h-1 bg-yellow-500 transition-all duration-300 group-hover:w-full"></div>
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-yellow-400 transition-all duration-300 font-bold text-lg group">
                  <span className="relative">
                    اتصل بنا
                    <div className="absolute bottom-0 left-0 w-0 h-1 bg-yellow-500 transition-all duration-300 group-hover:w-full"></div>
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-8 border-b-2 border-yellow-500 pb-4">معلومات التواصل</h3>
            <div className="space-y-6">
              <div className="flex items-start space-x-4 space-x-reverse group interactive-element">
                <div className="w-8 h-8 bg-yellow-600 rounded-none flex items-center justify-center flex-shrink-0 mt-1 group-hover:bg-yellow-500 transition-all duration-300 border-2 border-yellow-600 group-hover:border-yellow-500">
                  <Mail className="w-4 h-4 text-[#0c1420]" />
                </div>
                <div>
                  <p className="text-gray-300 font-bold text-lg">{email}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 space-x-reverse group interactive-element">
                <div className="w-8 h-8 bg-yellow-600 rounded-none flex items-center justify-center flex-shrink-0 mt-1 group-hover:bg-yellow-500 transition-all duration-300 border-2 border-yellow-600 group-hover:border-yellow-500">
                  <MapPin className="w-4 h-4 text-[#0c1420]" />
                </div>
                <div>
                  <p className="text-gray-300 font-bold text-lg">{address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t-2 border-yellow-500 mt-20 pt-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-center md:text-right mb-6 md:mb-0 text-lg">
              © 2024 Mavex. جميع الحقوق محفوظة.
            </p>
            <div className="flex space-x-8 space-x-reverse text-lg text-gray-400">
              <Link href="/privacy" className="hover:text-yellow-400 transition-all duration-300 font-bold group">
                <span className="relative">
                  سياسة الخصوصية
                  <div className="absolute bottom-0 left-0 w-0 h-1 bg-yellow-500 transition-all duration-300 group-hover:w-full"></div>
                </span>
              </Link>
              <Link href="/terms" className="hover:text-yellow-400 transition-all duration-300 font-bold group">
                <span className="relative">
                  شروط الاستخدام
                  <div className="absolute bottom-0 left-0 w-0 h-1 bg-yellow-500 transition-all duration-300 group-hover:w-full"></div>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Floating WhatsApp */}
      {settings?.whatsappEnabled && settings?.whatsappNumber && (
        <a
          href={`https://wa.me/${String(settings.whatsappNumber).replace(/\D/g,'')}`}
          target="_blank" rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full shadow-xl grid place-items-center text-white"
          style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}
          aria-label="WhatsApp"
        >
          {/* Simple WhatsApp glyph */}
          <span className="text-2xl">💬</span>
        </a>
      )}
    </footer>
  )
}
