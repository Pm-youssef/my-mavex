import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'شروط الاستخدام | MAVEX',
  description:
    'يرجى قراءة شروط الاستخدام الخاصة بموقع MAVEX بعناية قبل استخدام خدماتنا.'
};

export default function TermsPage() {
  return (
    <section className="pt-28 pb-16 md:pb-24 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950" dir="rtl">
      <div className="mavex-container">
        {/* Hero */}
        <div className="text-center mb-12 md:mb-16">
          <div className="royal-divider mb-8"></div>
          <h1 className="text-4xl md:text-5xl font-black text-[#0c1420] dark:text-white leading-tight">
            شروط <span className="text-yellow-600">الاستخدام</span>
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
            يُرجى قراءة هذه الشروط بعناية، فهي تُنظّم استخدامك لمتجر MAVEX وخدماته.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full border-2 border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-500/10">
            <span>آخر تحديث: 10 سبتمبر 2025</span>
          </div>
          <div className="royal-divider mt-8"></div>
        </div>

        {/* Content layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-28 space-y-3">
              <div className="modern-card">
                <h2 className="text-xl font-bold text-[#0c1420] dark:text-white mb-4">جدول المحتويات</h2>
                <nav className="space-y-2 text-sm">
                  <a className="block hover:text-yellow-700" href="#accept">قبول الشروط</a>
                  <a className="block hover:text-yellow-700" href="#usage">الاستخدام المسموح</a>
                  <a className="block hover:text-yellow-700" href="#orders">الطلبات والدفع</a>
                  <a className="block hover:text-yellow-700" href="#returns">سياسة الإرجاع</a>
                  <a className="block hover:text-yellow-700" href="#changes">تعديل الشروط</a>
                  <a className="block hover:text-yellow-700" href="#contact">التواصل</a>
                </nav>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-8">
            <div className="modern-card">
              <div className="prose prose-slate max-w-none rtl:prose-p:text-right rtl:prose-h2:text-right rtl:prose-li:text-right dark:prose-invert">
                <h2 id="accept">قبول الشروط</h2>
                <p>
                  باستخدامك لموقع MAVEX فإنك توافق على الالتزام بهذه الشروط وكافة القوانين
                  واللوائح المعمول بها. إذا كنت لا توافق على أي من هذه الشروط، فيُرجى عدم استخدام الموقع.
                </p>

                <h2 id="usage">الاستخدام المسموح</h2>
                <ul>
                  <li>عدم إساءة استخدام الموقع أو محاولة الوصول غير المصرح به.</li>
                  <li>عدم انتهاك حقوق الملكية الفكرية أو العلامات التجارية.</li>
                  <li>الامتثال لكافة القوانين المحلية والدولية ذات الصلة.</li>
                </ul>

                <h2 id="orders">الطلبات والدفع</h2>
                <p>
                  قد تخضع عمليات الشراء للتأكد من الهوية والدفع الآمن عبر مزودي خدمات الدفع.
                  نحن لا نخزن بيانات بطاقات الدفع على خوادمنا.
                </p>

                <div className="p-4 md:p-5 rounded-xl border-2 border-yellow-500/40 bg-yellow-50/60 dark:bg-yellow-500/10 mb-6">
                  <p className="m-0 text-sm text-[#0c1420] dark:text-yellow-100">
                    للتفاصيل المتعلقة بالبيانات والخصوصية، يُرجى مراجعة <Link className="underline hover:text-yellow-700" href="/privacy">سياسة الخصوصية</Link>.
                  </p>
                </div>

                <h2 id="returns">سياسة الإرجاع</h2>
                <p>
                  يُرجى الرجوع إلى مواد الدعم لمعرفة تفاصيل الإرجاع والاستبدال المتاحة.
                </p>

                <h2 id="changes">تعديل الشروط</h2>
                <p>
                  يحتفظ MAVEX بالحق في تعديل هذه الشروط في أي وقت. يسري أي تعديل من تاريخ نشره في الموقع.
                </p>

                <h2 id="contact">التواصل</h2>
                <p>
                  لأي استفسار حول الشروط، راسلنا عبر البريد: {' '}
                  <a className="underline" href="mailto:info@mavex.com">info@mavex.com</a>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <Link href="/" className="mavex-button-secondary">العودة للصفحة الرئيسية</Link>
              <a href="#" className="text-sm text-gray-600 dark:text-gray-300 hover:text-yellow-700">للأعلى ↑</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
