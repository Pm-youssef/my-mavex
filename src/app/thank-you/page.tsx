'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trackPurchase } from '@/lib/analytics';

export default function ThankYouPage() {
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get order details from URL params, then fetch from API if possible
    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get('order');
    const totalAmount = urlParams.get('total');
    const paymentMethod = urlParams.get('payment');

    // Optimistic set from URL
    if (orderNumber && totalAmount) {
      setOrderDetails({ orderNumber, totalAmount: parseFloat(totalAmount), paymentMethod: paymentMethod || 'COD' });
    }

    // Try fetch from API for accurate, trusted details
    (async () => {
      try {
        if (orderNumber) {
          const res = await fetch(`/api/orders/${orderNumber}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            setOrderDetails((prev: any) => ({
              orderNumber: data?.id || prev?.orderNumber || orderNumber,
              totalAmount: typeof data?.totalAmount === 'number' ? data.totalAmount : (prev?.totalAmount ?? Number(totalAmount || 0)),
              paymentMethod: data?.paymentMethod || prev?.paymentMethod || paymentMethod || 'COD',
              status: data?.status,
              createdAt: data?.createdAt,
              shippingMethod: data?.shippingMethod,
            }));
          }
        }
      } catch {}
      setLoading(false);
    })();

    // Fire purchase analytics once
    try {
      const itemsJson = sessionStorage.getItem('last-order-items');
      const items = itemsJson ? JSON.parse(itemsJson) : [];
      if (orderNumber && totalAmount) {
        trackPurchase({
          transaction_id: orderNumber,
          value: parseFloat(totalAmount),
          items: Array.isArray(items)
            ? items.map((i: any) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, size: i.size }))
            : [],
        });
        // Clear once tracked
        sessionStorage.removeItem('last-order-items');
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-32 h-32 mx-auto mb-8 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-emerald-500">
            <svg
              className="w-16 h-16 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl md:text-5xl font-black tracking-widest uppercase text-black mb-6">
            شكراً <span className="text-yellow-600">لك!</span>
          </h1>

          <p className="text-xl md:text-2xl font-light tracking-wide text-gray-600 mb-12 max-w-2xl mx-auto">
            تم إتمام طلبك بنجاح! سنقوم بمعالجة طلبك وإرساله إليك في أقرب وقت
            ممكن.
          </p>

          {/* Order Details */}
          {loading ? (
            <div className="modern-card text-center py-12">جاري جلب تفاصيل الطلب...</div>
          ) : orderDetails ? (
            <div className="modern-card mb-12">
              <h2 className="text-2xl font-bold text-black mb-8 border-b-2 border-yellow-500 pb-4">
                تفاصيل الطلب
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-500">
                    <svg
                      className="w-8 h-8 text-yellow-800"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">
                    رقم الطلب
                  </h3>
                  <p className="text-2xl font-bold text-yellow-600">
                    {orderDetails.orderNumber}
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-500">
                    <svg
                      className="w-8 h-8 text-yellow-800"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">المجموع</h3>
                  <p className="text-2xl font-bold text-yellow-600">
                    {orderDetails.totalAmount.toFixed(2)} جنيه
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-500">
                    <svg
                      className="w-8 h-8 text-yellow-800"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">
                    طريقة الدفع
                  </h3>
                  <p className="text-lg font-bold text-yellow-600">
                    {orderDetails.paymentMethod === 'COD'
                      ? 'الدفع عند الاستلام'
                      : orderDetails.paymentMethod}
                  </p>
                </div>
              </div>

              {orderDetails?.status && (
                <div className="mt-6 text-center text-sm text-gray-600">
                  حالة الطلب: <span className="font-bold">{orderDetails.status}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="modern-card text-center py-12 text-gray-600">لم يتم العثور على تفاصيل طلب. تأكد من رقم الطلب.</div>
          )}

          {/* Next Steps */}
          <div className="modern-card mb-12">
            <h2 className="text-2xl font-bold text-black mb-8 border-b-2 border-yellow-500 pb-4">
              الخطوات التالية
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center group interactive-element">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-500 group-hover:bg-blue-500 transition-all duration-300">
                  <svg
                    className="w-8 h-8 text-blue-800 group-hover:text-white transition-colors duration-300"
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
                <h3 className="text-lg font-bold text-black mb-2">
                  تأكيد الطلب
                </h3>
                <p className="text-gray-600">
                  سنرسل لك تأكيداً بالبريد الإلكتروني
                </p>
              </div>

              <div className="text-center group interactive-element">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500 group-hover:bg-green-500 transition-all duration-300">
                  <svg
                    className="w-8 h-8 text-green-800 group-hover:text-white transition-colors duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-black mb-2">
                  معالجة الطلب
                </h3>
                <p className="text-gray-600">سنقوم بتحضير طلبك بعناية</p>
              </div>

              <div className="text-center group interactive-element">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-purple-500 group-hover:bg-purple-500 transition-all duration-300">
                  <svg
                    className="w-8 h-8 text-purple-800 group-hover:text-white transition-colors duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-black mb-2">التوصيل</h3>
                <p className="text-gray-600">سنرسل لك تحديثات التوصيل</p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="modern-card mb-12">
            <h2 className="text-2xl font-bold text-black mb-8 border-b-2 border-yellow-500 pb-4">
              هل لديك أسئلة؟
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-500">
                  <svg
                    className="w-8 h-8 text-yellow-800"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-black mb-2">
                  البريد الإلكتروني
                </h3>
                <p className="text-gray-600">mavex33@gmail
                  .com</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-500">
                  <svg
                    className="w-8 h-8 text-yellow-800"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-black mb-2">الهاتف</h3>
                <p className="text-gray-600">01142411489</p>
                <p className="text-gray-600">01116881726</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 mb-16 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-stretch sm:items-center px-2">
            <Link
              href="/"
              className="w-full sm:w-auto min-w-[220px] text-center btn-brand-dark py-4 px-8 rounded-2xl font-extrabold"
              aria-label="العودة للرئيسية"
            >
              العودة للرئيسية
            </Link>

            <Link
              href="/products"
              className="w-full sm:w-auto min-w-[220px] text-center btn-gold-gradient py-4 px-8 rounded-2xl font-extrabold"
              aria-label="تسوق المزيد"
            >
              تسوق المزيد
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
