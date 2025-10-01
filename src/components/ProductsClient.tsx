'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type UiProduct = {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  imageUrl: string;
  thumbnailUrl?: string | null;
  hoverImageUrl?: string | null;
  stock: number;
  variants?: Array<{ id: string; size: string; stock: number; minDisplayStock?: number }>;
  categorySlug?: string | null;
  categoryName?: string | null;
};

interface Props {
  products: UiProduct[];
  categories?: Array<{ name: string; slug: string }>;
}

export default function ProductsClient({ products, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [filteredProducts, setFilteredProducts] = useState<UiProduct[]>(products);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high' | 'stock'>('price-high');
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [userAdjustedPrice, setUserAdjustedPrice] = useState(false);
  const lastMaxRef = useRef<number>(0);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Currency formatter (Arabic-EG)
  const arFormatter = useMemo(() => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }), []);
  const formatAr = (n: number) => arFormatter.format(Math.max(0, Math.round(n)));

  // Category name lookup for active filter chip
  const categoryNameMap = useMemo(() => {
    const entries: Array<[string, string]> = [];
    const catList = Array.isArray(categories) ? categories : [];
    if (catList.length) {
      for (const c of catList) entries.push([c.slug, c.name]);
    } else {
      // fallback from products
      const prodList = Array.isArray(products) ? products : [];
      for (const p of prodList) {
        if (p.categorySlug && p.categoryName) entries.push([p.categorySlug, p.categoryName]);
      }
    }
    return new Map(entries);
  }, [categories, products]);
  const selectedCategoryName = selectedCategory ? (categoryNameMap.get(selectedCategory) || selectedCategory) : '';

  const normalized = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return list.map(p => ({
      ...p,
      originalPrice: Number(p.originalPrice ?? (p as any).price ?? 0) || 0,
      discountedPrice: Number(p.discountedPrice ?? p.originalPrice ?? (p as any).price ?? 0) || 0,
      stock: Number(p.stock ?? 0) || 0,
    }));
  }, [products]);

  // Effective price helper
  const effectivePrice = (p: UiProduct) =>
    typeof p.discountedPrice === 'number' && p.discountedPrice < p.originalPrice
      ? p.discountedPrice
      : p.originalPrice;

  // Compute global min/max price from dataset
  const [globalMinPrice, globalMaxPrice] = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return [0, 1000000];
    const prices = normalized
      .map((p) => effectivePrice(p))
      .filter((n) => Number.isFinite(n)) as number[];
    if (prices.length === 0) return [0, 1000000];
    const positives = prices.filter((n) => n > 0);
    const useForMin = positives.length > 0 ? positives : prices;
    const min = Math.min(...useForMin);
    const max = Math.max(...prices);
    const safeMin = Math.max(0, Math.floor(min));
    const safeMax = Math.max(safeMin, Math.ceil(max));
    return [safeMin, safeMax];
  }, [products, normalized]);

  // UI baseline: start from 0 to show all products by default
  const uiMinPrice = 0;

  // Initialize state from URL (once) and dataset bounds
  useEffect(() => {
    const q = searchParams;
    const qSearch = (q.get('q') || '').trim();
    const qMin = Number(q.get('min'));
    const qMax = Number(q.get('max'));
    const qSort = (q.get('sort') || 'name') as typeof sortBy;
    const qStock = q.get('inStock') === '1';
    const qCategory = (q.get('category') || '').trim();
    const qPage = Math.max(1, Number(q.get('page') || '1')) || 1;
    const qPageSize = Math.max(6, Number(q.get('pageSize') || '12')) || 12;

    setSearchTerm(qSearch);
    // clamp and normalize (ensure min <= max)
    const minClamped = Number.isFinite(qMin) ? Math.max(uiMinPrice, qMin) : uiMinPrice;
    const maxClamped = Number.isFinite(qMax) ? Math.min(globalMaxPrice, qMax) : globalMaxPrice;
    const [minInit, maxInit] = minClamped <= maxClamped
      ? [minClamped, maxClamped]
      : [maxClamped, minClamped];
    setPriceRange({ min: minInit, max: maxInit });
    setUserAdjustedPrice(Boolean(q.get('min') || q.get('max')));
    setSelectedCategory(qCategory);
    setSortBy(['name', 'price-low', 'price-high', 'stock'].includes(qSort) ? qSort : 'price-high');
    setShowInStockOnly(qStock);
    setPage(qPage);
    setPageSize(qPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If dataset's max price increases and the user didn't adjust price manually, expand default to include it
  useEffect(() => {
    if (!userAdjustedPrice) {
      setPriceRange((prev) => {
        const nextMin = Math.max(uiMinPrice, prev.min);
        const nextMax = Math.max(prev.max, globalMaxPrice);
        return { min: nextMin, max: nextMax };
      });
    }
    lastMaxRef.current = globalMaxPrice;
  }, [globalMaxPrice, userAdjustedPrice, uiMinPrice]);

  // Keep URL in sync with filters (debounce search)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (searchTerm) params.set('q', searchTerm); else params.delete('q');
      params.set('min', String(priceRange.min));
      params.set('max', String(priceRange.max));
      params.set('sort', sortBy);
      if (showInStockOnly) params.set('inStock', '1'); else params.delete('inStock');
      if (selectedCategory) params.set('category', selectedCategory); else params.delete('category');
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchTerm, priceRange, sortBy, showInStockOnly, selectedCategory, page, pageSize, router, pathname, searchParams]);

  // Reset to first page on filter changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, priceRange, sortBy, showInStockOnly, selectedCategory]);

  useEffect(() => {
    let filtered = normalized.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const price = effectivePrice(product);
      const matchesPrice = price >= priceRange.min && price <= priceRange.max;
      const matchesStock = !showInStockOnly || product.stock > 0;
      const matchesCategory = !selectedCategory || (product.categorySlug || '') === selectedCategory;
      return matchesSearch && matchesPrice && matchesStock && matchesCategory;
    });

    filtered.sort((a, b) => {
      const priceA =
        typeof a.discountedPrice === 'number' && a.discountedPrice < a.originalPrice
          ? a.discountedPrice
          : a.originalPrice;
      const priceB =
        typeof b.discountedPrice === 'number' && b.discountedPrice < b.originalPrice
          ? b.discountedPrice
          : b.originalPrice;
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return priceA - priceB;
        case 'price-high':
          return priceB - priceA;
        case 'stock':
          return b.stock - a.stock;
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  }, [normalized, searchTerm, priceRange, sortBy, showInStockOnly, selectedCategory]);

  const clearFilters = () => {
    setSearchTerm('');
    setPriceRange({ min: uiMinPrice, max: globalMaxPrice });
    setSortBy('price-high');
    setShowInStockOnly(false);
    setUserAdjustedPrice(false);
    setSelectedCategory('');
  };

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = filteredProducts.slice(startIdx, startIdx + pageSize);

  // Slider track styling helpers for price range
  const denom = Math.max(1, globalMaxPrice - uiMinPrice);
  const minPct = Math.max(0, Math.min(100, Math.round(((priceRange.min - uiMinPrice) / denom) * 100)));
  const maxPct = Math.max(0, Math.min(100, Math.round(((priceRange.max - uiMinPrice) / denom) * 100)));
  const sliderTrackStyle: React.CSSProperties = {
    background: `linear-gradient(to right, #E5E7EB ${minPct}%, #eab308 ${minPct}%, #eab308 ${maxPct}%, #E5E7EB ${maxPct}%)`,
  };

  // Animated segmented highlight
  const segWrapRef = useRef<HTMLDivElement | null>(null);
  const segBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [segHL, setSegHL] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  useEffect(() => {
    const update = () => {
      const wrap = segWrapRef.current;
      const btn = segBtnRefs.current[sortBy];
      if (!wrap || !btn) return;
      const wb = wrap.getBoundingClientRect();
      const bb = btn.getBoundingClientRect();
      setSegHL({ left: bb.left - wb.left, width: bb.width });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [sortBy]);

  return (
    <div className="w-full max-w-[140rem] 2xl:max-w-none mx-auto px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-6">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black tracking-widest uppercase text-black mb-6">
          جميع <span className="text-yellow-600">المنتجات</span>
        </h1>
        <p className="text-xl md:text-2xl font-light tracking-wide text-gray-600 max-w-3xl mx-auto">
          اكتشف مجموعتنا الكاملة من التيشيرتات المميزة
        </p>
      </div>

      {/* Search and Filters - modern design */}
      <div className="modern-filter rounded-2xl shadow-md border border-[#0c1420]/10 bg-white/80 backdrop-blur-sm p-5 md:p-6 mb-12 sticky top-24 z-10">
        <div className="flex flex-col xl:flex-row gap-6 xl:items-center xl:justify-between">
          {/* Search */}
          <div className="w-full lg:max-w-sm">
            <label className="block text-xs font-bold mb-2 text-gray-500">البحث</label>
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-5 py-3.5 rounded-full border border-gray-200 focus:outline-none focus:ring-4 focus:ring-[#0c1420]/20 focus:border-[#0c1420] placeholder:text-gray-400"
              />
              <Search className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-3 py-1"
                  aria-label="مسح البحث"
                >
                  ×
                </button>
              ) : null}
            </div>

          {/* Category chips */}
          <div className="w-full xl:flex-1">
            <div className="flex flex-wrap gap-2 items-center">
              {(categories && categories.length > 0
                ? categories
                : Array.from(new Map(normalized
                    .map(p => [p.categorySlug || '', { slug: p.categorySlug || '', name: p.categoryName || '' }])
                  ).values())
              )
                .filter(c => c.slug && c.name)
                .slice(0, 12)
                .map(c => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setSelectedCategory(prev => prev === c.slug ? '' : c.slug)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedCategory === c.slug ? 'bg-[#0c1420] text-white border-[#0c1420]' : 'bg-white/70 text-[#0c1420] border-gray-200 hover:border-[#0c1420]/40'}`}
                    aria-pressed={selectedCategory === c.slug}
                    title={c.name}
                  >{c.name}</button>
                ))}
            </div>
          </div>
          </div>

          {/* Sort segmented */}
          <div className="w-full lg:w-auto order-2 xl:order-none">
            <label className="block text-xs font-bold mb-2 text-gray-500">ترتيب حسب</label>
            <div ref={segWrapRef} className="segmented-wrap relative inline-flex rounded-full bg-gray-100 p-1 border border-gray-200 overflow-hidden">
              <span
                className="absolute top-1 bottom-1 rounded-full bg-[#0c1420] transition-all ease-out"
                style={{ left: segHL.left, width: segHL.width, transitionDuration: '240ms' }}
              />
              {([
                { key: 'name', label: 'الاسم' },
                { key: 'price-low', label: 'السعر ↑' },
                { key: 'price-high', label: 'السعر ↓' },
                { key: 'stock', label: 'المخزون' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  ref={(el) => { segBtnRefs.current[opt.key] = el; }}
                  onClick={() => setSortBy(opt.key as any)}
                  className={`segmented-btn relative px-4 py-2 rounded-full text-sm font-bold transition-all ${sortBy === opt.key ? 'text-white' : 'text-gray-700 hover:text-[#0c1420]'}`}
                  aria-pressed={sortBy === opt.key}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range with dual slider */}
          <div className="w-full lg:flex-1 order-3 xl:order-none">
            <div className="mb-2">
              <span className="block text-xs font-bold text-gray-500">نطاق السعر</span>
            </div>
            <div className="w-full">
              {/* Slider track */}
              <div className="relative h-8 flex items-center" dir="ltr">
                {/* Custom track (behind inputs) */}
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: '50%', transform: 'translateY(-50%)', height: 6, borderRadius: 9999, background: '#E5E7EB' }}
                  aria-hidden
                />
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${minPct}%`,
                    width: `${Math.max(0, maxPct - minPct)}%`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: 6,
                    borderRadius: 9999,
                    background: '#eab308',
                  }}
                  aria-hidden
                />
                <input
                  type="range"
                  min={uiMinPrice}
                  max={globalMaxPrice}
                  step={1}
                  value={priceRange.min}
                  onChange={(e) => {
                    const val = Math.min(Number(e.target.value), priceRange.max);
                    setPriceRange(prev => ({ ...prev, min: Math.max(uiMinPrice, val) }));
                    setUserAdjustedPrice(true);
                  }}
                  onMouseDown={() => setActiveThumb('min')}
                  onTouchStart={() => setActiveThumb('min')}
                  onMouseUp={() => setActiveThumb(null)}
                  onTouchEnd={() => setActiveThumb(null)}
                  onBlur={() => setActiveThumb(null)}
                  data-active={activeThumb === 'min'}
                  className={`absolute left-0 right-0 appearance-none w-full bg-transparent h-2 rounded-full outline-none z-40`}
                  style={{ top: '50%', transform: 'translateY(-50%)', background: 'transparent' }}
                />
                <input
                  type="range"
                  min={uiMinPrice}
                  max={globalMaxPrice}
                  step={1}
                  value={priceRange.max}
                  onChange={(e) => {
                    const val = Math.max(Number(e.target.value), priceRange.min);
                    setPriceRange(prev => ({ ...prev, max: Math.min(globalMaxPrice, val) }));
                    setUserAdjustedPrice(true);
                  }}
                  onMouseDown={() => setActiveThumb('max')}
                  onTouchStart={() => setActiveThumb('max')}
                  onMouseUp={() => setActiveThumb(null)}
                  onTouchEnd={() => setActiveThumb(null)}
                  onBlur={() => setActiveThumb(null)}
                  data-active={activeThumb === 'max'}
                  className={`absolute left-0 right-0 appearance-none w-full bg-transparent h-2 rounded-full outline-none z-30`}
                  style={{ top: '50%', transform: 'translateY(-50%)', background: 'transparent' }}
                />
                {/* No inline labels for a cleaner look */}
              </div>
              {/* Micro range label under slider */}
              <div className="mt-1 text-[11px] text-gray-400 text-right">{formatAr(0)} — أقصى السعر {formatAr(globalMaxPrice)}</div>
              {/* Numeric pills */}
              <div className="mt-2 flex items-center gap-2" dir="ltr">
                <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2">
                  <span className="text-xs text-gray-500">من</span>
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const n = raw === '' ? NaN : Number(raw);
                      let nextMin = Number.isFinite(n) ? Math.max(uiMinPrice, Math.floor(n)) : uiMinPrice;
                      nextMin = Math.max(uiMinPrice, Math.min(nextMin, priceRange.max));
                      setPriceRange(prev => ({ ...prev, min: nextMin }));
                      setUserAdjustedPrice(true);
                    }}
                    className="w-20 text-sm bg-transparent focus:outline-none"
                  />
                  <span className="text-[11px] text-gray-400">جنيه</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2">
                  <span className="text-xs text-gray-500">إلى</span>
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const n = raw === '' ? NaN : Number(raw);
                      let nextMax = Number.isFinite(n) ? Math.max(0, Math.ceil(n)) : globalMaxPrice;
                      nextMax = Math.min(globalMaxPrice, Math.max(nextMax, priceRange.min));
                      setPriceRange(prev => ({ ...prev, max: nextMax }));
                      setUserAdjustedPrice(true);
                    }}
                    className="w-20 text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* In stock toggle */}
          <div className="w-full lg:w-auto order-1 xl:order-none">
            <label className="block text-xs font-bold mb-2 text-gray-500">التوفر</label>
            <button
              type="button"
              onClick={() => setShowInStockOnly(v => !v)}
              className={`relative inline-flex items-center w-20 h-10 rounded-full transition-colors px-1 ${showInStockOnly ? 'bg-[#0c1420]' : 'bg-gray-200'}`}
              aria-pressed={showInStockOnly}
              aria-label={showInStockOnly ? 'عرض المتوفر فقط' : 'عرض الكل'}
            >
              <span className={`inline-block w-8 h-8 bg-white rounded-full shadow transform transition-transform ${showInStockOnly ? 'translate-x-10' : 'translate-x-0'} ring-0`} />
              <span className="absolute left-3 text-xs font-bold text-white pointer-events-none">{showInStockOnly ? 'متوفر' : ''}</span>
              {!showInStockOnly && <span className="absolute right-3 text-xs font-bold text-gray-600 pointer-events-none">الكل</span>}
            </button>
          </div>
        </div>

        {/* Active filters and clear */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button onClick={clearFilters} className="text-sm font-bold text-[#0c1420] hover:underline" aria-label="مسح الفلاتر">
            <span className="ml-1">×</span> مسح الفلاتر
          </button>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs text-gray-600">المدى: {formatAr(priceRange.min)} - {formatAr(priceRange.max)} جنيه</span>
          {selectedCategory && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 rounded-full px-2.5 py-1 animate-[fadeUp_.25s_ease-out_both]">
              قسم: {selectedCategoryName}
              <button
                type="button"
                className="ml-1 rounded-full w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-800"
                aria-label="إزالة قسم"
                onClick={() => setSelectedCategory('')}
              >
                ×
              </button>
            </span>
          )}
          {showInStockOnly && (
            <span className="text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1">متوفر فقط</span>
          )}
          {searchTerm && (
            <span className="text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 rounded-full px-2.5 py-1">بحث: “{searchTerm}”</span>
          )}
        </div>
      </div>

      {/* Slider & Filters styling (scoped) */}
      <style jsx>{`
        .modern-filter { animation: fadeUp 320ms ease-out both; }
        .segmented-btn { transform: translateZ(0); }
        .segmented-btn[aria-pressed='true'] { transform: translateY(-1px); }
        .segmented-btn:active { transform: translateY(0); }
        .modern-filter :global(.segmented-btn) { transition: transform .15s ease, background-color .2s ease, color .2s ease; }
        .segmented-wrap button { position: relative; z-index: 1; }
        .segmented-wrap span { z-index: 0; }
        /* Toggle focus ring */
        .modern-filter button:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(12,20,32,0.18); border-radius: 9999px; }
        /* Numeric pills hover */
        .modern-filter input[type='number'] { transition: box-shadow .15s ease, border-color .15s ease; }
        .modern-filter input[type='number']:focus { box-shadow: 0 0 0 3px rgba(12,20,32,0.15); }
        /* Slider track */
        .modern-filter input[type='range']::-webkit-slider-runnable-track { height: 6px; border-radius: 9999px; }
        .modern-filter input[type='range']::-moz-range-track { height: 6px; border-radius: 9999px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        /* Base reset */
        input[type='range'] { -webkit-appearance: none; appearance: none; background: transparent; }
        /* WebKit */
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          height: 14px; width: 14px; border-radius: 9999px; background: #ffffff;
          border: 2px solid rgba(12,20,32,0.85); box-shadow: 0 0 0 3px rgba(255,255,255,1); cursor: pointer;
          transition: box-shadow 0.2s ease, transform 0.15s ease;
          margin-top: -4px; /* center thumb on 6px track */
        }
        input[type='range']::-webkit-slider-thumb:hover { transform: scale(1.05); }
        input[type='range']:focus::-webkit-slider-thumb { box-shadow: 0 0 0 3px rgba(234,179,8,0.35); }
        input[type='range'][data-active='true']::-webkit-slider-thumb { transform: scale(1.08); }
        /* Firefox */
        input[type='range']::-moz-range-thumb {
          height: 14px; width: 14px; border-radius: 9999px; background: #ffffff;
          border: 2px solid rgba(12,20,32,0.85); box-shadow: 0 0 0 3px rgba(255,255,255,1); cursor: pointer;
          transition: box-shadow 0.2s ease, transform 0.15s ease;
        }
        input[type='range']::-moz-range-progress { background-color: #eab308; height: 6px; }
        input[type='range']::-moz-range-track { background-color: #E5E7EB; height: 6px; border: none; }
        input[type='range']::-moz-range-thumb:hover { transform: scale(1.05); }
        input[type='range']:focus::-moz-range-thumb { box-shadow: 0 0 0 3px rgba(234,179,8,0.35); }
        input[type='range'][data-active='true']::-moz-range-thumb { transform: scale(1.08); }
      `}</style>

      {/* Results Count */}
      <div className="mb-8 text-center">
        <p className="text-gray-600 text-lg">
          تم العثور على{' '}
          <span className="font-bold text-yellow-600">{formatAr(filteredProducts.length)}</span>{' '}
          منتج
        </p>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-32 h-32 mx-auto mb-8 text-gray-300">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-gray-600 text-xl font-medium mb-4">لا توجد منتجات تطابق البحث</p>
          <p className="text-gray-500">جرب تغيير معايير البحث</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5 mb-10">
            {pageItems.map((product) => (
              <ProductCard key={product.id} product={product as any} />
            ))}
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mb-16">
            <button
              className="px-4 py-2 rounded-xl border text-sm font-bold disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="السابق"
            >السابق</button>
            <span className="px-3 py-2 text-sm text-gray-600">صفحة {currentPage} من {totalPages}</span>
            <button
              className="px-4 py-2 rounded-xl border text-sm font-bold disabled:opacity-50"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="التالي"
            >التالي</button>
          </div>
        </>
      )}

      {/* Back to Home Button */}
      <div className="text-center">
        <a href="/" className="inline-block bg-black text-white py-4 px-8 rounded-2xl font-bold transition-all duration-300 hover:bg-yellow-500 hover:text-black border-2 border-black hover:border-yellow-500 transform hover:scale-105 shadow-lg hover:shadow-2xl">
          العودة للرئيسية
        </a>
      </div>
    </div>
  );
}
