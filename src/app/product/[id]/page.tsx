'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { formatPrice } from '@/lib/utils';
import { CART_STORAGE_KEY, FAVORITES_STORAGE_KEY, DEFAULT_SIZES, CURRENCY, SITE_NAME, SITE_URL } from '@/lib/constants';
import { Check, Heart, Clock, Shield, Star, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Script from 'next/script';
import { toast } from '@/components/ui/Toast';
import RecommendedProducts from '@/components/RecommendedProducts';
import ProductFeatures from '@/components/ProductFeatures';
import SizeGuideModal from '@/components/SizeGuideModal';
import { trackAddToCart, trackFavoriteAdded, trackFavoriteRemoved } from '@/lib/analytics';

const Reviews = dynamic(() => import('@/components/Reviews'), {
  ssr: false,
  loading: () => (
    <div className="p-4 border border-gray-200 rounded-xl bg-white">
      <div className="h-4 w-32 bg-gray-100 rounded mb-3 animate-pulse" />
      <div className="space-y-2">
        <div className="h-14 bg-gray-50 rounded animate-pulse" />
        <div className="h-14 bg-gray-50 rounded animate-pulse" />
        <div className="h-14 bg-gray-50 rounded animate-pulse" />
      </div>
    </div>
  ),
});

interface Product {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  imageUrl: string;
  hoverImageUrl?: string | null;
  thumbnailUrl?: string | null;
  image2Url?: string | null;
  image3Url?: string | null;
  stock: number;
  features?: string[] | null;
  variants?: Array<{
    id: string;
    size: string;
    stock: number;
    minDisplayStock: number;
  }>;
  discountEndsAt?: string | null;
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isHovering, setIsHovering] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  // Discount countdown state
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [discountActive, setDiscountActive] = useState(false);
  // Zoom lens state
  const imageBoxRef = useRef<HTMLDivElement | null>(null);
  const [lensVisible, setLensVisible] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [lensBgPos, setLensBgPos] = useState({ x: 50, y: 50 });
  const LENS_SIZE = 180; // px (smaller lens on mouse)
  const ZOOM_SCALE = 3; // 3x zoom
  // External zoom pane (desktop) — slightly smaller than Amazon style
  const PANE_SIZE = 520; // px (bigger external pane on the left)
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [imgFit, setImgFit] = useState({ w: 0, h: 0, offX: 0, offY: 0 });
  const [lensBgPx, setLensBgPx] = useState({ x: 0, y: 0 });
  const [zoomPaneBgPx, setZoomPaneBgPx] = useState({ x: 0, y: 0 });
  const [zoomPanePos, setZoomPanePos] = useState({ left: 0, top: 0 });
  const [zoomPaneSize, setZoomPaneSize] = useState(PANE_SIZE);
  const [zoomPaneVisible, setZoomPaneVisible] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(res => res.json())
      .then(data => {
        
        if (data) {
          data.originalPrice = Number(data.originalPrice);
          data.discountedPrice = Number(data.discountedPrice);
          data.stock = Number(data.stock);
          
        }
        setProduct(data);
        setLoading(false);
        // Initialize gallery selected image
        try {
          const imgs = [
            data?.imageUrl,
            data?.hoverImageUrl,
            data?.image2Url,
            data?.image3Url,
          ].filter((u: any): u is string => typeof u === 'string' && u.length > 0);
          setSelectedImage(imgs[0] || data?.imageUrl || '');
        } catch {}

        // Initialize favorite state
        try {
          const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
          const ids: string[] = raw ? JSON.parse(raw) : [];
          setIsFavorite(Array.isArray(ids) && data?.id ? ids.includes(data.id) : false);
        } catch {}
      })
      .catch(error => {
        console.error('Error fetching product:', error);
        setLoading(false);
      });

    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing cart:', error);
        setCart([]);
      }
    }
  }, [params.id]);

  // Load and subscribe to product reviews to show average stars under name
  useEffect(() => {
    const loadRatings = async () => {
      if (!product?.id) {
        setAvgRating(0);
        setReviewsCount(0);
        return;
      }
      try {
        const res = await fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const arr = await res.json();
        if (Array.isArray(arr) && arr.length > 0) {
          const sum = arr.reduce((s: number, r: any) => s + (Number(r?.rating) || 0), 0);
          const avg = Math.round((sum / arr.length) * 10) / 10;
          setAvgRating(avg);
          setReviewsCount(arr.length);
        } else {
          setAvgRating(0);
          setReviewsCount(0);
        }
      } catch {
        setAvgRating(0);
        setReviewsCount(0);
      }
    };

    loadRatings();
    const handler = (e: any) => {
      if (!product?.id) return;
      const pid = e?.detail?.productId;
      if (!pid || pid === product.id) loadRatings();
    };
    window.addEventListener('reviewsUpdated', handler);
    return () => window.removeEventListener('reviewsUpdated', handler);
  }, [product?.id]);

  // Discount countdown effect
  useEffect(() => {
    if (!product || !product.discountedPrice || product.discountedPrice >= product.originalPrice) {
      setDiscountActive(false);
      setTimeLeft(null);
      return;
    }
    const endStr = product.discountEndsAt || '';
    const endTs = endStr ? Date.parse(endStr) : NaN;
    if (!Number.isFinite(endTs) || endTs <= Date.now()) {
      setDiscountActive(false);
      setTimeLeft(null);
      return;
    }
    setDiscountActive(true);
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, endTs - now);
      if (diff <= 0) {
        setDiscountActive(false);
        setTimeLeft(null);
        return;
      }
      const d = Math.floor(diff / (24 * 60 * 60 * 1000));
      const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const s = Math.floor((diff % (60 * 1000)) / 1000);
      setTimeLeft({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [product]);

  // Auto-select first in-stock size when product variants load or selection becomes invalid
  useEffect(() => {
    if (!product?.variants || product.variants.length === 0) return;
    const selectedOk = selectedSize && product.variants.some(v => v.size === selectedSize && v.stock > 0);
    if (!selectedOk) {
      const firstInStock = product.variants.find(v => v.stock > 0);
      if (firstInStock) setSelectedSize(firstInStock.size);
    }
  }, [product?.variants, selectedSize]);

  // Clamp quantity to available max when size/cart/product change
  useEffect(() => {
    // Inline compute to avoid function deps
    let stock = 0;
    if (product?.variants && selectedSize) {
      const v = product.variants.find((vv) => vv.size === selectedSize);
      stock = v?.stock || 0;
    } else {
      stock = product?.stock || 0;
    }
    const keySize = product?.variants && selectedSize ? selectedSize : '';
    const inCart = cart.find((i) => i.id === product?.id && (i.size || '') === keySize)?.quantity || 0;
    const maxAdd = Math.max(0, stock - inCart);
    setQuantity((q) => {
      if (maxAdd <= 0) return 1;
      return Math.min(Math.max(1, q), maxAdd);
    });
  }, [selectedSize, product?.id, product?.stock, product?.variants, cart]);

  // Gallery helpers for lightbox navigation and swipe (must be before any early returns)
  const galleryImages = useMemo(() => {
    return [
      product?.imageUrl || '',
      product?.hoverImageUrl || '',
      product?.image2Url || '',
      product?.image3Url || '',
    ]
      .filter((u): u is string => typeof u === 'string' && u.length > 0)
      .filter((v, i, arr) => arr.indexOf(v) === i);
  }, [product?.imageUrl, product?.hoverImageUrl, product?.image2Url, product?.image3Url]);

  const currentIndex = useMemo(
    () => Math.max(0, galleryImages.indexOf(selectedImage || (product?.imageUrl || ''))),
    [galleryImages, selectedImage, product?.imageUrl]
  );

  const prevImage = useCallback(() => {
    if (galleryImages.length < 2) return;
    const idx = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    setSelectedImage(galleryImages[idx]);
  }, [galleryImages, currentIndex]);

  const nextImage = useCallback(() => {
    if (galleryImages.length < 2) return;
    const idx = (currentIndex + 1) % galleryImages.length;
    setSelectedImage(galleryImages[idx]);
  }, [galleryImages, currentIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.touches[0]?.clientX ?? null);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX;
    if (dx > 40) {
      // swipe right -> previous (RTL-friendly)
      prevImage();
    } else if (dx < -40) {
      // swipe left -> next
      nextImage();
    }
    setTouchStartX(null);
  }, [touchStartX, prevImage, nextImage]);

  // Lightbox keyboard navigation and focus handling
  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      }
    };
    window.addEventListener('keydown', onKey);
    // Focus close button when opened
    setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLightboxOpen, prevImage, nextImage]);

  // Lightbox zoom state
  const [lbZoom, setLbZoom] = useState(1);
  useEffect(() => {
    if (!isLightboxOpen) setLbZoom(1);
  }, [isLightboxOpen]);

  // Removed local upload and drag-and-drop handlers from product page

  // Desktop zoom lens handlers
  const onImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageBoxRef.current) return;
    const rect = imageBoxRef.current.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    const relX = Math.min(Math.max(0, e.clientX - rect.left), cw);
    const relY = Math.min(Math.max(0, e.clientY - rect.top), ch);

    // Compute object-contain fit of the image inside the container
    const iw = imgNatural.w;
    const ih = imgNatural.h;
    let w = cw, h = ch, offX = 0, offY = 0;
    if (iw > 0 && ih > 0 && cw > 0 && ch > 0) {
      const cAR = cw / ch;
      const iAR = iw / ih;
      if (cAR > iAR) {
        // container is wider -> image fills height
        h = ch;
        w = h * iAR;
        offX = (cw - w) / 2;
        offY = 0;
      } else {
        // container is taller -> image fills width
        w = cw;
        h = w / iAR;
        offX = 0;
        offY = (ch - h) / 2;
      }
    }
    setImgFit({ w, h, offX, offY });

    // Determine if cursor is inside the rendered image area
    const inside = relX >= offX && relX <= offX + w && relY >= offY && relY <= offY + h;
    setLensVisible(inside);

    setLensPos({ x: relX, y: relY });

    // Compute background position in px relative to the image area
    const imgRelX = Math.min(Math.max(0, relX - offX), w);
    const imgRelY = Math.min(Math.max(0, relY - offY), h);
    const bgX = -(imgRelX * ZOOM_SCALE - LENS_SIZE / 2);
    const bgY = -(imgRelY * ZOOM_SCALE - LENS_SIZE / 2);
    setLensBgPx({ x: bgX, y: bgY });

    // Update external zoom pane position (fixed near image) and background
    // Always prefer left side; shrink to fit; hide if there isn't enough space
    const MIN_PANE = 200;
    const gap = 24;
    // Choose side with more space OUTSIDE the main container (to avoid covering content)
    const containerEl = imageBoxRef.current?.closest('.max-w-screen-2xl') as HTMLElement | null;
    const containerRect = containerEl?.getBoundingClientRect();
    const contLeft = containerRect?.left ?? Math.max(0, rect.left - 8);
    const contRight = containerRect?.right ?? Math.min(window.innerWidth, rect.right + 8);
    const availableLeft = Math.max(0, contLeft - 8);
    const availableRight = Math.max(0, window.innerWidth - contRight - 8);
    const preferLeft = availableLeft >= availableRight;
    const sideSpace = preferLeft ? availableLeft : availableRight;

    // Compute size limited by side space and height
    let useSize = PANE_SIZE;
    useSize = Math.min(useSize, Math.floor(sideSpace - gap));
    // Do not let the pane be taller than the image or viewport
    const maxByHeight = Math.floor(Math.min(rect.height - 16, window.innerHeight - 32));
    useSize = Math.max(MIN_PANE, Math.min(useSize, maxByHeight));
    const canPlaceOutside = sideSpace >= MIN_PANE + gap;
    // While moving inside the box, force visibility; mouseleave will hide it
    setZoomPaneVisible(true);

    // Decide final size and position
    let paneLeft: number;
    let paneTop: number;
    if (canPlaceOutside) {
      setZoomPaneSize(useSize);
      // Horizontal coordinate based on chosen side (outside container)
      paneLeft = preferLeft
        ? Math.max(8, contLeft - useSize - gap)
        : Math.min(window.innerWidth - useSize - 8, contRight + gap);
      // Vertical coordinate: dock to image top (clamped to viewport)
      paneTop = Math.max(16, Math.min(window.innerHeight - useSize - 16, rect.top));
    } else {
      // Fallback: overlay inside image box at top-left (so it doesn't cover left details)
      const safeSize = Math.max(MIN_PANE, Math.min(maxByHeight, Math.floor(rect.width - 32)));
      setZoomPaneSize(safeSize);
      paneLeft = Math.max(8, Math.min(window.innerWidth - safeSize - 8, rect.left + 16));
      paneTop = Math.max(16, Math.min(window.innerHeight - safeSize - 16, rect.top + 16));
    }
    setZoomPanePos({ left: paneLeft, top: paneTop });
    const paneBgX = -(imgRelX * ZOOM_SCALE - (canPlaceOutside ? useSize : Math.min(zoomPaneSize, useSize)) / 2);
    const paneBgY = -(imgRelY * ZOOM_SCALE - (canPlaceOutside ? useSize : Math.min(zoomPaneSize, useSize)) / 2);
    setZoomPaneBgPx({ x: paneBgX, y: paneBgY });
  };

  const toggleFavorite = () => {
    if (!product) return;
    let ids: string[] = [];
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]';
      const parsed = JSON.parse(raw);
      ids = Array.isArray(parsed) ? parsed : [];
    } catch {}

    let next: string[];
    if (isFavorite) {
      next = ids.filter(id => id !== product.id);
    } else {
      next = ids.includes(product.id) ? ids : [...ids, product.id];
    }
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
    setIsFavorite(!isFavorite);
    window.dispatchEvent(new CustomEvent('favoritesUpdated'));
    try {
      if (isFavorite) {
        trackFavoriteRemoved({ id: product.id, name: product.name });
      } else {
        trackFavoriteAdded({ id: product.id, name: product.name });
      }
    } catch {}
  };

  

  const addToCart = (): boolean => {
    if (!product) return false;
    if (product?.variants && product.variants.length > 0 && !selectedSize) {
      toast({ title: 'اختر المقاس', description: 'من فضلك اختر المقاس أولاً', variant: 'warning' });
      return false;
    }

    const price =
      typeof product.discountedPrice === 'number' &&
      product.discountedPrice < product.originalPrice
        ? product.discountedPrice
        : product.originalPrice;
    const hasVariants = !!(product.variants && product.variants.length > 0);
    // Normalize the key we use to compare items. If no variants, ignore any UI-selected size.
    const keySize = hasVariants ? (selectedSize || '') : '';

    const existingItem = cart.find(
      item =>
        item.id === product.id && (item.size || '') === keySize
    );

    const maxAdd = getMaxAddable();
    if (maxAdd <= 0) {
      toast({ title: 'المخزون غير كافٍ', description: 'لا يوجد مخزون كافٍ لهذا المقاس', variant: 'error' });
      return false;
    }

    const qtyToAdd = Math.min(quantity, maxAdd);

    let newCart;
    if (existingItem) {
      newCart = cart.map(item =>
        item.id === product.id && (item.size || '') === (selectedSize || '')
          ? { ...item, quantity: item.quantity + qtyToAdd }
          : item
      );
    } else {
      newCart = [
        ...cart,
        {
          id: product.id,
          name: product.name,
          price,
          imageUrl: product.imageUrl,
          quantity: qtyToAdd,
          // If product has variants, persist the selected size; otherwise keep undefined for consistency
          size: hasVariants ? (selectedSize || undefined) : undefined,
        },
      ];
    }

    setCart(newCart);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    if (qtyToAdd < quantity) {
      toast({ title: 'إضافة جزئية', description: `تمت إضافة ${qtyToAdd} فقط بسبب حد المخزون المتاح`, variant: 'warning' });
    } else {
      toast({ title: 'تمت الإضافة', description: 'تم إضافة المنتج إلى السلة', variant: 'success' });
    }
    try {
      trackAddToCart({ id: product.id, name: product.name, price, quantity: qtyToAdd, size: hasVariants ? (selectedSize || undefined) : undefined });
    } catch {}
    return true;
  };

  const getCurrentStock = () => {
    if (product?.variants && selectedSize) {
      const variant = product.variants.find(v => v.size === selectedSize);
      return variant?.stock || 0;
    }
    return product?.stock || 0;
  };

  const getInCartQty = (size?: string) => {
    if (!product) return 0;
    const keySize = size || '';
    const found = cart.find(
      (i) => i.id === product.id && (i.size || '') === keySize
    );
    return found?.quantity || 0;
  };

  const getMaxAddable = () => {
    const stock = getCurrentStock();
    const inCart = getInCartQty(product?.variants && selectedSize ? selectedSize : undefined);
    return Math.max(0, stock - inCart);
  };

  // Compute disabled state (no hooks; must be above early returns)
  const isButtonDisabled = !product
    ? true
    : (product.variants && product.variants.length > 0)
      ? (!selectedSize
        ? false // let user click to be prompted to select size
        : ((product.variants.find(v => v.size === selectedSize)?.stock || 0) <= 0))
      : ((product.stock || 0) <= 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-32">
        <div className="max-w-screen-2xl mx-auto px-2 md:px-3 lg:px-4">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-8 text-[#0c1420] text-xl font-medium">
              جاري تحميل المنتج...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white pt-32">
        <div className="max-w-screen-2xl mx-auto px-2 md:px-3 lg:px-4">
          <div className="text-center py-20">
            <div className="w-32 h-32 mx-auto mb-8 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
                />
              </svg>
            </div>
            <p className="text-[#0c1420] text-xl font-medium">
              المنتج غير موجود
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentPrice =
    product.discountedPrice < product.originalPrice
      ? product.discountedPrice
      : product.originalPrice;
  const hasDiscount = product.discountedPrice < product.originalPrice;
  const displaySrc = selectedImage || product.imageUrl || '';
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)
    : 0;
  const maxAddable = getMaxAddable();

  

  return (
    <div className="min-h-screen bg-white pt-20 pb-28 sm:pb-12">
      <div className="max-w-screen-2xl mx-auto px-2 md:px-3 lg:px-4 pl-3 md:pl-5 lg:pl-8">
        {/* JSON-LD for Product Schema */}
        <Script
          id="product-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              image: galleryImages,
              description: product.description,
              brand: { '@type': 'Brand', name: SITE_NAME },
              offers: {
                '@type': 'Offer',
                url: `${SITE_URL}/product/${product.id}`,
                priceCurrency: CURRENCY,
                price: currentPrice,
                availability:
                  getMaxAddable() === 0
                    ? 'https://schema.org/OutOfStock'
                    : 'https://schema.org/InStock',
              },
              aggregateRating:
                reviewsCount > 0
                  ? { '@type': 'AggregateRating', ratingValue: avgRating, reviewCount: reviewsCount }
                  : undefined,
            }),
          }}
        />
        {/* JSON-LD: BreadcrumbList */}
        <Script
          id="breadcrumb-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'الرئيسية',
                  item: SITE_URL,
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'المنتجات',
                  item: `${SITE_URL}/products`,
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: product.name,
                  item: `${SITE_URL}/product/${product.id}`,
                },
              ],
            }),
          }}
        />
        {/* Breadcrumbs */}
        <nav className="mb-4 text-sm text-gray-500" aria-label="breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-[#0c1420] font-medium">الرئيسية</Link>
            </li>
            <li className="text-gray-300">/</li>
            <li>
              <Link href="/products" className="hover:text-[#0c1420] font-medium">المنتجات</Link>
            </li>
            <li className="text-gray-300">/</li>
            <li aria-current="page" className="text-[#0c1420]">{product.name}</li>
          </ol>
        </nav>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">
          {/* Product Images - Left Side */}
          <div className="space-y-6 order-2 md:order-1 md:col-span-7 pl-2 md:pl-4 lg:pl-6 xl:pl-8">
            {/* Desktop: thumbnails list + main image */}
            <div className="hidden lg:grid lg:sticky lg:top-24 grid-cols-[96px_1fr] gap-6">
              {/* Thumbnails */}
              <div className="flex flex-col gap-3">
                {[
                  product.imageUrl,
                  product.hoverImageUrl || undefined,
                  product.image2Url || undefined,
                  product.image3Url || undefined,
                ]
                  .filter((u): u is string => typeof u === 'string' && u.length > 0)
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedImage(url)}
                      onMouseEnter={() => setSelectedImage(url)}
                      onFocus={() => setSelectedImage(url)}
                      aria-pressed={selectedImage === url}
                      className={`relative w-20 h-20 rounded-xl border overflow-hidden ${
                        selectedImage === url ? 'ring-2 ring-yellow-600' : 'hover:ring-2 hover:ring-yellow-400'
                      }`}
                      title="الصورة"
                    >
                      <ImageWithFallback src={url} alt="thumbnail" fill sizes="80px" className="object-cover" />
                    </button>
                  ))}
              </div>
              {/* Main image with zoom lens */}
              <div
                ref={imageBoxRef}
                className="relative w-full aspect-square bg-white rounded-xl shadow-lg overflow-hidden border border-yellow-200 cursor-zoom-in"
                onMouseEnter={() => { setIsHovering(true); setLensVisible(true); setZoomPaneVisible(true); }}
                onMouseLeave={() => { setIsHovering(false); setLensVisible(false); setZoomPaneVisible(false); }}
                onMouseMove={onImageMouseMove}
                onClick={() => setIsLightboxOpen(true)}
              >
                <ImageWithFallback
                  src={displaySrc}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
                  priority
                  onLoad={(e) => setImgNatural({ w: (e.currentTarget as any).naturalWidth || 0, h: (e.currentTarget as any).naturalHeight || 0 })}
                />
                {/* Magnifier Lens hidden as requested */}
                <div className="hidden" />
                {/* External Zoom Pane (desktop only, fixed on screen) */}
                <div
                  className={`hidden md:block pointer-events-none fixed ${zoomPaneVisible ? '' : 'opacity-0'} transition-opacity z-[999]`}
                  style={{
                    width: zoomPaneSize,
                    height: zoomPaneSize,
                    left: zoomPanePos.left,
                    top: zoomPanePos.top,
                    border: '2px solid rgba(234,179,8,0.8)',
                    borderRadius: 12,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                    backgroundImage: `url(${displaySrc})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${imgFit.w * ZOOM_SCALE}px ${imgFit.h * ZOOM_SCALE}px`,
                    backgroundPosition: `${zoomPaneBgPx.x}px ${zoomPaneBgPx.y}px`,
                    backgroundColor: '#fff'
                  }}
                />
                {/* Decorative corner overlay */}
                <div className="pointer-events-none absolute top-0 right-0 w-16 h-16">
                  <div className="absolute top-0 right-0 w-16 h-px bg-yellow-300"></div>
                  <div className="absolute top-0 right-0 h-16 w-px bg-yellow-300"></div>
                </div>
                {/* New Badge */}
                <div className="absolute top-4 left-4 bg-yellow-100 text-[#0c1420] px-3 py-1 rounded-full text-sm font-medium">
                  جديد
                </div>
                {/* Brand Name */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className="text-[#0c1420] font-medium text-sm">
                    {product.name}
                  </span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Mobile: main image then horizontal thumbnails */}
            <div className="lg:hidden">
              <div
                className="relative w-full aspect-square bg-white rounded-xl shadow-lg overflow-hidden border border-yellow-200"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onClick={() => setIsLightboxOpen(true)}
              >
                <ImageWithFallback
                  src={displaySrc}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 100vw"
                  className="object-contain"
                  priority
                  onLoad={(e) => setImgNatural({ w: (e.currentTarget as any).naturalWidth || 0, h: (e.currentTarget as any).naturalHeight || 0 })}
                />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {[
                  product.imageUrl,
                  product.hoverImageUrl || undefined,
                  product.image2Url || undefined,
                  product.image3Url || undefined,
                ]
                  .filter((u): u is string => typeof u === 'string' && u.length > 0)
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedImage(url)}
                      onMouseEnter={() => setSelectedImage(url)}
                      onFocus={() => setSelectedImage(url)}
                      aria-pressed={selectedImage === url}
                      className={`relative w-full aspect-square rounded-xl border overflow-hidden ${
                        selectedImage === url ? 'ring-2 ring-yellow-600' : 'hover:ring-2 hover:ring-yellow-400'
                      }`}
                      title="الصورة"
                    >
                      <ImageWithFallback src={url} alt="thumbnail" fill sizes="(max-width: 768px) 25vw, 120px" className="object-cover" />
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Product Details - Right Side */}
          <div className="space-y-6 order-1 md:order-2 md:col-span-5 pl-2 md:pl-4 lg:pl-6">
            {/* Product Name + Favorite inline */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl md:text-3xl leading-tight font-extrabold text-[#0c1420]">
                  {product.name}
                </h1>
                <button
                  type="button"
                  onClick={toggleFavorite}
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 ${
                    isFavorite
                      ? 'bg-rose-100 text-rose-700 border-rose-300'
                      : 'bg-white text-[#0c1420] border-gray-300 hover:border-rose-300'
                  }`}
                  title={isFavorite ? 'حذف من المفضلة' : 'أضف إلى المفضلة'}
                  aria-label={isFavorite ? 'حذف من المفضلة' : 'أضف إلى المفضلة'}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'text-rose-600 fill-rose-600' : ''}`} />
                  <span className="hidden sm:inline">{isFavorite ? 'في المفضلة' : 'أضف إلى المفضلة'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {Array.from({ length: 5 }, (_, i) => i + 1).map((i) => (
                  <Star key={i} className={`w-4 h-4 ${i <= Math.round(avgRating) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`} />
                ))}
                <span className="text-sm text-gray-600">{avgRating} / 5</span>
                <span className="text-sm text-gray-400">({reviewsCount})</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">راحة تدوم، تصميم يلفت الأنظار.</p>
              {product.description && (
                <p
                  className="mt-3 text-gray-700 leading-relaxed"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {product.description}
                </p>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {hasDiscount && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-sm font-extrabold border border-rose-300">
                    خصم {discountPercent}%
                  </span>
                )}
                <span className={`${hasDiscount ? 'text-rose-600 text-4xl md:text-5xl' : 'text-yellow-600 text-3xl'} font-extrabold`}>
                  {formatPrice(currentPrice)}
                </span>
                {hasDiscount && (
                  <span className="text-base font-medium text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
              {hasDiscount && discountActive && timeLeft && (
                <div className="flex items-center gap-2 text-sm bg-yellow-50 border border-yellow-200 text-[#0c1420] rounded-xl px-3 py-2 w-fit">
                  <Clock className="w-4 h-4 text-yellow-700" />
                  <span className="font-bold">ينتهي العرض خلال:</span>
                  <span className="tabular-nums font-extrabold">
                    {timeLeft.d > 0 ? `${timeLeft.d}ي ` : ''}{String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* Color Variant removed: hardcoded placeholder replaced by real description above */}

            {/* Size Selector (with variants) */}
            {product?.variants && product.variants.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[#0c1420] font-bold text-lg">
                    اختر المقاس
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-[#0c1420] font-medium">الكمية:</span>
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-300 p-1">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-7 h-7 rounded bg-gray-100 hover:bg-yellow-500 hover:text-white transition-all duration-200 font-bold text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-lg font-bold text-[#0c1420]">
                        {quantity}
                      </span>
                      <button
                        onClick={() => {
                          const maxAdd = getMaxAddable();
                          setQuantity(Math.min(quantity + 1, Math.max(1, maxAdd)));
                        }}
                        disabled={maxAddable <= 0 || quantity >= maxAddable}
                        className="w-7 h-7 rounded bg-gray-100 hover:bg-yellow-500 hover:text-white transition-all duration-200 font-bold text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="text-xs underline text-[#0c1420] hover:text-yellow-600"
                  >
                    دليل المقاسات
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.variants
                    .slice()
                    .sort((a, b) => {
                      const order = ['S', 'M', 'L', 'XL', 'XXL'];
                      return (
                        order.indexOf(a.size.toUpperCase()) -
                        order.indexOf(b.size.toUpperCase())
                      );
                    })
                    .map(v => (
                      <button
                        key={v.id}
                        disabled={v.stock <= 0}
                        onClick={() => setSelectedSize(v.size)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                          selectedSize === v.size
                            ? 'border-yellow-600 bg-yellow-500 text-white'
                            : 'border-gray-300 bg-white text-[#0c1420] hover:border-yellow-500'
                        } ${
                          v.stock <= 0 ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                        title={v.stock <= 0 ? 'غير متوفر' : `متاح: ${v.stock}`}
                      >
                        {v.size}
                      </button>
                    ))}
                </div>

                {selectedSize && (
                  <div className="flex items-center gap-3 text-sm">
                    <p className="text-green-600 font-medium">
                      المخزون: {product.variants.find(x => x.size === selectedSize)?.stock ?? 0} قطعة
                    </p>
                    <p className="text-gray-600">
                      المتاح للإضافة الآن: <span className="font-semibold">{getMaxAddable()}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Fallback Size Selector (no variants) */}
            {(!product?.variants || product.variants.length === 0) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[#0c1420] font-bold text-lg">
                    اختر المقاس
                  </label>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="text-xs underline text-[#0c1420] hover:text-yellow-600"
                  >
                    دليل المقاسات
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(DEFAULT_SIZES).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        selectedSize === s
                          ? 'border-yellow-600 bg-yellow-500 text-white'
                          : 'border-gray-300 bg-white text-[#0c1420] hover:border-yellow-500'
                      }`}
                      title={`المقاس ${s}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Info (if no variants) */}
            {(!product?.variants || product.variants.length === 0) && (
              <div className="flex items-center justify-between">
                <span className="text-[#0c1420] font-medium">الكمية:</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-300 p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-7 h-7 rounded bg-gray-100 hover:bg-yellow-500 hover:text-white transition-all duration-200 font-bold text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-lg font-bold text-[#0c1420]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => {
                        const maxAdd = getMaxAddable();
                        const cap = Math.max(1, maxAdd);
                        setQuantity(Math.min(quantity + 1, cap));
                      }}
                      disabled={maxAddable <= 0 || quantity >= maxAddable}
                      className="w-7 h-7 rounded bg-gray-100 hover:bg-yellow-500 hover:text-white transition-all duration-200 font-bold text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm text-green-600 font-medium">
                    المخزون المتاح: {product.stock} قطعة
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  const ok = addToCart();
                  if (ok) {
                    window.location.href = '/cart';
                  }
                }}
                disabled={isButtonDisabled}
                className="w-full sm:w-auto flex-1 btn-gold-gradient py-3 px-6 rounded-xl font-extrabold text-base transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isButtonDisabled ? 'نفذ المخزون' : 'اشتري الآن'}
              </button>
              <button
                type="button"
                onClick={addToCart}
                disabled={isButtonDisabled}
                className="w-full sm:w-auto flex-1 bg-yellow-500 text-white py-3 px-6 rounded-xl font-bold text-base transition-all duration-200 hover:bg-yellow-600 active:scale-95 focus:scale-95 transform will-change-transform disabled:opacity-50 disabled:cursor-not-allowed"
                title="أضف إلى السلة"
              >
                {isButtonDisabled ? 'نفذ المخزون' : `أضف إلى السلة - ${formatPrice(currentPrice)}`}
              </button>
            </div>

            {/* Product Features */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-bold text-[#0c1420] mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-yellow-600" />
                مميزات المنتج
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                    <Check className="w-4 h-4 text-yellow-700" />
                  </span>
                  <span className="text-[#0c1420] font-medium text-sm">
                    جودة عالية
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                    <Heart className="w-4 h-4 text-yellow-700" />
                  </span>
                  <span className="text-[#0c1420] font-medium text-sm">
                    تصميم فريد
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                    <Clock className="w-4 h-4 text-yellow-700" />
                  </span>
                  <span className="text-[#0c1420] font-medium text-sm">
                    توصيل سريع
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                    <Shield className="w-4 h-4 text-yellow-700" />
                  </span>
                  <span className="text-[#0c1420] font-medium text-sm">
                    ضمان الجودة
                  </span>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <Reviews productId={product.id} />
          </div>
        </div>
        {/* Product Features */}
        <ProductFeatures features={product.features as any} />

        {/* Recommended Products */}
        <RecommendedProducts currentProductId={product.id} />
      </div>
      {/* Mobile Sticky CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <div className="text-sm text-gray-500">السعر</div>
            <div className="text-lg font-extrabold text-yellow-600">{formatPrice(currentPrice)}</div>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={isButtonDisabled}
            className="flex-[2] bg-yellow-500 text-white py-3 px-6 rounded-xl font-bold text-base transition-all duration-200 hover:bg-yellow-600 active:scale-95 focus:scale-95 transform will-change-transform disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="أضف إلى السلة"
          >
            {isButtonDisabled ? 'نفذ المخزون' : 'أضف إلى السلة'}
          </button>
        </div>
      </div>

      {/* Lightbox Overlay */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="عرض الصورة بالحجم الكامل"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLightboxOpen(false);
          }}
        >
          <button
            ref={closeBtnRef}
            type="button"
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
            aria-label="إغلاق"
            onClick={() => setIsLightboxOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
                aria-label="السابق"
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                className="absolute right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
                aria-label="التالي"
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div
            className="relative w-full h-full max-w-5xl max-h-[85vh] px-6 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={(e) => {
              e.preventDefault();
              setLbZoom((z) => {
                const next = z + (e.deltaY < 0 ? 0.2 : -0.2);
                return Math.min(3, Math.max(1, Number(next.toFixed(2))));
              });
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setLbZoom((z) => (z > 1 ? 1 : 2));
            }}
            aria-description="يمكن التكبير عبر عجلة الفأرة أو النقر المزدوج"
          >
            <div className="absolute inset-0" style={{ transform: `scale(${lbZoom})`, transition: 'transform 150ms ease-out' }}>
              <ImageWithFallback
                src={selectedImage || product.imageUrl}
                alt={product.name}
                fill
                className="object-contain select-none"
                sizes="(max-width: 1024px) 100vw, 80vw"
                priority
              />
            </div>
          </div>
        </div>
      )}
      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </div>
  );
}
