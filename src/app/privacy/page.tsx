import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | MAVEX',
  description:
    'تعرف على كيفية جمعنا لبياناتك الشخصية واستخدامها وحمايتها في متجر MAVEX.'
};

export default function PrivacyPage() {
  return (
    <section className="pt-28 pb-16 md:pb-24 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950" dir="rtl">
      <div className="mavex-container">
        {/* Hero */}
        <div className="text-center mb-12 md:mb-16">
          <div className="royal-divider mb-8"></div>
          <h1 className="text-4xl md:text-5xl font-black text-[#0c1420] dark:text-white leading-tight">
            سياسة <span className="text-yellow-600">الخصوصية</span>
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
            كيف نجمع بياناتك ونستخدمها ونحميها في MAVEX — بكل وضوح وشفافية.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full border-2 border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-500/10">
            <span>آخر تحديث: 10 سبتمبر 2025</span>
          </div>
          <div className="royal-divider mt-8"></div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-28 space-y-3">
              <div className="modern-card">
                <h2 className="text-xl font-bold text-[#0c1420] dark:text-white mb-4">جدول المحتويات</h2>
                <nav className="space-y-2 text-sm">
                  <a className="block hover:text-yellow-700" href="#intro">مقدمة</a>
                  <a className="block hover:text-yellow-700" href="#collect">المعلومات التي نجمعها</a>
                  <a className="block hover:text-yellow-700" href="#use">كيف نستخدم معلوماتك</a>
                  <a className="block hover:text-yellow-700" href="#cookies">ملفات تعريف الارتباط</a>
                  <a className="block hover:text-yellow-700" href="#security">حماية البيانات</a>
                  <a className="block hover:text-yellow-700" href="#rights">حقوقك</a>
                  <a className="block hover:text-yellow-700" href="#contact">التواصل</a>
                </nav>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-8">
            <div className="modern-card">
              <div className="prose prose-slate max-w-none rtl:prose-p:text-right rtl:prose-h2:text-right rtl:prose-li:text-right dark:prose-invert">
                <p id="intro">
                  نلتزم في MAVEX بحماية خصوصيتك. تشرح هذه السياسة كيفية جمعنا
                  للمعلومات وطرق استخدامها وحمايتها. باستخدامك لموقعنا فأنت توافق
                  على الشروط الموضحة أدناه.
                </p>

                <h2 id="collect">المعلومات التي نجمعها</h2>
                <ul>
                  <li>معلومات الاتصال: مثل الاسم، البريد الإلكتروني، رقم الهاتف.</li>
                  <li>معلومات الدفع: تتم معالجتها عبر مزودين آمنين ولا نخزن بيانات البطاقات.</li>
                  <li>معلومات الاستخدام: مثل الصفحات التي تزورها والمنتجات التي تتصفحها.</li>
                </ul>

                <h2 id="use">كيف نستخدم معلوماتك</h2>
                <ul>
                  <li>معالجة الطلبات وتقديم خدمة العملاء.</li>
                  <li>تحسين تجربة التسوق وتخصيص المحتوى.</li>
                  <li>إرسال تحديثات حول العروض والمنتجات (يمكنك إلغاء الاشتراك في أي وقت).</li>
                </ul>

                <h2 id="cookies">ملفات تعريف الارتباط (Cookies)</h2>
                <p>
                  نستخدم ملفات تعريف الارتباط لتحسين الأداء وتخصيص التجربة. يمكنك
                  التحكم فيها من إعدادات المتصفح.
                </p>

                <div className="p-4 md:p-5 rounded-xl border-2 border-yellow-500/40 bg-yellow-50/60 dark:bg-yellow-500/10 mb-6">
                  <p className="m-0 text-sm text-[#0c1420] dark:text-yellow-100">
                    لمزيد من المعلومات حول أدوات التتبع، راجع إعدادات المتصفح أو سياسات مزودي التحليلات.
                  </p>
                </div>

                <h2 id="security">حماية البيانات</h2>
                <p>
                  نتخذ إجراءات تقنية وتنظيمية مناسبة لحماية بياناتك من الوصول أو
                  الاستخدام غير المصرح به.
                </p>

                <h2 id="rights">حقوقك</h2>
                <ul>
                  <li>الاطلاع على بياناتك وتصحيحها أو حذفها.</li>
                  <li>الاعتراض على المعالجة لبعض الأغراض.</li>
                  <li>طلب نقل البيانات حيثما كان ذلك ممكنًا.</li>
                </ul>

                <h2 id="contact">التواصل معنا</h2>
                <p>
                  لأي استفسار حول سياسة الخصوصية، راسلنا عبر البريد: {' '}
                  <a className="underline" href="mailto:info@mavex.com">info@mavex.com</a> أو من خلال {' '}
                  <Link className="underline" href="/contact">نموذج الاتصال</Link>.
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
