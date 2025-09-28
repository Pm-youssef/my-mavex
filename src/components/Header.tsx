'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bebas_Neue } from 'next/font/google';
import { ShoppingCart, Menu, X, Heart } from 'lucide-react';
import { SITE_NAME, CART_STORAGE_KEY, FAVORITES_STORAGE_KEY } from '@/lib/constants';
import { useScroll } from '@/contexts/ScrollContext';
import { useSession } from '@/hooks/useSession';

const navLinks = [
  { href: '/', label: 'الرئيسية' },
  { href: '/products', label: 'المنتجات' },
  { href: '/contact', label: 'اتصل بنا' },
];

const brandFont = Bebas_Neue({ subsets: ['latin'], weight: '400' });

export default function Header() {
  const pathname = usePathname();
  const { isHeaderVisible, isScrolled } = useScroll();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [favBump, setFavBump] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const { isAuthenticated } = useSession();
  const [publicSettings, setPublicSettings] = useState<any | null>(null);
  const [promoDismissed, setPromoDismissed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const s = (window as any).__PUBLIC_SETTINGS__;
      if (s) setPublicSettings(s);
    } catch {}
    // Promo dismiss persistence (session)
    try { setPromoDismissed(sessionStorage.getItem('promo-dismissed') === '1'); } catch {}
    (async () => {
      try { const res = await fetch('/api/settings', { cache: 'no-store' }); const j = await res.json(); setPublicSettings(j); } catch {}
    })();
  }, []);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = localStorage.getItem(CART_STORAGE_KEY);
      if (cart) {
        try {
          const cartItems = JSON.parse(cart);
          const count = cartItems.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0
          );
          setCartCount(count);
        } catch (error) {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    };

    const updateFavCount = () => {
      try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        const ids: string[] = raw ? JSON.parse(raw) : [];
        setFavCount(Array.isArray(ids) ? ids.length : 0);
      } catch {
        setFavCount(0);
      }
    };

    // Listen for custom cart update events
    const handleCartUpdate = () => updateCartCount();
    const handleFavUpdate = () => updateFavCount();
    const handleStorage = () => {
      updateCartCount();
      updateFavCount();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('favoritesUpdated', handleFavUpdate as any);

    // Initial cart count
    updateCartCount();
    updateFavCount();

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('favoritesUpdated', handleFavUpdate as any);
    };
  }, []);

  // Trigger a small bump animation when counts change
  useEffect(() => {
    setFavBump(true);
    const t = setTimeout(() => setFavBump(false), 300);
    return () => clearTimeout(t);
  }, [favCount]);

  useEffect(() => {
    setCartBump(true);
    const t = setTimeout(() => setCartBump(false), 300);
    return () => clearTimeout(t);
  }, [cartCount]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  };

  // Search feature removed as per request

  const mobileAriaLabel = useMemo(
    () => (isMobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'),
    [isMobileMenuOpen]
  );
  const showJoin = !isAuthenticated && !(pathname?.startsWith('/account/login') || pathname?.startsWith('/account/register'));

  // Hide global site header on admin routes to avoid overlap with AdminShell
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* Promo Bar */}
      {publicSettings?.promoEnabled && !promoDismissed && (
        <div className="fixed top-0 left-0 right-0 z-50" style={{ background: `var(--brand-primary, #0c1420)` }}>
          <div className="mavex-container text-white text-sm py-2 flex items-center justify-between gap-3">
            <div className="font-extrabold truncate">
              {publicSettings?.promoLink ? (
                <a href={publicSettings.promoLink} className="hover:underline">{publicSettings.promoText || 'عرض خاص الآن!'}</a>
              ) : (
                <span>{publicSettings.promoText || 'عرض خاص الآن!'}</span>
              )}
            </div>
            <button
              onClick={() => { setPromoDismissed(true); try { sessionStorage.setItem('promo-dismissed','1'); } catch {} }}
              className="text-white/80 hover:text-white"
              aria-label="إغلاق شريط العرض"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <header
        className={`fixed ${publicSettings?.promoEnabled && !promoDismissed ? 'top-8' : 'top-0'} left-0 right-0 z-40 transition-all duration-500 ease-in-out ${
          isScrolled
            ? 'bg-white/95 shadow-none'
            : 'bg-[#0c1420] shadow-none'
        } ${
          isHeaderVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0'
        }`}
      >
        <div className="mavex-container">
          <div className="flex items-center h-16">
            {/* Logo */}
            <div className="order-3 flex-1 h-16 flex items-center justify-end">
              <Link
                href="/"
                className="mavex-logo group relative z-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span
                  className={`${brandFont.className} uppercase font-extrabold transition-all duration-300 flex items-center leading-none select-none tracking-[0.14em] md:tracking-[0.16em] text-[28px] md:text-3xl ${
                    isScrolled
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#0c1420] to-[#a16207]'
                      : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-yellow-300'
                  }`}
                >
                  {SITE_NAME}
                </span>
              </Link>
            </div>

            {/* Mobile actions (right side) */}
            <div className="order-1 flex md:hidden items-center gap-3 flex-1 justify-start h-16">
              <Link
                href="/favorites"
                className="p-2 rounded-full relative focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-transform duration-200 hover:scale-105 active:scale-95"
                aria-label="المفضلة"
              >
                <Heart className={`w-6 h-6 ${isScrolled ? 'text-[#0c1420]' : 'text-white'}`} />
                {favCount > 0 && (
                  <span className={`absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold transform transition-transform duration-300 ${favBump ? 'scale-110' : ''}`}>
                    {favCount > 99 ? '99+' : favCount}
                  </span>
                )}
              </Link>
              <Link
                href="/cart"
                className="p-2 rounded-full relative focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-transform duration-200 hover:scale-105 active:scale-95"
                aria-label="عربة التسوق"
              >
                <ShoppingCart className={`w-6 h-6 ${isScrolled ? 'text-[#0c1420]' : 'text-white'}`} />
                {cartCount > 0 && (
                  <span className={`absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-bold transform transition-transform duration-300 ${cartBump ? 'scale-110' : ''}`}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                  isScrolled ? 'text-[#0c1420]' : 'text-white'
                }`}
                aria-expanded={isMobileMenuOpen}
                aria-label={mobileAriaLabel}
                onClick={toggleMobileMenu}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Search removed */}

            {/* Desktop Navigation */}
            <nav className="order-2 hidden md:flex flex-1 items-center justify-center space-x-5 space-x-reverse h-16">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-2.5 py-2 text-base font-semibold transition-all duration-300 ease-\[cubic-bezier(.22,1,.36,1)\] group ${
                    isScrolled ? 'text-[#0c1420]' : 'text-white'
                  } ${pathname === link.href ? 'text-yellow-500 font-bold' : 'hover:text-yellow-500'}`}
                  aria-current={pathname === link.href ? 'page' : undefined}
                >
                  <span className="relative z-10 flex items-center leading-none">{link.label}</span>
                  <span
                    className={`absolute bottom-0 right-0 h-0.5 bg-yellow-500 transition-all duration-300 ease-\[cubic-bezier(.22,1,.36,1)\] ${
                      pathname === link.href ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
              ))}
            </nav>

            {/* Desktop actions (left) */}
            <div className="order-1 hidden md:flex items-center gap-4 flex-1 justify-start h-16">
              <Link
                href="/favorites"
                className={`p-2 rounded-full relative focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-transparent transition-transform duration-200 hover:scale-105 active:scale-95 ${
                  isScrolled ? 'text-[#0c1420]' : 'text-white'
                }`}
                aria-label="المفضلة"
              >
                <Heart className="w-6 h-6" />
                {favCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {favCount > 99 ? '99+' : favCount}
                  </span>
                )}
              </Link>
              <Link
                href="/cart"
                className={`p-2 rounded-full relative focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-transparent transition-transform duration-200 hover:scale-105 active:scale-95 ${
                  isScrolled ? 'text-[#0c1420]' : 'text-white'
                }`}
                aria-label="عربة التسوق"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-bold">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
              {showJoin && (
                <Link href="/account/login" className="btn-gold-gradient px-4 py-2 rounded-xl font-extrabold">
                  انضم الآن ✨
                </Link>
              )}
            </div>

          {/* CTA removed for a minimal look */}

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div
              id="mobile-menu"
              className="md:hidden bg-[#0c1420]/95 backdrop-blur-md rounded-none shadow-2xl border-b border-yellow-500 mb-2 overflow-hidden"
            >
              <nav className="py-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-6 py-3 text-white hover:text-yellow-400 hover:bg-yellow-500/10 transition-all duration-300 font-bold text-base border-l-4 border-transparent hover:border-yellow-500"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="px-6 py-3">
                  <Link
                    href="/cart"
                    className="block w-full text-center btn-brand-dark py-3 px-6 rounded-xl font-bold transition-all duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    🛒 السلة
                    {cartCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </Link>
                </div>
                {showJoin && (
                  <div className="px-6 pb-4">
                    <Link
                      href="/account/login"
                      className="block w-full text-center btn-gold-gradient py-3 px-6 rounded-xl font-extrabold transition-all duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      انضم الآن ✨
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  </>
);
}
