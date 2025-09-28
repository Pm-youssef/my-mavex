'use client';

import { useEffect, useRef, useState } from 'react';

// Simple in-view observer (fires once)
function useInViewOnce(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || inView) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.3, ...options });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options, inView]);
  return { ref, inView } as const;
}

// Counter animation for stats
function Counter({ to, duration = 1200, suffix = '+' }: { to: number; duration?: number; suffix?: string }) {
  const { ref, inView } = useInViewOnce();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const animate = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref as any} className="tabular-nums">
      {val}
      {suffix}
    </span>
  );
}

export default function HomeStats() {
  return (
    <section className="bg-gray-900 text-white py-16">
      <div className="w-full max-w-[140rem] 2xl:max-w-none mx-auto px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="group cursor-pointer">
            <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none">
              <div className="inline-block origin-center transform-gpu will-change-transform transition-transform ease-\[cubic-bezier(.22,1,.36,1)\] group-hover:scale-105" style={{ transitionDuration: '300ms' }}>
                <div className="text-3xl font-bold text-white mb-2 group-hover:text-yellow-500 transition-colors duration-500">
                  <Counter to={500} />
                </div>
                <div className="text-gray-300 font-medium uppercase tracking-wide text-sm">
                  عميل راضي
                </div>
              </div>
            </div>
          </div>
          <div className="group cursor-pointer">
            <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '100ms' }}>
              <div className="inline-block origin-center transform-gpu will-change-transform transition-transform ease-\[cubic-bezier(.22,1,.36,1)\] group-hover:scale-105" style={{ transitionDuration: '300ms' }}>
                <div className="text-3xl font-bold text-white mb-2 group-hover:text-yellow-500 transition-colors duration-500">
                  <Counter to={1000} />
                </div>
                <div className="text-gray-300 font-medium uppercase tracking-wide text-sm">
                  طلب مكتمل
                </div>
              </div>
            </div>
          </div>
          <div className="group cursor-pointer">
            <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '200ms' }}>
              <div className="inline-block origin-center transform-gpu will-change-transform transition-transform ease-\[cubic-bezier(.22,1,.36,1)\] group-hover:scale-105" style={{ transitionDuration: '300ms' }}>
                <div className="text-3xl font-bold text-white mb-2 group-hover:text-yellow-500 transition-colors duration-500">
                  <Counter to={50} />
                </div>
                <div className="text-gray-300 font-medium uppercase tracking-wide text-sm">
                  تصميم فريد
                </div>
              </div>
            </div>
          </div>
          <div className="group cursor-pointer">
            <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: '300ms' }}>
              <div className="inline-block origin-center transform-gpu will-change-transform transition-transform ease-\[cubic-bezier(.22,1,.36,1)\] group-hover:scale-105" style={{ transitionDuration: '300ms' }}>
                <div className="text-3xl font-bold text-white mb-2 group-hover:text-yellow-500 transition-colors duration-500">
                  24/7
                </div>
                <div className="text-gray-300 font-medium uppercase tracking-wide text-sm">
                  دعم العملاء
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
