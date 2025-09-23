'use client';

import { useEffect, useRef, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  imageUrl: string;
  thumbnailUrl?: string | null;
  hoverImageUrl?: string | null;
  image2Url?: string | null;
  image3Url?: string | null;
  stock: number;
}

interface RecommendedProductsProps {
  currentProductId?: string;
  title?: string;
}

export default function RecommendedProducts({ currentProductId, title = 'منتجات قد تعجبك' }: RecommendedProductsProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOverflow, setHasOverflow] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const qs = new URLSearchParams();
        qs.set('limit', '3');
        if (currentProductId) qs.set('exclude', currentProductId);
        const res = await fetch(`/api/products?${qs.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const arr = await res.json();
        setItems(Array.isArray(arr) ? arr : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentProductId]);

  if (!loading && items.length === 0) return null;

  const scrollByAmount = (direction: 'prev' | 'next') => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-reco-card]');
    const delta = (card?.offsetWidth || 320) + 24; // width + gap
    el.scrollBy({ left: direction === 'next' ? delta : -delta, behavior: 'smooth' });
  };

  return (
    <section className="mt-24 md:mt-28">
      <div className="flex items-center justify-between mb-6">
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-extrabold text-[#0c1420] ml-1">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-yellow-100 text-yellow-700">
            <Sparkles className="w-5 h-5" />
          </span>
          <span>{title}</span>
        </h2>

        {!loading && (
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label="السابق"
              onClick={() => scrollByAmount('prev')}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="التالي"
              onClick={() => scrollByAmount('next')}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      {/* Center divider header for desktop */}
      <div className="hidden md:flex items-center gap-6 mb-8">
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-200 to-gray-300" />
        <div className="text-[#0c1420] font-extrabold tracking-tight ml-1">توصيات</div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-gray-300" />
      </div>

      {/* Wrapper: horizontal scroller on small screens, 3-column grid on large */}
      <div className="relative">
        {loading ? (
          <div
            ref={scrollerRef}
            dir="rtl"
            className="flex lg:grid lg:grid-cols-3 gap-6 lg:gap-8 overflow-x-auto lg:overflow-visible snap-x snap-mandatory scrollbar-hide"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                data-reco-card
                className="shrink-0 lg:shrink w-[18rem] sm:w-[20rem] lg:w-auto bg-white rounded-2xl border border-gray-200 shadow-sm h-[24rem] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div
            ref={scrollerRef}
            dir="rtl"
            className="flex lg:grid lg:grid-cols-3 gap-6 overflow-x-auto lg:overflow-visible snap-x snap-mandatory scrollbar-hide"
            onScroll={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              const overflow = el.scrollWidth > el.clientWidth + 1;
              if (overflow !== hasOverflow) setHasOverflow(overflow);
            }}
          >
            {items.slice(0, 3).map((p) => (
              <div
                key={p.id}
                data-reco-card
                className="shrink-0 lg:shrink w-[18rem] sm:w-[20rem] lg:w-auto snap-center"
              >
                <ProductCard product={p as any} variant="compact" />
              </div>
            ))}
          </div>
        )}

        {/* Edge fade hints (mobile only) */}
        {!loading && hasOverflow && (
          <>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent rounded-r-2xl lg:hidden" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent rounded-l-2xl lg:hidden" />
          </>
        )}
      </div>
    </section>
  );
}
