'use client';

import { useEffect, useMemo, useState } from 'react';
// no link needed on this page
import Script from 'next/script';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Sun,
  Moon,
  MessageSquare,
  Facebook,
  Instagram,
  Twitter,
} from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/constants';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    // Honeypot field to reduce spam
    company: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' &&
    document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light'
  );
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  useEffect(() => {
    // Respect saved theme or system preference on mount
    const stored =
      typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial =
      (stored as 'light' | 'dark' | null) || (prefersDark ? 'dark' : 'light');
    setTheme(initial as 'light' | 'dark');
    document.documentElement.classList.toggle('dark', initial === 'dark');

    // Expose Turnstile callback
    // @ts-ignore
    (window as any).onTurnstileSuccess = (token: string) => {
      setTurnstileToken(token);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch {}
  };

  const workingHours = useMemo(
    () => [
      { day: 'الأحد', hours: '9:00 ص - 6:00 م' },
      { day: 'الإثنين', hours: '9:00 ص - 6:00 م' },
      { day: 'الثلاثاء', hours: '9:00 ص - 6:00 م' },
      { day: 'الأربعاء', hours: '9:00 ص - 6:00 م' },
      { day: 'الخميس', hours: '9:00 ص - 6:00 م' },
      { day: 'الجمعة', hours: '10:00 ص - 4:00 م' },
      { day: 'السبت', hours: '10:00 ص - 4:00 م' },
    ],
    []
  );
  const todayIndex = useMemo(() => {
    // JS: 0=Sunday...6=Saturday. Our list starts with Sunday, so it's aligned.
    return new Date().getDay();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (formData.company.trim()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // If siteKey configured, require Turnstile token
      if (siteKey && !turnstileToken) {
        throw new Error('يرجى التحقق من أنك لست روبوتًا');
      }

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, turnstileToken }),
      });
      if (!res.ok) {
        let errMsg = 'فشل إرسال الرسالة';
        try {
          const data = await res.json();
          if (data?.error) errMsg = data.error;
          if (data?.issues) console.warn('Validation issues:', data.issues);
        } catch {}
        throw new Error(errMsg);
      }

      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        company: '',
      });
      setTurnstileToken('');
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div
      className="min-h-screen pt-32 pb-28 md:pb-10 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 transition-colors"
      dir="rtl"
    >
      {/* Cloudflare Turnstile script */}
      {siteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20 animate-in fade-in-50 duration-500">
          <h1 className="text-4xl md:text-5xl font-black text-[#0c1420] dark:text-white mb-4 leading-tight">
            اتصل <span className="text-yellow-600">بنا</span>
          </h1>
          <p className="text-xl md:text-2xl font-light text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            نحن هنا لمساعدتك! اتصل بنا لأي استفسار أو طلب
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
          {/* Contact Form */}
          <div className="modern-card animate-in fade-in-50 slide-in-from-right-8 duration-500 bg-[#0c1420] dark:bg-white border border-[#0c1420] dark:border-gray-200 text-white dark:text-[#0c1420] transition-colors">
            <h2 className="text-3xl font-bold text-white dark:text-[#0c1420] mb-8 border-b-2 border-yellow-500 pb-4">
              أرسل رسالة
            </h2>

            {submitSuccess && (
              <div
                className="mb-6 p-4 bg-emerald-100 dark:bg-emerald-200/20 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-start justify-between gap-4"
                role="status"
                aria-live="polite"
              >
                <div>
                  <p className="font-bold">🎉 تم إرسال رسالتك بنجاح</p>
                  <p>سنقوم بالرد عليك في أقرب وقت ممكن.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitSuccess(false)}
                  className="text-emerald-800/80 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-md px-2 py-1"
                  aria-label="إغلاق الرسالة"
                >
                  ×
                </button>
              </div>
            )}

            <form
              id="contact-form"
              onSubmit={handleSubmit}
              className="space-y-8"
              aria-busy={isSubmitting}
            >
              {/* Honeypot field (hidden) */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="company" className="sr-only">
                  Company
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  autoComplete="off"
                  tabIndex={-1}
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>
              {/* Turnstile widget (shown only if site key configured) */}
              {siteKey && (
                <div className="flex justify-center">
                  <div
                    className="cf-turnstile"
                    data-sitekey={siteKey}
                    data-callback="onTurnstileSuccess"
                    data-theme="auto"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="mavex-label text-white dark:text-[#0c1420]">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                    className="mavex-input focus:border-yellow-600 focus:ring-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 py-3 rounded-xl text-base md:text-lg"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mavex-label text-white dark:text-[#0c1420]">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    className="mavex-input focus:border-yellow-600 focus:ring-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 py-3 rounded-xl text-base md:text-lg"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="mavex-label text-white dark:text-[#0c1420]">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  className="mavex-input focus:border-yellow-600 focus:ring-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 py-3 rounded-xl text-base md:text-lg"
                />
              </div>

              <div>
                <label htmlFor="subject" className="mavex-label text-white dark:text-[#0c1420]">
                  الموضوع
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                  className="mavex-input focus:border-yellow-600 focus:ring-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 py-3 rounded-xl text-base md:text-lg"
                >
                  <option value="">اختر الموضوع</option>
                  <option value="استفسار عام">استفسار عام</option>
                  <option value="طلب منتج">طلب منتج</option>
                  <option value="شكوى">شكوى</option>
                  <option value="اقتراح">اقتراح</option>
                  <option value="تعاون">تعاون</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="mavex-label text-white dark:text-[#0c1420]">
                  الرسالة
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="mavex-textarea focus:border-yellow-600 focus:ring-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 py-3 rounded-xl text-base md:text-lg"
                  placeholder="اكتب رسالتك هنا..."
                />
              </div>

              {/* Desktop submit button (neon gold) */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="hidden md:block w-full btn-gold-gradient py-5 px-10 rounded-3xl font-extrabold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 motion-reduce:transition-none motion-reduce:transform-none"
              >
                {isSubmitting ? 'جاري الإرسال…' : 'إرسال الرسالة'}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="modern-card animate-in fade-in-50 slide-in-from-left-8 duration-500 bg-[#0c1420] dark:bg-white border border-[#0c1420] dark:border-gray-200 text-white dark:text-[#0c1420] transition-colors">
              <h2 className="text-3xl font-bold text-white dark:text-[#0c1420] mb-8 border-b-2 border-yellow-500 pb-4">
                معلومات التواصل
              </h2>

              <div className="space-y-8">
                <div className="flex items-start space-x-4 space-x-reverse group interactive-element">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 hover:bg-gray-50">
                    <Mail className="w-8 h-8 text-[#0c1420]" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white dark:text-[#0c1420] mb-2">
                      البريد الإلكتروني
                    </h3>
                    <p className="text-gray-300 dark:text-gray-700 text-lg">
                      <a
                        href="mailto:mavex33@gmail.com"
                        className="hover:underline hover:text-yellow-700"
                      >
                        mavex33@gmail.com
                      </a>
                    </p>
                    <p className="text-gray-400 dark:text-gray-500">
                      <a
                        href="mailto:mavex22@gmail.com"
                        className="hover:underline hover:text-yellow-700"
                      >
                        mavex22@gmail.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 space-x-reverse group interactive-element">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 hover:bg-gray-50">
                    <Phone className="w-8 h-8 text-[#0c1420]" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white dark:text-[#0c1420] mb-2">
                      الهاتف
                    </h3>
                    <p className="text-gray-300 dark:text-gray-700 text-lg">
                      <a
                        href="tel:01142411489"
                        className="hover:underline hover:text-yellow-700"
                      >
                        01142411489
                      </a>
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      <a
                        href="tel:01116881726"
                        className="hover:underline hover:text-yellow-700"
                      >
                        01116881726
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 space-x-reverse group interactive-element">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 hover:bg-gray-50">
                    <MapPin className="w-8 h-8 text-[#0c1420]" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white dark:text-[#0c1420] mb-2">
                      العنوان
                    </h3>
                    <p className="text-gray-300 dark:text-gray-700 text-lg">
                      <a
                        href="https://maps.google.com/?q=6%20October%20El%20Fardos%2C%20Giza%2C%20EG"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-yellow-700"
                      >
                        6 Octorber El frdos
                      </a>
                    </p>
                    <p className="text-gray-400 dark:text-gray-500">EG, Giza</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 space-x-reverse group interactive-element">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 hover:bg-gray-50">
                    <Clock className="w-8 h-8 text-[#0c1420]" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white dark:text-[#0c1420] mb-4">
                      ساعات العمل
                    </h3>
                    <ul className="space-y-2">
                      {workingHours.map((d, idx) => (
                        <li
                          key={idx}
                          className={
                            idx === todayIndex
                              ? 'text-white dark:text-[#0c1420] font-bold'
                              : 'text-gray-300 dark:text-gray-700'
                          }
                        >
                          <span className="inline-block w-24">{d.day}:</span>
                          <span>{d.hours}</span>
                          {idx === todayIndex && (
                            <span className="ml-2 text-yellow-600">
                              (اليوم)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="modern-card animate-in fade-in-50 zoom-in-95 duration-500 bg-[#0c1420] dark:bg-white border border-[#0c1420] dark:border-gray-200 text-white dark:text-[#0c1420] transition-colors">
              <h2 className="text-3xl font-bold text-white dark:text-[#0c1420] mb-8 border-b-2 border-yellow-500 pb-4">
                تابعنا
              </h2>

              <div className="grid grid-cols-3 gap-4">
                <a
                  href={SOCIAL_LINKS.facebook}
                  className="w-full h-16 bg-white hover:bg-gray-50 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 border border-gray-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] motion-reduce:transition-none motion-reduce:transform-none"
                  aria-label="فيسبوك"
                >
                  <Facebook className="w-7 h-7 text-[#1877F2]" aria-hidden />
                  <span className="sr-only">فيسبوك</span>
                </a>
                <a
                  href={SOCIAL_LINKS.instagram}
                  className="w-full h-16 bg-white hover:bg-gray-50 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 border border-gray-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 motion-reduce:transition-none motion-reduce:transform-none"
                  aria-label="إنستغرام"
                >
                  <Instagram className="w-7 h-7 text-[#E1306C]" aria-hidden />
                  <span className="sr-only">إنستغرام</span>
                </a>
                <a
                  href={SOCIAL_LINKS.twitter}
                  className="w-full h-16 bg-white hover:bg-gray-50 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 border border-gray-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DA1F2] motion-reduce:transition-none motion-reduce:transform-none"
                  aria-label="تويتر"
                >
                  <Twitter className="w-7 h-7 text-[#1DA1F2]" aria-hidden />
                  <span className="sr-only">تويتر</span>
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Sticky submit bar on mobile */}
        <div className="fixed inset-x-0 bottom-0 z-40 md:hidden p-3">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-white/40 dark:border-slate-800 shadow-lg">
              <div className="p-3">
                <button
                  type="submit"
                  form="contact-form"
                  disabled={isSubmitting}
                  className="w-full btn-gold-gradient py-4 px-8 font-extrabold tracking-wide transform active:scale-[0.99] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
                >
                  {isSubmitting ? 'جاري الإرسال…' : 'إرسال الرسالة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dark/Light mode toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed bottom-24 right-4 z-40 inline-flex items-center justify-center w-12 h-12 rounded-full border shadow-lg backdrop-blur hover:scale-105 transition-all ${
          theme === 'dark'
            ? 'bg-slate-900/80 text-white border-slate-800'
            : 'bg-white text-slate-700 border-slate-200'
        }`}
        aria-label={
          theme === 'dark' ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع الداكن'
        }
      >
        {theme === 'dark' ? (
          <Sun className="w-6 h-6 text-white" />
        ) : (
          <Moon className="w-6 h-6 text-slate-600" />
        )}
      </button>

      {/* Chatbot / Support FAB */}
      <a
        href="https://wa.me/01142411489"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 left-4 z-40 inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
        aria-label="تواصل عبر واتساب"
        title="تواصل عبر واتساب"
      >
        <MessageSquare className="w-6 h-6" />
      </a>
    </div>
  );
}
