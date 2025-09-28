export default function HomePage() {
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

      {/* Secondary section */}
      <section className="light-section py-16">
        <div className="mavex-container">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-[#0c1420]">اختيارات مميّزة</h2>
            <p className="text-gray-600 mt-2">تعرّف على أفضل القطع الأكثر طلبًا هذا الأسبوع</p>
            <div className="royal-divider" />
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map((i) => (
              <div key={i} className="modern-card hover-lift">
                <div className="h-48 bg-gray-100" />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-[#0c1420] truncate">تيشيرت كلاسيك {i}</h3>
                    <span className="text-yellow-600 font-black">EGP 299</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">خامة مريحة بتصميم بسيط يناسب جميع الإطلالات اليومية.</p>
                  <a href="/products" className="mt-4 inline-block btn-brand-dark px-4 py-2">تسوق المنتج</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
