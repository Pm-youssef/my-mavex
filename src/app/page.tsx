import prisma from '@/lib/prisma'
import ProductCard from '@/components/ProductCard'

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

  return (
    <>
      {/* Hero */}
      <section className="mavex-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1420] via-[#0c1420]/95 to-[#1a2332]" />
        <div className="mavex-container relative z-10 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Copy */}
            <div className="lg:col-span-7 text-white">
              <h1 className="royal-title leading-tight">
                Mavex — أناقة التيشيرت تبدأ من هنا
              </h1>
              <div className="royal-divider" />
              <p className="royal-subtitle max-w-2xl text-white/80">
                تشكيلات مميزة وخامات عالية الجودة بتصاميم عصرية تناسب ذوقك. اكتشف مجموعتنا الجديدة الآن وتمتع بتجربة تسوّق سلسة وسريعة.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <a href="/products" className="btn-gold-gradient px-6 py-3">
                  تسوّق الآن
                </a>
                <a href="/contact" className="btn-brand-dark px-6 py-3">
                  تواصل معنا
                </a>
              </div>
            </div>

            {/* Accent Card */}
            <div className="lg:col-span-5">
              <div className="modern-card hover-lift bg-white/95 backdrop-blur rounded-2xl border border-yellow-500/20 shadow-2xl p-6">
                <div className="text-[#0c1420] text-xl md:text-2xl font-extrabold mb-2">
                  جودة تستحق الاقتناء
                </div>
                <p className="text-gray-600">
                  خامات قطنية مريحة، طباعة ثابتة، وقصّات دقيقة لتفاصيل مثالية. اشعر بالتميز كل يوم.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-gray-50 border">
                    <div className="font-black text-[#0c1420] text-xl">+500</div>
                    <div className="text-xs text-gray-500">عميل راضٍ</div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border">
                    <div className="font-black text-[#0c1420] text-xl">+1000</div>
                    <div className="text-xs text-gray-500">طلب مكتمل</div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border">
                    <div className="font-black text-[#0c1420] text-xl">24/7</div>
                    <div className="text-xs text-gray-500">دعم متواصل</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured products using same ProductCard styling */}
      <section className="light-section py-16">
        <div className="mavex-container">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-[#0c1420]">الأكثر تميزًا</h2>
            <p className="text-gray-600 mt-2">منتجات مختارة حديثًا من مجموعتنا</p>
            <div className="royal-divider" />
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p as any} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <a href="/products" className="inline-block btn-brand-dark px-6 py-3">عرض كل المنتجات</a>
          </div>
        </div>
      </section>
    </>
  )
}
