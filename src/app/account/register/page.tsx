"use client";
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle2, Shield, Sparkles } from 'lucide-react'
import { toastError, toastSuccess } from '@/components/ui/Toast'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length >= 6 && !loading
  }, [email, password, loading])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password.trim() })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'فشل التسجيل')
      toastSuccess({ title: 'تم إنشاء الحساب' })
      router.push('/')
    } catch (e: any) {
      const msg = e?.message || 'تعذر إنشاء الحساب'
      setError(msg)
      toastError({ title: 'خطأ', description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1420] via-[#101826] to-[#0c1420] pt-24 pb-16">
      <div className="mavex-container">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Form Side */}
          <div className="bg-white/95 backdrop-blur border border-yellow-500/20 rounded-3xl shadow-xl p-8 md:p-10">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-300 text-yellow-700 bg-yellow-50 text-xs font-bold mb-3">
                <Sparkles className="w-4 h-4" /> أهلاً بك
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-[#0c1420] mb-2">إنشاء حساب</h1>
              <p className="text-gray-600">ابدأ رحلتك معنا وتمتع بتجربة تسوق عالمية ✨</p>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold">{error}</div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="mavex-label text-black">الاسم (اختياري)</label>
                <input className="mavex-input" value={name} onChange={e => setName(e.target.value)} placeholder="اسمك" />
              </div>
              <div>
                <label className="mavex-label text-black">البريد الإلكتروني</label>
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
                    aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">6 أحرف على الأقل</p>
              </div>

              <button
                disabled={!canSubmit}
                className="btn-gold-gradient w-full py-3 rounded-2xl font-extrabold disabled:opacity-60"
              >
                {loading ? 'جارٍ الإنشاء…' : 'إنشاء حساب'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-500 font-bold">أو تابع باستخدام</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="/api/auth/oauth/google"
                className="inline-flex items-center justify-center gap-3 w-full py-3 rounded-xl border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 font-extrabold text-[#0c1420] transition-all duration-300"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white">
                  <span className="text-[#ea4335]">G</span>
                </span>
                Google
              </a>
              <a
                href="/api/auth/oauth/facebook"
                className="inline-flex items-center justify-center gap-3 w-full py-3 rounded-xl border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 font-extrabold text-[#0c1420] transition-all duration-300"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#1877F2] text-white font-black">f</span>
                Facebook
              </a>
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link href="/account/login" className="text-yellow-700 hover:text-yellow-800 font-bold">تسجيل الدخول</Link>
            </div>
          </div>

          {/* Benefits / Brand Side */}
          <div className="bg-[#0c1420] rounded-3xl border border-yellow-500/30 p-8 md:p-10 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none" />
            <h2 className="text-2xl md:text-3xl font-black mb-6">مميزات العضوية</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-yellow-400 mt-0.5" />
                <div>
                  <div className="font-extrabold">خصومات وعروض</div>
                  <div className="text-white/80 text-sm">عروض خاصة للأعضاء ومفاجآت موسمية</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-yellow-400 mt-0.5" />
                <div>
                  <div className="font-extrabold">حفظ المفضلة</div>
                  <div className="text-white/80 text-sm">تتبع منتجاتك المفضلة عبر جميع أجهزتك</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-yellow-400 mt-0.5" />
                <div>
                  <div className="font-extrabold">أمان وخصوصية</div>
                  <div className="text-white/80 text-sm">حماية بياناتك وجلساتك بكوكيز آمنة</div>
                </div>
              </li>
            </ul>

            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-black text-yellow-400">+10K</div>
                <div className="text-xs text-white/70">عملاء راضون</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-black text-yellow-400">4.9★</div>
                <div className="text-xs text-white/70">تقييم متوسط</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-black text-yellow-400">48h</div>
                <div className="text-xs text-white/70">توصيل سريع</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
