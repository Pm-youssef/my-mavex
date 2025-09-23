import prisma from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import HomeStats from '@/components/HomeStats';
import Script from 'next/script';
import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/constants';
import Image from 'next/image';

export const revalidate = 0;

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function HomePage() {
  const productsRaw = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { variants: { select: { id: true, size: true, stock: true, minDisplayStock: true } } },
  });
  const products = Array.isArray(productsRaw) ? productsRaw : [];
  // Load categories directly via Prisma to avoid env/config issues
  const categoriesRaw = await prisma.category.findMany({
    orderBy: [{ displayOrder: 'asc' as const }, { name: 'asc' as const }],
    include: { _count: { select: { products: true } } } as any,
  });
  const categories = (Array.isArray(categoriesRaw) ? categoriesRaw : []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    displayOrder: c.displayOrder,
    parentId: c.parentId,
    imageUrl: c.imageUrl,
    bannerUrl: c.bannerUrl,
    thumbnailUrl: c.thumbnailUrl,
    iconUrl: c.iconUrl,
    productsCount: c?._count?.products || 0,
  }));

  return (
    <div className="min-h-screen">
      {/* JSON-LD: ItemList of products for rich results */}
      <Script
        id="home-itemlist-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: (Array.isArray(products) ? products : []).slice(0, 8).map((p: any, idx: number) => {
              const price =
                typeof p.discountedPrice === 'number' && p.discountedPrice < p.originalPrice
                  ? p.discountedPrice
                  : p.originalPrice;
              const availability = (Array.isArray(p.variants) && p.variants.length > 0
                ? p.variants.some((v: any) => (v?.stock || 0) > 0)
                : (p.stock || 0) > 0)
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock';
              return {
                '@type': 'ListItem',
                position: idx + 1,
                item: {
                  '@type': 'Product',
                  name: p.name,
                  description: p.description,
                  image: [p.thumbnailUrl || p.imageUrl].filter(Boolean),
                  offers: {
                    '@type': 'Offer',
                    price,
                    priceCurrency: 'EGP',
                    availability,
                  },
                },
              };
            }),
          }),
        }}
      />
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0c1420] via-gray-900 to-[#0c1420] py-32 relative overflow-hidden">
        <div className="w-full max-w-[140rem] 2xl:max-w-none mx-auto px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 relative z-10">
          <div className="text-center text-white max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-black tracking-widest uppercase text-white mb-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none">
              مرحباً بك في <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(234,179,8,0.25)]">Mavex</span>
            </h1>
            <p className="text-xl md:text-2xl font-light tracking-wide text-white/90 mb-16 leading-relaxed animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '120ms' }}>
              اكتشف مجموعتنا المميزة من التيشيرتات عالية الجودة
              <br />
              تصميمات فريدة وألوان مذهلة تناسب جميع الأذواق
            </p>

            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '220ms' }}>
                <a
                  href="#products"
                  className="bg-white text-[#0c1420] py-4 px-8 rounded-2xl font-bold transition-all duration-300 hover:bg-yellow-500 hover:text-white border-2 border-white hover:border-yellow-500 transform hover:scale-105 shadow-lg hover:shadow-2xl"
                >
                  تصفح المنتجات
                </a>

                <Link
                  href="/contact"
                  className="bg-transparent text-white py-4 px-8 rounded-2xl font-bold transition-all duration-300 hover:bg-white hover:text-[#0c1420] border-2 border-white hover:border-yellow-500 transform hover:scale-105 shadow-lg hover:shadow-2xl"
                >
                  اتصل بنا
                </Link>
              </div>

              <div className="flex justify-center items-center space-x-8 space-x-reverse text-sm text-white/80">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  <span>جودة عالية</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span
                    className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"
                    style={{ animationDelay: '0.5s' }}
                  ></span>
                  <span>توصيل سريع</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span
                    className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"
                    style={{ animationDelay: '1s' }}
                  ></span>
                  <span>تصميمات حصرية</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accent Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-80 w-80 rounded-full bg-yellow-500/10 blur-3xl animate-pulse" aria-hidden></div>
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} aria-hidden></div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-4 h-4 bg-yellow-500 rounded-full opacity-60 animate-bounce"></div>
        <div
          className="absolute top-40 right-20 w-3 h-3 bg-yellow-400 rounded-full opacity-40 animate-bounce"
          style={{ animationDelay: '0.5s' }}
        ></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-yellow-600 rounded-full opacity-80 animate-pulse"></div>
      </section>

      {/* Stats Section */}
      <HomeStats />

      {/* Shop by Category (Trendy) */}
      {Array.isArray(categories) && categories.length > 0 && (
        <section className="bg-[#0c1420] text-white py-20">
          <div className="w-full max-w-[140rem] 2xl:max-w-none mx-auto px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
            <div className="flex items-end justify-between gap-4 mb-12">
              <div>
                <h2 className="text-5xl md:text-7xl font-black tracking-widest uppercase">تسوّق حسب القسم</h2>
                <p className="mt-3 text-white/70 text-lg">اكتشف الفئات الأكثر شعبية لدينا</p>
              </div>
              <Link href="/products" className="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-xl border border-white/20 hover:border-white/60 hover:bg-white/5 transition-all">
                عرض جميع المنتجات ↗
              </Link>
            </div>
            <div className={`${categories.length <= 2 ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-8 place-items-stretch ${categories.length === 1 ? 'md:place-items-center' : ''}`}>
              {categories.slice(0, 8).map((c: any, idx: number) => (
                <Link
                  key={c.id}
                  href={`/products?category=${encodeURIComponent(c.slug)}`}
                  className="group relative rounded-3xl overflow-hidden border border-white/15 bg-transparent shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(255,255,255,0.35)] transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 w-full"
                >
                  <div className="relative h-[28rem] md:h-[32rem] xl:h-[36rem]">
                    {/* Background image */}
                    {c.thumbnailUrl || c.imageUrl || c.bannerUrl ? (
                      <Image
                        src={c.thumbnailUrl || c.imageUrl || c.bannerUrl}
                        alt={c.name}
                        fill
                        sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        className="object-cover object-center opacity-100 brightness-115 contrast-120 saturate-120 group-hover:brightness-120 group-hover:contrast-125 transition-[opacity,filter] duration-500"
                        priority={idx < 3}
                        unoptimized
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                        <Image src="/img/tshirt-fblue.png" alt="placeholder" fill sizes="100vw" className="object-cover opacity-60 brightness-115 saturate-120" unoptimized />
                      </>
                    )}
                    {/* Bottom gradient only for text legibility (no global haze) */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 md:h-40 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-7 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-2xl md:text-3xl font-extrabold drop-shadow-sm">{c.name}</div>
                        {typeof c.productsCount === 'number' && (
                          <div className="text-xs text-white/80">{c.productsCount} منتج</div>
                        )}
                      </div>
                      <div className="px-4 py-1.5 rounded-full text-sm font-bold bg-white/90 text-[#0c1420] border border-white/60 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                        تصفّح ↗
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      <section id="products" className="bg-gray-50 text-[#0c1420] py-20">
        <div className="w-full max-w-[140rem] 2xl:max-w-none mx-auto px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
          <div className="text-center mb-16">
            <div className="w-32 h-1 bg-yellow-500 mx-auto mb-8"></div>
            <h2 className="text-5xl md:text-7xl font-black tracking-widest uppercase text-[#0c1420] mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none">
              منتجاتنا <span className="text-yellow-500">المميزة</span>
            </h2>
            <p className="text-xl md:text-2xl font-light tracking-wide text-gray-600 max-w-3xl mx-auto leading-relaxed animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '120ms' }}>
              تشكيلة واسعة من التيشيرتات بأحدث التصميمات والألوان
              <br />
              جودة عالية وأسعار منافسة تناسب جميع الميزانيات
            </p>
            <div className="w-32 h-1 bg-yellow-500 mx-auto mt-8"></div>
          </div>

          {!Array.isArray(products) || products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 text-gray-300">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <p className="text-gray-600 text-xl font-medium mb-4">
                لا توجد منتجات متاحة حالياً
              </p>
              <p className="text-gray-500">سنضيف منتجات جديدة قريباً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(Array.isArray(products) ? products : []).slice(0, 8).map((product: any, index: number) => (
                <div
                  key={product.id}
                  className="w-full transform transition-all duration-300 hover:-translate-y-2"
                >
                  <div
                    className="animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <ProductCard product={product} priority={index < 3} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View All Products Button */}
          <div className="text-center mt-16">
            <Link
              href="/products"
              className="bg-yellow-500 text-[#0c1420] py-4 px-8 rounded-2xl font-bold transition-all duration-300 hover:bg-[#0c1420] hover:text-white border-2 border-yellow-500 hover:border-[#0c1420] transform hover:scale-105 shadow-lg hover:shadow-2xl"
            >
              عرض جميع المنتجات
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[#0c1420] text-white py-20">
        <div className="w-full max-w-[140rem] 2xl:max-w-none mx-auto px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
          <div className="text-center mb-16">
            <div className="w-32 h-1 bg-yellow-500 mx-auto mb-8"></div>
            <h2 className="text-5xl md:text-7xl font-black tracking-widest uppercase text-white mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none">
              لماذا <span className="text-yellow-500">Mavex</span>؟
            </h2>
            <p className="text-xl md:text-2xl font-light tracking-wide text-gray-300 max-w-3xl mx-auto leading-relaxed animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '120ms' }}>
              نقدم لكم تجربة تسوق استثنائية مع أفضل المنتجات والخدمات
            </p>
            <div className="w-32 h-1 bg-yellow-500 mx-auto mt-8"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center group animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none">
              <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-[#0c1420]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">جودة عالية</h3>
              <p className="text-gray-300 leading-relaxed">
                جميع منتجاتنا مصنوعة من أفضل أنواع القطن الطبيعي عالي الجودة
              </p>
            </div>

            <div className="text-center group animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '120ms' }}>
              <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-[#0c1420]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">توصيل سريع</h3>
              <p className="text-gray-300 leading-relaxed">
                توصيل سريع وآمن لجميع أنحاء مصر خلال 48-72 ساعة
              </p>
            </div>

            <div className="text-center group animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '240ms' }}>
              <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-[#0c1420]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                تصميمات حصرية
              </h3>
              <p className="text-gray-300 leading-relaxed">
                تصميمات فريدة وحصرية تناسب جميع الأذواق والأعمار
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-50 text-[#0c1420] py-20">
        <div className="w-full max-w-[140rem] 2xl:max-w-none mx-auto px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-black tracking-widest uppercase text-[#0c1420] mb-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none">
              جاهز للبدء؟ انضم إلى آلاف العملاء الراضين واكتشف عالم{' '}
              <span className="text-yellow-500">Mavex</span> المميز
            </h2>
            <p className="text-xl md:text-2xl font-light tracking-wide text-gray-600 mb-12 leading-relaxed animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '120ms' }}>
              ابدأ رحلتك معنا اليوم واحصل على أفضل التيشيرتات بأفضل الأسعار
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '220ms' }}>
              <Link
                href="/products"
                className="bg-transparent text-[#0c1420] py-4 px-8 rounded-2xl font-bold transition-all duration-300 hover:bg-yellow-500 hover:text-white border-2 border-[#0c1420] hover:border-yellow-500 transform hover:scale-105 shadow-lg hover:shadow-2xl"
              >
                تسوق الآن
              </Link>

              <Link
                href="/contact"
                className="bg-transparent text-[#0c1420] py-4 px-8 rounded-2xl font-bold transition-all duration-300 hover:bg-yellow-500 hover:text-white border-2 border-[#0c1420] hover:border-yellow-500 transform hover:scale-105 shadow-lg hover:shadow-2xl"
              >
                اتصل بنا
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
