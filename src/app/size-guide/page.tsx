import Link from 'next/link';

export const metadata = {
  title: 'دليل المقاسات | التيشيرتات',
  description: 'دليل مقاسات التيشيرتات بالمقاسات بالسنتيمتر (عرض الصدر وطول الجسم).',
};

export default function SizeGuidePage() {
  const rows = [
    { size: 'M', width: 56, length: 73 },
    { size: 'L', width: 59, length: 75 },
    { size: 'XL', width: 62, length: 78 },
    { size: '2XL (XXL)', width: 65, length: 80 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-widest text-[#0c1420] mb-3">
            دليل <span className="text-yellow-600">المقاسات</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            القياسات بالسنتيمتر. تم القياس على تيشيرت مُسطّح.
            عرض الصدر (Half Chest) هو القياس من تحت الإبط إلى الإبط.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-[#0c1420]/20">
          <div className="bg-[#0c1420] text-white p-6">
            <h2 className="text-xl font-extrabold">دليل المقاسات للتيشيرت</h2>
          </div>

          {/* Table */}
          <div className="bg-[#0c1420] text-white/90">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm rtl text-right">
                <thead>
                  <tr className="bg-white/5 text-white">
                    <th className="px-6 py-4 font-bold border-b border-white/10">المقاس</th>
                    <th className="px-6 py-4 font-bold border-b border-white/10">عرض الصدر (سم)</th>
                    <th className="px-6 py-4 font-bold border-b border-white/10">طول التيشيرت (سم)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.size} className={i % 2 === 0 ? 'bg-white/0' : 'bg-white/5'}>
                      <td className="px-6 py-4 border-b border-white/10 font-extrabold">{r.size}</td>
                      <td className="px-6 py-4 border-b border-white/10">{r.width}</td>
                      <td className="px-6 py-4 border-b border-white/10">{r.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            <div className="px-6 py-5 text-xs text-white/70 space-y-2">
              <p>قد تختلف القياسات بمقدار ±2 سم بسبب طبيعة التصنيع.</p>
              <p>
                للمساعدة في الاختيار: قِس تيشيرتك المفضل بشكل مُسطّح وقارِن النتائج بالجدول.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/products"
            className="inline-block bg-yellow-500 text-[#0c1420] py-3 px-6 rounded-xl font-extrabold hover:bg-yellow-400 transition-colors"
          >
            تصفّح المنتجات
          </Link>
          <Link
            href="/"
            className="inline-block bg-black text-white py-3 px-6 rounded-xl font-bold hover:bg-yellow-500 hover:text-black border-2 border-black hover:border-yellow-500 transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
