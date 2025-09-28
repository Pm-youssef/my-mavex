'use client';

import { useEffect, useState, type MouseEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import QuickView from './QuickView';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { Heart, Eye, Star } from 'lucide-react';
import { DEFAULT_SIZES, FAVORITES_STORAGE_KEY } from '@/lib/constants';
import { useCart } from '@/hooks/useCart';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { trackFavoriteAdded, trackFavoriteRemoved } from '@/lib/analytics';
import { toastWarning } from '@/components/ui/Toast';

interface Product {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  imageUrl: string;
  thumbnailUrl?: string | null;
  hoverImageUrl?: string | null; // صورة تظهر عند hover
  stock: number;
  variants?: Array<{
    id: string;
    size: string;
    stock: number;
  }>;
  rating?: number;
  reviewsCount?: number;
  colors?: string[];
}

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact';
  priority?: boolean;
  hideActions?: boolean; // hide wishlist and quick view actions (e.g., in Favorites page)
}

export default function ProductCard({
  product,
  variant = 'default',
  priority = false,
  hideActions = false,
}: ProductCardProps) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hoveredSize, setHoveredSize] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const isCompact = variant === 'compact';
  const { addToCart } = useCart();
  const router = useRouter();
  const { isAuthenticated } = useSession();

  // Initialize favorite state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setIsFavorite(Array.isArray(ids) && ids.includes(product.id));
    } catch {}
  }, [product.id]);

  const toggleFavorite = async (e?: MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    let ids: string[] = [];
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]';
      const parsed = JSON.parse(raw);
      ids = Array.isArray(parsed) ? parsed : [];
    } catch {}
    const exists = ids.includes(product.id);
    const next = exists
      ? ids.filter(id => id !== product.id)
      : [...ids, product.id];
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
    setIsFavorite(!exists);
    // server sync if logged in
    if (isAuthenticated) {
      try {
        if (exists) {
          await fetch('/api/wishlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id }) });
        } else {
          await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id }) });
        }
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('favoritesUpdated'));
    }
    try {
      if (exists) {
        trackFavoriteRemoved({ id: product.id, name: product.name });
      } else {
        trackFavoriteAdded({ id: product.id, name: product.name });
      }
    } catch {}
  };

  const sizes =
    product?.variants && product.variants.length > 0
      ? product.variants.map(v => v.size)
      : Array.from(DEFAULT_SIZES);

  const isSizeAvailable = (size: string) => {
    if (product?.variants && product.variants.length > 0) {
      const v = product.variants.find(vv => vv.size === size);
      return (v?.stock || 0) > 0;
    }
    return (product?.stock || 0) > 0;
  };

  const currentPrice =
    product.discountedPrice < product.originalPrice
      ? product.discountedPrice
      : product.originalPrice;
  const hasDiscount = product.discountedPrice < product.originalPrice;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.originalPrice - currentPrice) / product.originalPrice) * 100
      )
    : 0;

  // Rating helpers
  const ratingValue = Math.max(0, Math.min(5, Math.round(product.rating ?? 0)));
  const reviewsCount = product.reviewsCount ?? 0;

  // Keyboard navigation for sizes (radiogroup behavior)
  const handleSizeKeyDown = (e: KeyboardEvent<HTMLButtonElement>, size: string) => {
    const idx = sizes.findIndex(s => s === size);
    if (idx === -1) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = sizes[(idx + 1) % sizes.length];
      const available = isSizeAvailable(next);
      if (available) setSelectedSize(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = sizes[(idx - 1 + sizes.length) % sizes.length];
      const available = isSizeAvailable(prev);
      if (available) setSelectedSize(prev);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const available = isSizeAvailable(size);
      if (available) setSelectedSize(size);
    }
  };

  return (
    <>
      <div
        className={`group relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-yellow-100 focus-within:ring-2 focus-within:ring-yellow-500/50 w-full mx-auto ${
          isCompact ? 'min-h-[33.6rem]' : 'min-h-[38.4rem]'
        }`}
      >
        {/* Image area */}
        <Link
          href={`/product/${product.id}`}
          className={`relative block overflow-hidden ${
            isCompact ? 'h-[35.2rem]' : 'h-[35.2rem]'
          } bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950`}
        >
          {/* Image skeleton while loading */}
          <div
            className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-500 ${
              imgLoaded ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="h-full w-full animate-pulse bg-gradient-to-b from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" />
          </div>
          {/* Zoom wrapper to scale image on hover (premium smooth) */}
          <div className="absolute inset-0 origin-center will-change-transform transform-gpu scale-100 transition-transform duration-500 ease-\[cubic-bezier(.22,1,.36,1)\] hover:scale-110 group-hover:scale-110">
            {/* Base image */}
            <ImageWithFallback
              src={product.thumbnailUrl || product.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              className={`object-cover w-full h-full`}
              priority={priority}
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
              onLoad={() => setImgLoaded(true)}
            />
            {/* Hover image overlay (flip/replace) */}
            {product.hoverImageUrl && (
              <ImageWithFallback
                src={product.hoverImageUrl}
                alt={`${product.name} hover`}
                fill
                sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                className="object-cover w-full h-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-\[cubic-bezier(.22,1,.36,1)\]"
                priority={false}
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
                onLoad={() => setImgLoaded(true)}
              />
            )}
          </div>

          {/* Discount/New badge (more prominent, Arabic) */}
          <div className="absolute top-4 left-4">
            <div
              className={`px-3 py-1 rounded-full text-xs md:text-sm font-extrabold border shadow-sm transition-all duration-300 ${
                hasDiscount
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : 'bg-white/90 text-[#0c1420] border-white/60'
              } ${
                hasDiscount
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
              }`}
            >
              {hasDiscount && discountPercent > 0 ? `خصم ${discountPercent}%` : 'جديد'}
            </div>
          </div>

          {/* Wishlist + Quick View (on hover) */}
          {!hideActions && (
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
              <button
                aria-label={isFavorite ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
                onClick={toggleFavorite}
                className={`p-2 rounded-full bg-white/90 dark:bg-gray-800/90 shadow hover:scale-105 transition-transform ${
                  isFavorite
                    ? 'text-rose-600'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${isFavorite ? 'fill-rose-600' : ''}`}
                />
              </button>
              <button
                aria-label="عرض سريع"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsQuickViewOpen(true);
                }}
                className="p-2 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 shadow hover:scale-105 transition-transform"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Out of stock badge */}
          {product.stock === 0 && (
            <div className="absolute bottom-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
              نفذ المخزون
            </div>
          )}

          {/* Low stock badge */}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="absolute bottom-4 left-4 bg-amber-500 text-[#0c1420] px-3 py-1 rounded-full text-xs font-extrabold shadow">
              كميّة محدودة
            </div>
          )}

          {/* Sizes row at bottom (on hover only) */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
              <div
                className="pointer-events-auto mx-auto w-max flex flex-wrap items-center gap-1 rounded-full bg-[#0c1420]/80 border border-white/20 px-2 py-1 shadow-sm backdrop-blur-sm"
                role="radiogroup"
                aria-label="اختر المقاس"
              >
                {sizes.map(size => {
                  const available = isSizeAvailable(size);
                  return (
                    <button
                      key={size}
                      onMouseEnter={() => setHoveredSize(size)}
                      onMouseLeave={() =>
                        setHoveredSize(s => (s === size ? null : s))
                      }
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (available) setSelectedSize(size);
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 ${
                        available
                          ? 'text-white border-white/30 hover:border-white/60 hover:bg-white/10'
                          : 'text-gray-400 border-white/10 opacity-60 cursor-not-allowed'
                      } ${
                        selectedSize === size
                          ? 'ring-1 ring-yellow-500 border-yellow-500 text-[#0c1420] bg-yellow-500'
                          : ''
                      }`}
                      title={`${size} — ${available ? 'متاح' : 'غير متوفر'}`}
                      type="button"
                      aria-label={`${size} — ${available ? 'متاح' : 'غير متوفر'}`}
                      role="radio"
                      aria-checked={selectedSize === size}
                      aria-disabled={!available}
                      tabIndex={selectedSize === size ? 0 : -1}
                      onKeyDown={(e) => handleSizeKeyDown(e, size)}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Link>

        {/* CTA under photo (appears on hover) */}
        <div className="px-5 pt-3">
          <div className="overflow-hidden transition-all duration-300 max-h-0 opacity-0 group-hover:max-h-16 group-hover:opacity-100">
            <button
              type="button"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                const requireSize =
                  Array.isArray(product.variants) &&
                  product.variants.length > 0;
                if (requireSize && !selectedSize) {
                  toastWarning({ title: 'اختر المقاس', description: 'يرجى اختيار المقاس قبل الإضافة إلى السلة' });
                  return;
                }
                addToCart(
                  {
                    id: product.id,
                    name: product.name,
                    originalPrice: product.originalPrice,
                    discountedPrice: product.discountedPrice,
                    imageUrl: product.imageUrl,
                  },
                  1,
                  selectedSize || undefined
                );
                router.push('/cart');
              }}
              className={`w-full text-center btn-gold-gradient py-3 rounded-xl font-extrabold tracking-wide shadow-md transition-transform duration-300 hover:scale-[1.01] ${
                Array.isArray(product.variants) &&
                product.variants.length > 0 &&
                !selectedSize
                  ? 'opacity-60 cursor-not-allowed'
                  : ''
              }`}
              aria-disabled={
                Array.isArray(product.variants) &&
                product.variants.length > 0 &&
                !selectedSize
              }
            >
              اشتري الآن
            </button>
            {Array.isArray(product.variants) &&
              product.variants.length > 0 &&
              !selectedSize && (
                <div className="mt-2 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  اختر المقاس أولاً لإتمام الشراء
                </div>
              )}
          </div>
        </div>

        {/* Info area: compact single line name + price */}
        <div className="p-5 pt-2">
          {/* Content skeleton while image loading */}
          {!imgLoaded && (
            <div className="animate-pulse">
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          )}
          <div className={`flex items-center justify-between gap-3 transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <div className="min-w-0">
              <h3
                className={`text-sm font-extrabold text-[#0c1420] dark:text-white line-clamp-1`}
                title={product.name}
              >
                {product.name}
              </h3>
              {ratingValue > 0 && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < ratingValue ? 'text-yellow-500' : 'text-gray-300'}`}
                        fill="currentColor"
                      />)
                    )}
                  </div>
                  {reviewsCount > 0 && (
                    <span className="ml-1">({reviewsCount})</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasDiscount && discountPercent > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-700 border border-rose-300 transition-transform duration-300 group-hover:scale-105">
                  خصم {discountPercent}%
                </span>
              )}
              <div className="flex flex-col items-end leading-tight">
                <div className="flex items-baseline gap-1">
                  {hasDiscount && (
                    <span className="text-[10px] text-gray-500">بعد</span>
                  )}
                  <span className={`${hasDiscount ? 'text-rose-600 text-lg md:text-xl' : 'text-yellow-600 text-base'} font-black`}>
                    {formatPrice(currentPrice)}
                  </span>
                </div>
                {hasDiscount && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-gray-400">قبل</span>
                    <span className="text-[11px] text-gray-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {Array.isArray(product.colors) && product.colors.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              {product.colors.slice(0, 6).map((c, idx) => (
                <span
                  key={`${c}-${idx}`}
                  title={c}
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-gray-200"
                  style={{ backgroundColor: c }}
                />
              ))}
              {product.colors.length > 6 && (
                <span className="text-[10px] text-gray-500">+{product.colors.length - 6}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickView
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}
