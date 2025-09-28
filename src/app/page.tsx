import prisma from '@/lib/prisma'
import Link from 'next/link'
import HeroCounters from '@/components/HeroCounters'
import HeroStars from '@/components/HeroStars'

export const revalidate = 60

export default async function HomePage() {
  const productsRaw = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: { variants: true }
  })
  const products = productsRaw.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    originalPrice: Number(p.originalPrice || 0),
    discountedPrice: Number(p.discountedPrice ?? p.originalPrice ?? 0),
    imageUrl: p.imageUrl,
    thumbnailUrl: p.thumbnailUrl ?? null,
    hoverImageUrl: p.hoverImageUrl ?? null,
    stock: Number(p.stock || 0),
    variants: Array.isArray(p.variants)
      ? p.variants.map((v: any) => ({ id: v.id, size: v.size, stock: Number(v.stock || 0) }))
      : [],
  }))

  // Load top categories (for white band) — prefer imageUrl if column exists; fallback safely
  let categories: Array<{ name: string; slug: string; count: number; imageUrl?: string | null }> = []
  try {
    const categoriesRaw = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      take: 10,
      select: {
        name: true,
        slug: true,
        imageUrl: true,
        _count: { select: { products: true } },
      },
    })
    categories = categoriesRaw.map((c: any) => ({
      name: c.name as string,
      slug: c.slug as string,
      imageUrl: c.imageUrl ?? null,
      count: Number(c._count?.products || 0),
    }))
  } catch {
    try {
      const categoriesRaw = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        take: 10,
        select: {
          name: true,
          slug: true,
          _count: { select: { products: true } },
        },
      })
      categories = categoriesRaw.map((c: any) => ({
        name: c.name as string,
        slug: c.slug as string,
        count: Number(c._count?.products || 0),
      }))
    } catch {}
  }

  return (
    <>
      {/* Hero */}
      <section className="mavex-hero relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1420] via-[#0c1420]/95 to-[#1a2332]" />
        {/* Base grid */}
        <div className="absolute inset-0 opacity-[0.06]" aria-hidden>
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 160 90">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="160" height="90" fill="url(#grid)" />
          </svg>
        </div>
        {/* Random golden stars (component) */}
        <HeroStars mobileCount={24} desktopCount={50} speedFactor={0.7} />
        {/* Golden arcs focusing the title */}
        <div className="pointer-events-none absolute -top-20 -right-16 w-[60%] h-[60%] rounded-full opacity-20 md:opacity-25 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.18),transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 w-[50%] h-[50%] rounded-full opacity-15 md:opacity-20 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.12),transparent_65%)]" />
        {/* Floating shapes for subtle motion */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="hidden md:block absolute -bottom-24 left-10 w-16 h-16 rounded-full border border-yellow-500/25 opacity-30 md:opacity-40 hero-anim-float-1" />
          <div className="absolute -bottom-32 right-24 w-10 h-10 rounded-full border border-yellow-500/20 opacity-20 sm:opacity-30 md:opacity-40 hero-anim-float-2" />
          <div className="hidden lg:block absolute -bottom-20 right-1/3 w-24 h-24 border-2 border-yellow-500/15 opacity-20 md:opacity-30 rotate-12 hero-anim-float-3" />
          <div className="hidden md:block absolute -bottom-24 left-1/2 w-40 h-40 rounded-full border border-yellow-500/10 opacity-20 md:opacity-30 hero-anim-float-4" />
          {/* Added triangle and square for higher clarity (desktop emphasized) */}
          <div
            className="hidden sm:block absolute top-16 w-14 h-14 opacity-30 md:opacity-45 hero-anim-float-1"
            style={{ left: '20%', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', background: 'rgba(234,179,8,0.08)' }}
            aria-hidden
          />
          <div
            className="hidden md:block absolute bottom-12 w-12 h-12 opacity-30 md:opacity-45 rotate-6 hero-anim-float-2"
            style={{ right: '25%', background: 'rgba(234,179,8,0.06)' }}
            aria-hidden
          />
        </div>
        <div className="mavex-container relative z-10 py-20 md:py-32">
          <div className="max-w-7xl mx-auto text-center">
            {/* Copy (RTL aligned to right) */}
            <div className="text-white">
              <h1 className="font-black tracking-[0.02em] leading-[1.05] text-6xl md:text-7xl xl:text-8xl">
                <span className="text-white/90">مرحباً بك في</span>
                <br />
                <span className="text-yellow-500">MAVEX</span>
              </h1>
              <p className="mt-7 max-w-4xl mx-auto text-lg md:text-2xl text-white/85 leading-relaxed">
                اكتشف مجموعتنا المميزة من التيشيرتات عالية الجودة. تصميمات فريدة وألوان مذهلة تناسب جميع الأذواق.
              </p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Link href="/products" className="btn-gold-gradient px-7 py-3.5 rounded-xl font-extrabold text-base md:text-lg">
                  تصفح المنتجات
                </Link>
                <Link href="/contact" className="px-7 py-3.5 rounded-xl font-extrabold border border-white/20 text-white hover:bg-white/10 transition text-base md:text-lg">
                  اتصل بنا
                </Link>
              </div>

              {/* Feature bullets */}
              <div className="mt-8 flex items-center justify-center text-sm md:text-base text-white/80">
                <span>جودة عالية</span>
                <span className="mx-2 text-yellow-500">•</span>
                <span>توصيل سريع</span>
                <span className="mx-2 text-yellow-500">•</span>
                <span>تصميمات حصرية</span>
              </div>
            </div>
          </div>

          {/* Yellow divider: full-bleed double bar + subtle glow */}
          <div className="relative mt-16 md:mt-20 h-8">
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-2 w-screen bg-yellow-500/90" />
            <div className="absolute left-1/2 -translate-x-1/2 top-4 h-[2px] w-screen bg-yellow-500/60" />
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-1/2 -z-10 blur-md h-6 w-screen bg-yellow-500/20" />
          </div>

          {/* Animated counters row under the divider */}
          <div className="mt-8 md:mt-10">
            <HeroCounters />
          </div>
        </div>
      </section>

      {/* White category band (only if categories exist) */}
      {categories.length > 0 && (
        <section className="bg-white py-14 md:py-16 border-t-2 border-yellow-500">
          <div className="mavex-container">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-black text-[#0c1420]">تصفح حسب الأقسام</h2>
              <p className="text-gray-600 mt-2">اختر القسم الذي يناسبك</p>
            </div>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-7 md:gap-10">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/products?category=${encodeURIComponent(c.slug)}`}
                  className="group relative rounded-2xl overflow-hidden border-2 border-yellow-500/40 bg-[#0c1420] text-white aspect-[3/4] min-h-[30rem] md:min-h-[34rem] shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:border-yellow-500/70"
                >
                  {/* Card background layers (brand colors only) */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0c1420] to-[#0c1420]/95" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(234,179,8,0.12),transparent_55%)]" />
                  <div className="absolute inset-0 ring-1 ring-yellow-500/10 rounded-2xl" />
                  {/* Optional category background image (from admin) */}
                  {(() => {
                    const src = (c as any).imageUrl as string | undefined
                    const isHttp = !!src && /^https?:\/\//i.test(src)
                    const normalized = src ? (isHttp ? src : (src.startsWith('/') ? src : `/${src}`)) : ''
                    return src ? (
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-center bg-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                        style={{ backgroundImage: `url('${normalized}')` }}
                      />
                    ) : null
                  })()}

                  {/* Content */}
                  <div className="absolute bottom-7 right-7 text-right">
                    <div className="font-extrabold text-4xl md:text-5xl leading-tight">{c.name}</div>
                    <div className="text-white/85 text-lg md:text-xl">
                      {c.count > 0 ? `${c.count} منتج` : 'تصفح الآن'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
