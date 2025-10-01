'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatPrice } from '@/lib/utils';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { DEFAULT_SIZES } from '@/lib/constants';
import { useCart } from '@/hooks/useCart';
import { useRouter } from 'next/navigation';
import SizeGuideModal from '@/components/SizeGuideModal';

interface Product {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  imageUrl: string;
  stock: number;
  variants?: Array<{
    id: string;
    size: string;
    stock: number;
  }>;
}

interface QuickViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickView({
  product,
  isOpen,
  onClose,
}: QuickViewProps) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [, setHoveredSize] = useState<string | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const isVariantProduct = !!(product?.variants && product.variants.length > 0);

  useEffect(() => {
    if (isOpen) {
      setSelectedSize(null);
      setHoveredSize(null);
      setShowSizeGuide(false);
    }
  }, [isOpen]);

  const currentPrice = product
    ? product.discountedPrice < product.originalPrice
      ? product.discountedPrice
      : product.originalPrice
    : 0;
  const hasDiscount = product ? product.discountedPrice < product.originalPrice : false;
  const discountPercent = hasDiscount && product
    ? Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)
    : 0;

  const sizes = product?.variants && product.variants.length > 0
    ? product.variants.map(v => v.size)
    : Array.from(DEFAULT_SIZES);

  const isSizeAvailable = (size: string) => {
    if (product?.variants && product.variants.length > 0) {
      const v = product.variants.find(vv => vv.size === size);
      return (v?.stock || 0) > 0;
    }
    return (product?.stock || 0) > 0;
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (isVariantProduct && !selectedSize) return;
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
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/cart');
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !product || !mounted) return null;

  const content = (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[9998]" onClick={onClose} />

      {/* Quick View Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-[#0c1420] text-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
          <div className="flex flex-col lg:flex-row">
            {/* Product Image */}
            <div className="lg:w-[55%]">
              <div className="relative h-[50vh] md:h-[60vh] lg:h-[75vh]">
                <ImageWithFallback
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors duration-300"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Product Details */}
            <div className="lg:w-[45%] p-6 md:p-8 flex flex-col gap-5">
              <h2 className="text-2xl md:text-3xl font-extrabold">{product.name}</h2>

              {/* Price Row */}
              <div className="flex items-center gap-3">
                {hasDiscount && discountPercent > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs md:text-sm font-extrabold border border-rose-300">
                    خصم {discountPercent}%
                  </span>
                )}
                <span className={`${hasDiscount ? 'text-rose-400 md:text-4xl text-3xl' : 'text-yellow-400 text-2xl md:text-3xl'} font-black`}>
                  {formatPrice(currentPrice)}
                </span>
                {hasDiscount && (
                  <span className="text-sm md:text-base text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
                )}
              </div>

              {/* Size selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">اختر المقاس</span>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="text-xs underline text-gray-300 hover:text-white"
                  >
                    دليل المقاسات
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {sizes.map((size) => {
                    const available = isSizeAvailable(size);
                    const selected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onMouseEnter={() => setHoveredSize(size)}
                        onMouseLeave={() => setHoveredSize(s => (s === size ? null : s))}
                        onClick={(e) => { e.preventDefault(); if (available) setSelectedSize(size); }}
                        disabled={!available}
                        className={`min-w-10 px-3 py-2 rounded-md border text-sm font-semibold transition-colors ${selected ? 'bg-yellow-500 text-[#0c1420] border-yellow-500' : 'bg-transparent text-white/90 border-white/20 hover:border-white/50'} disabled:opacity-40 disabled:cursor-not-allowed`}
                        aria-pressed={selected}
                        aria-disabled={!available}
                        title={available ? 'متاح' : 'غير متوفر'}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  disabled={(isVariantProduct && !selectedSize) || product.stock === 0}
                  className="w-full bg-transparent text-white py-3 px-6 rounded-xl font-extrabold border border-white/30 hover:border-white/60 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  أضف إلى السلة - {formatPrice(currentPrice)}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={(isVariantProduct && !selectedSize) || product.stock === 0}
                  className="w-full btn-gold-gradient py-3 px-6 rounded-xl font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  اشتري الآن
                </button>
              </div>

              <div>
                <a href={`/product/${product.id}`} className="inline-flex items-center gap-2 text-sm underline text-white/80 hover:text-white">
                  عرض التفاصيل الكاملة ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {createPortal(content, document.body)}
      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </>
  );
}
