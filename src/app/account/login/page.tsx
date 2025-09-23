'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, CheckCircle2, Shield, Sparkles, Star, Lock, Truck, ShoppingBag, CreditCard, MessageSquareQuote } from 'lucide-react';
import { toastError, toastSuccess } from '@/components/ui/Toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const search = useSearchParams();
  const googleEnabled = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const facebookEnabled = !!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0 && !loading;
  }, [email, password, loading]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'فشل تسجيل الدخول');
      toastSuccess({ title: 'تم تسجيل الدخول' });
      router.push('/');
    } catch (e: any) {
      const msg = e?.message || 'تعذر تسجيل الدخول';
      setError(msg);
      toastError({ title: 'خطأ', description: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const err = search?.get('error');
    if (!err) return;
    const map: Record<string, string> = {
      google_not_configured:
        'خدمة Google غير مُهيأة. يرجى ضبط مفاتيح OAuth في ملف البيئة.',
      facebook_not_configured:
        'خدمة Facebook غير مُهيأة. يرجى ضبط مفاتيح OAuth في ملف البيئة.',
      invalid_state: 'تعذر إكمال العملية (حماية CSRF). حاول مرة أخرى.',
      google_oauth_failed: 'فشل تسجيل الدخول عبر Google. حاول مجددًا.',
      facebook_oauth_failed: 'فشل تسجيل الدخول عبر Facebook. حاول مجددًا.',
      no_email_from_google: 'لم نستطع الحصول على بريدك من Google.',
      no_email_from_facebook: 'لم نستطع الحصول على بريدك من Facebook.',
    };
    const msg = map[err] || 'تعذر إكمال تسجيل الدخول عبر موفر خارجي.';
    setError(msg);
  }, [search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1420] via-[#101826] to-[#0c1420] pt-24 pb-16">
      <div className="mavex-container">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Form Side */}
          <div className="bg-white/95 backdrop-blur border border-yellow-500/20 rounded-3xl shadow-xl p-8 md:p-10">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-300 text-yellow-700 bg-yellow-50 text-xs font-bold mb-3">
                <Sparkles className="w-4 h-4" /> اهلاً بك من جديد
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-[#0c1420] mb-2">
                تسجيل الدخول
              </h1>
              <p className="text-gray-600">
                انضم لعائلتنا وتمتع بتجربة تسوق عالمية ✨
              </p>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="mavex-label text-black">
                  البريد الإلكتروني
                </label>
                <input
                  className="mavex-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="mavex-label text-black">كلمة المرور</label>
                <div className="relative">
                  <input
                    className="mavex-input pr-12"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute inset-y-0 left-3 my-auto p-2 rounded-lg text-gray-500 hover:text-[#0c1420]"
                    aria-label={
                      showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                    }
                  >
                    {showPw ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                    تذكّرني
                  </label>
                  <Link
                    href="#"
                    className="text-sm text-yellow-700 hover:text-yellow-800 font-bold"
                  >
                    نسيت كلمة المرور؟
                  </Link>
                </div>
              </div>

              <button
                disabled={!canSubmit}
                className="btn-gold-gradient w-full py-3 rounded-2xl font-extrabold disabled:opacity-60"
              >
                {loading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-500 font-bold">
                أو تابع باستخدام
              </span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {googleEnabled ? (
                <a
                  href="/api/auth/oauth/google"
                  className="inline-flex items-center justify-center gap-3 w-full py-3 rounded-xl border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 font-extrabold text-[#0c1420] transition-all duration-300"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white">
                    <span className="text-[#ea4335]">G</span>
                  </span>
                  Google
                </a>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center justify-center gap-3 w-full py-3 rounded-xl border-2 border-gray-200 text-gray-400 font-extrabold cursor-not-allowed"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white">
                    <span className="text-[#ea4335]">G</span>
                  </span>
                  Google (غير مهيأة)
                </button>
              )}
              {facebookEnabled ? (
                <a
                  href="/api/auth/oauth/facebook"
                  className="inline-flex items-center justify-center gap-3 w-full py-3 rounded-xl border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 font-extrabold text-[#0c1420] transition-all duration-300"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#1877F2] text-white font-black">
                    f
                  </span>
                  Facebook
                </a>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center justify-center gap-3 w-full py-3 rounded-xl border-2 border-gray-200 text-gray-400 font-extrabold cursor-not-allowed"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#1877F2] text-white font-black">
                    f
                  </span>
                  Facebook (غير مهيأة)
                </button>
              )}
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              ليس لديك حساب؟{' '}
              <Link
                href="/account/register"
                className="text-yellow-700 hover:text-yellow-800 font-bold"
              >
                إنشاء حساب
              </Link>
            </div>
          </div>

          {/* Benefits / Brand Side */}
          <div className="bg-[#0c1420] rounded-3xl border border-yellow-500/30 p-8 md:p-10 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none" />
            <h2 className="text-2xl md:text-3xl font-black mb-3">لماذا تنضم إلينا؟</h2>

            {/* Rating summary */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-5 h-5" />
                <span className="font-extrabold">4.9/5</span>
              </div>
              <span className="text-white/70 text-sm">بناءً على 1,200+ مراجعة موثوقة</span>
            </div>

            {/* Bullets */}
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-yellow-400 mt-0.5" />
                <div>
                  <div className="font-extrabold">تجربة عالمية</div>
                  <div className="text-white/80 text-sm">واجهة حديثة وسريعة مستوحاة من أفضل المتاجر العالمية</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-yellow-400 mt-0.5" />
                <div>
                  <div className="font-extrabold">مفضلة ومراجعات</div>
                  <div className="text-white/80 text-sm">احفظ منتجاتك المفضلة وشارك رأيك بسهولة</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-yellow-400 mt-0.5" />
                <div>
                  <div className="font-extrabold">حماية وخصوصية</div>
                  <div className="text-white/80 text-sm">جلسات محمية وبياناتك بأمان معنا</div>
                </div>
              </li>
            </ul>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                <Truck className="w-5 h-5 text-yellow-400" />
                <span className="text-sm">توصيل خلال 48h</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                <Lock className="w-5 h-5 text-yellow-400" />
                <span className="text-sm">دفع آمن</span>
              </div>
            </div>

            {/* Testimonial */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-yellow-500/20 p-2">
                  <MessageSquareQuote className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 text-yellow-400 mb-1">
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">خدمة ممتازة وجودة تيشيرتات رائعة. تجربة الشراء كانت سهلة والتوصيل سريع.</p>
                  <div className="mt-2 text-xs text-white/60">— أحمد م.</div>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="text-center rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mx-auto mb-2 w-8 h-8 grid place-items-center rounded-lg bg-yellow-500/20">
                  <ShoppingBag className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="font-extrabold">اختر</div>
                <div className="text-xs text-white/70">منتجاتك المفضلة</div>
              </div>
              <div className="text-center rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mx-auto mb-2 w-8 h-8 grid place-items-center rounded-lg bg-yellow-500/20">
                  <CreditCard className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="font-extrabold">ادفع</div>
                <div className="text-xs text-white/70">بسهولة وأمان</div>
              </div>
              <div className="text-center rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mx-auto mb-2 w-8 h-8 grid place-items-center rounded-lg bg-yellow-500/20">
                  <Truck className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="font-extrabold">استلم</div>
                <div className="text-xs text-white/70">توصيل خلال 48h</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
