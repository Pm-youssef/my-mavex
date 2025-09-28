'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { CART_STORAGE_KEY } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  egyptGovernorates,
  getCitiesByGovernorate,
  shippingMethods,
} from '@/lib/location-data';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  HelpCircle,
  User,
  MapPin,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { trackBeginCheckout } from '@/lib/analytics';
import {
  toastError,
  toastInfo,
  toastSuccess,
  toastWarning,
} from '@/components/ui/Toast';

interface CartItemType {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  size?: string;
}

// Shipping and Coupon types managed at runtime via admin settings
interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  price: number;
  enabled?: boolean;
}

interface AdminCoupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minPurchase?: number;
  active?: boolean;
  startAt?: string;
  endAt?: string;
  usageLimit?: number;
  usedCount?: number;
}

// Animated number helper (smoothly tweens to target value)
function AnimatedNumber({
  value,
  formatter,
  duration = 450,
}: {
  value: number;
  formatter?: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const fromRef = useRef(value);
  const toRef = useRef(value);
  const prevDisplayRef = useRef(value);

  // Track the last rendered value into a ref so the animation can start from it without adding it as a dependency
  useEffect(() => {
    prevDisplayRef.current = display;
  }, [display]);

  useEffect(() => {
    fromRef.current = prevDisplayRef.current;
    toRef.current = value;
    startRef.current = performance.now();
    const step = (t: number) => {
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      const next = fromRef.current + (toRef.current - fromRef.current) * eased;
      setDisplay(next);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formatted = formatter
    ? formatter(Math.round(display))
    : Math.round(display).toString();
  return (
    <span className="transition-colors duration-300 will-change-auto">
      {formatted}
    </span>
  );
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItemType[]>([]);
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    governorate: '',
    postalCode: '',
  });
  const [saveInfo, setSaveInfo] = useState<boolean>(false);
  const [shippingMethod, setShippingMethod] = useState('STANDARD');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});
  const [hydrated, setHydrated] = useState(false);

  // Cards: no special scroll animation; both scroll naturally

  // Admin-driven UI state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AdminCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [uiShippingMethods, setUiShippingMethods] = useState<ShippingMethod[]>(
    shippingMethods as ShippingMethod[]
  );
  const [adminCoupons, setAdminCoupons] = useState<AdminCoupon[]>([]);
  // Settings-driven shipping/tax
  const [settingsFreeShippingMin, setSettingsFreeShippingMin] = useState<
    number | null
  >(null);
  const [settingsTaxPercent, setSettingsTaxPercent] = useState<number | null>(
    null
  );
  const [overrideFreeShippingMin, setOverrideFreeShippingMin] = useState<
    number | null
  >(null);
  const [overrideTaxPercent, setOverrideTaxPercent] = useState<number | null>(
    null
  );

  // Billing address (optional different from shipping)
  const [billingDifferent, setBillingDifferent] = useState(false);
  const [billingInfo, setBillingInfo] = useState({
    address: '',
    city: '',
    governorate: '',
    postalCode: '',
  });

  // Sticky/fixed Order Summary behavior (robust fallback)
  const summaryContainerRef = useRef<HTMLDivElement | null>(null);
  const summaryCardRef = useRef<HTMLDivElement | null>(null);
  const [summaryMode, setSummaryMode] = useState<'static' | 'fixed' | 'bottom'>('static');
  const [summaryTopOffset, setSummaryTopOffset] = useState(112);
  const [summaryLeft, setSummaryLeft] = useState(0);
  const [summaryWidth, setSummaryWidth] = useState(0);

  useEffect(() => {
    const update = () => {
      const container = summaryContainerRef.current;
      const card = summaryCardRef.current;
      if (!container || !card) return;

      const enable = false; // disable sticky; let it scroll normally
      if (!enable) {
        setSummaryMode('static');
        try {
          card.style.position = '';
          card.style.left = '';
          card.style.top = '';
          card.style.bottom = '';
          card.style.width = '';
          (container as HTMLElement).style.minHeight = '';
        } catch {}
        return;
      }

      const headerEl = document.querySelector('header') as HTMLElement | null;
      const headerH = headerEl?.offsetHeight ?? 64;
      const topOffset = headerH + 16; // small breathing space under header
      setSummaryTopOffset(topOffset);

      const cRect = container.getBoundingClientRect();
      const containerTop = window.scrollY + cRect.top;
      const containerH = container.offsetHeight;
      const cardH = card.offsetHeight;

      const leftPx = cRect.left + window.scrollX;
      setSummaryLeft(leftPx);
      setSummaryWidth(container.clientWidth);

      (container as HTMLElement).style.minHeight = `${cardH}px`;

      const y = window.scrollY;
      const maxY = containerTop + containerH - topOffset - cardH;

      if (y < containerTop - topOffset) {
        setSummaryMode('static');
      } else if (y >= maxY) {
        setSummaryMode('bottom');
      } else {
        setSummaryMode('fixed');
      }
    };

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing cart:', error);
        setCart([]);
      }
    }
  }, []);

  // Load public settings (freeShippingMin, taxPercent)
  useEffect(() => {
    try {
      const s: any = (window as any).__PUBLIC_SETTINGS__;
      if (s) {
        setSettingsFreeShippingMin(s?.freeShippingMin ?? null);
        setSettingsTaxPercent(s?.taxPercent ?? null);
      }
    } catch {}
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const j = await res.json();
        setSettingsFreeShippingMin(j?.freeShippingMin ?? null);
        setSettingsTaxPercent(j?.taxPercent ?? null);
      } catch {}
    })();
  }, []);

  // Mark component hydrated to avoid SSR empty-cart flash
  useEffect(() => {
    setHydrated(true);
  }, []);

  // (no-op)

  // Load saved customer info
  useEffect(() => {
    try {
      const raw = localStorage.getItem('checkout-customer-info');
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && typeof saved === 'object') {
        setCustomerInfo(prev => ({ ...prev, ...saved }));
      }
      const savedPref = localStorage.getItem('checkout-save-info');
      setSaveInfo(savedPref === '1' || (!!saved && saved !== null));
    } catch {}
  }, []);

  // Persist customer info if saveInfo is enabled
  useEffect(() => {
    try {
      if (saveInfo) {
        localStorage.setItem(
          'checkout-customer-info',
          JSON.stringify(customerInfo)
        );
        localStorage.setItem('checkout-save-info', '1');
      } else {
        localStorage.removeItem('checkout-customer-info');
        localStorage.setItem('checkout-save-info', '0');
      }
    } catch {}
  }, [customerInfo, saveInfo]);

  // Keep cart state in sync if other components/tabs update localStorage
  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        setCart(raw ? JSON.parse(raw) : []);
      } catch {
        setCart([]);
      }
    };
    const onCartUpdated = () => syncFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) syncFromStorage();
    };

    window.addEventListener('cartUpdated', onCartUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('cartUpdated', onCartUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Load admin-driven overrides (shipping methods, coupons, free shipping & tax) from localStorage
  useEffect(() => {
    try {
      // Shipping overrides: try multiple keys for robustness
      const keys = [
        'admin-shipping-methods',
        'admin-shipping-settings',
        'admin-shipping',
      ];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const enabledOnly = parsed.filter(
              (m: any) => m && (m.enabled ?? true)
            );
            if (enabledOnly.length > 0)
              setUiShippingMethods(enabledOnly as ShippingMethod[]);
          } else if (Array.isArray(parsed?.methods)) {
            const enabledOnly = parsed.methods.filter(
              (m: any) => m && (m.enabled ?? true)
            );
            if (enabledOnly.length > 0)
              setUiShippingMethods(enabledOnly as ShippingMethod[]);
          }
          break;
        }
      }

      // Free shipping / Tax overrides
      const rawShipSettings =
        localStorage.getItem('admin-shipping-settings') ||
        localStorage.getItem('admin-shipping');
      if (rawShipSettings) {
        try {
          const obj = JSON.parse(rawShipSettings);
          if (obj && typeof obj === 'object') {
            if (Object.prototype.hasOwnProperty.call(obj, 'freeShippingMin')) {
              setOverrideFreeShippingMin(
                obj.freeShippingMin == null ? null : Number(obj.freeShippingMin)
              );
            } else if (
              Object.prototype.hasOwnProperty.call(obj, 'settings') &&
              obj.settings
            ) {
              // legacy nested
              setOverrideFreeShippingMin(
                obj.settings.freeShippingMin == null
                  ? null
                  : Number(obj.settings.freeShippingMin)
              );
            }
            if (Object.prototype.hasOwnProperty.call(obj, 'taxPercent')) {
              setOverrideTaxPercent(
                obj.taxPercent == null ? null : Number(obj.taxPercent)
              );
            } else if (
              Object.prototype.hasOwnProperty.call(obj, 'settings') &&
              obj.settings
            ) {
              setOverrideTaxPercent(
                obj.settings.taxPercent == null
                  ? null
                  : Number(obj.settings.taxPercent)
              );
            }
          }
        } catch {}
      }

      // Coupons
      const rawCoupons = localStorage.getItem('admin-coupons');
      const coupons = rawCoupons ? JSON.parse(rawCoupons) : [];
      if (Array.isArray(coupons)) setAdminCoupons(coupons as AdminCoupon[]);
      const savedApplied = localStorage.getItem('checkout-applied-coupon');
      if (savedApplied) {
        const found = (coupons as AdminCoupon[]).find(
          (c: any) => c && c.code?.toLowerCase() === savedApplied.toLowerCase()
        );
        if (found) {
          setAppliedCoupon(found);
          setCouponCode(found.code);
        } else {
          // Try server to restore coupon using subtotal from localStorage
          (async () => {
            try {
              const raw = localStorage.getItem(CART_STORAGE_KEY);
              const parsed = raw ? JSON.parse(raw) : [];
              const subtotal = Array.isArray(parsed)
                ? parsed.reduce(
                    (s: number, it: any) =>
                      s + Number(it.price) * Number(it.quantity),
                    0
                  )
                : 0;
              const res = await fetch('/api/coupons/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: savedApplied, subtotal }),
              });
              const j = await res.json();
              if (res.ok && j?.valid) {
                const type: 'percent' | 'fixed' =
                  j.type === 'PERCENT' ? 'percent' : 'fixed';
                setAppliedCoupon({
                  id: 'api',
                  code: savedApplied,
                  type,
                  value: Number(j.value || 0),
                } as AdminCoupon);
                setCouponCode(savedApplied);
                setDiscountAmount(Number(j.discount || 0));
              }
            } catch {}
          })();
        }
      }
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        [
          'admin-shipping-methods',
          'admin-shipping-settings',
          'admin-shipping',
        ].includes(e.key)
      ) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          const methods = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.methods)
            ? parsed.methods
            : null;
          if (Array.isArray(methods)) {
            const enabledOnly = methods.filter(
              (m: any) => m && (m.enabled ?? true)
            );
            setUiShippingMethods(enabledOnly as ShippingMethod[]);
          }

          // Update overrides
          const obj = parsed && typeof parsed === 'object' ? parsed : null;
          if (obj) {
            if (Object.prototype.hasOwnProperty.call(obj, 'freeShippingMin')) {
              setOverrideFreeShippingMin(
                obj.freeShippingMin == null ? null : Number(obj.freeShippingMin)
              );
            }
            if (Object.prototype.hasOwnProperty.call(obj, 'taxPercent')) {
              setOverrideTaxPercent(
                obj.taxPercent == null ? null : Number(obj.taxPercent)
              );
            }
          }
        } catch {}
      }
      if (e.key === 'admin-coupons') {
        try {
          const next = e.newValue ? JSON.parse(e.newValue) : [];
          if (Array.isArray(next)) setAdminCoupons(next as AdminCoupon[]);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Coupon helpers
  const isCouponActive = (c: AdminCoupon) => {
    const now = Date.now();
    const startsOk = !c.startAt || new Date(c.startAt).getTime() <= now;
    const endsOk = !c.endAt || new Date(c.endAt).getTime() >= now;
    const underLimit = !c.usageLimit || (c.usedCount || 0) < c.usageLimit;
    return (c.active ?? true) && startsOk && endsOk && underLimit;
  };

  const calcDiscount = (subtotal: number, c: AdminCoupon | null) => {
    if (!c) return 0;
    if (c.minPurchase && subtotal < c.minPurchase) return 0;
    const raw =
      c.type === 'percent' ? Math.floor((subtotal * c.value) / 100) : c.value;
    return Math.max(0, Math.min(raw, subtotal));
  };

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      localStorage.removeItem('checkout-applied-coupon');
      toastInfo({
        title: 'تم مسح الكوبون',
        description: 'يمكنك إدخال كوبون جديد',
      });
      return;
    }
    const subtotal = getSubtotal();
    // Try server-side coupon validation first
    try {
      const res = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const j = await res.json();
      if (res.ok && j?.valid) {
        const type: 'percent' | 'fixed' =
          j.type === 'PERCENT' ? 'percent' : 'fixed';
        const normalized = {
          id: 'api',
          code: code,
          type,
          value: Number(j.value || 0),
        } as AdminCoupon;
        setAppliedCoupon(normalized);
        setDiscountAmount(Number(j.discount || 0));
        try {
          localStorage.setItem('checkout-applied-coupon', code);
        } catch {}
        toastSuccess({
          title: 'تم تطبيق الكوبون',
          description: `تم خصم ${formatPrice(Number(j.discount || 0))}`,
        });
        return;
      }
    } catch {}
    // Fallback to admin local coupons
    const found = adminCoupons.find(
      c => c.code?.toLowerCase() === code.toLowerCase()
    );
    if (!found) {
      toastWarning({
        title: 'الكوبون غير صحيح',
        description: 'تحقق من الرمز أو جرّب لاحقًا',
      });
      return;
    }
    if (!isCouponActive(found)) {
      toastWarning({
        title: 'الكوبون غير متاح',
        description: 'الكوبون انتهى أو غير مفعّل',
      });
      return;
    }
    const disc = calcDiscount(subtotal, found);
    if (disc <= 0) {
      toastWarning({
        title: 'لا ينطبق الكوبون',
        description: 'تحقق من الحد الأدنى للطلب',
      });
      return;
    }
    setAppliedCoupon(found);
    setDiscountAmount(disc);
    try {
      localStorage.setItem('checkout-applied-coupon', found.code);
    } catch {}
    toastSuccess({
      title: 'تم تطبيق الكوبون',
      description: `تم خصم ${formatPrice(disc)}`,
    });
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
    try {
      localStorage.removeItem('checkout-applied-coupon');
    } catch {}
  };

  // Recalculate discount when cart or coupon changes
  useEffect(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    setDiscountAmount(calcDiscount(subtotal, appliedCoupon));
  }, [cart, appliedCoupon]);

  // Ensure current shipping selection is valid when methods change
  useEffect(() => {
    if (!uiShippingMethods || uiShippingMethods.length === 0) return;
    const exists = uiShippingMethods.some(m => m.id === shippingMethod);
    if (!exists) {
      setShippingMethod(uiShippingMethods[0].id);
    }
  }, [uiShippingMethods, shippingMethod]);

  const stockKey = (id: string, size?: string) => `${id}:${size || ''}`;
  const getItemStock = (item: CartItemType) =>
    stocks[stockKey(item.id, item.size)] ?? 0;

  // Fetch stock for each cart item (per product+size)
  useEffect(() => {
    if (cart.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const results = await Promise.all(
        cart.map(async item => {
          try {
            const res = await fetch(`/api/products/${item.id}`);
            const data = await res.json();
            let stock = 0;
            if (Array.isArray(data?.variants) && item.size) {
              const v = data.variants.find((x: any) => x.size === item.size);
              stock = Number(v?.stock || 0);
            } else {
              stock = Number(data?.stock || 0);
            }
            return [stockKey(item.id, item.size), stock] as const;
          } catch {
            return [stockKey(item.id, item.size), 0] as const;
          }
        })
      );
      if (!cancelled) {
        const next: Record<string, number> = {};
        results.forEach(([k, s]) => (next[k] = s));
        setStocks(next);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [cart]);

  // Clamp existing cart quantities if they exceed stock when stocks are fetched
  useEffect(() => {
    if (cart.length === 0) return;
    // Wait until we have stock entries for all cart items to avoid clearing cart prematurely
    const ready = cart.every(item =>
      Object.prototype.hasOwnProperty.call(stocks, stockKey(item.id, item.size))
    );
    if (!ready) return;

    let changed = false;
    const adjusted = cart
      .map(item => {
        const key = stockKey(item.id, item.size);
        const stock = stocks[key] ?? 0;
        if (stock <= 0) {
          if (item.quantity !== 0) changed = true;
          return { ...item, quantity: 0 };
        }
        if (item.quantity > stock) {
          changed = true;
          return { ...item, quantity: stock };
        }
        return item;
      })
      .filter(i => i.quantity > 0);
    if (changed) {
      setCart(adjusted);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(adjusted));
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    }
  }, [cart, stocks]);

  const updateQuantity = (
    id: string,
    size: string | undefined,
    quantity: number
  ) => {
    const key = stockKey(id, size);
    const stock = stocks[key] ?? 0;
    if (quantity <= 0 || stock <= 0) {
      removeItem(id, size);
      return;
    }

    const clamped = Math.min(quantity, stock);
    const updatedCart = cart.map(item =>
      item.id === id && (item.size || '') === (size || '')
        ? { ...item, quantity: clamped }
        : item
    );
    setCart(updatedCart);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));

    // Notify header to update cart count
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const removeItem = (id: string, size?: string) => {
    const updatedCart = cart.filter(
      item => !(item.id === id && (item.size || '') === (size || ''))
    );
    setCart(updatedCart);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));

    // Notify header to update cart count
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const clearAll = () => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const updateCart = () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    // Show success message or toast
    toastSuccess({ title: 'تم التحديث', description: 'تم تحديث السلة بنجاح' });
  };

  const validateContactInfo = () => {
    const errors: { [key: string]: string } = {};

    // Check if at least one contact method is provided
    if (!customerInfo.email && !customerInfo.phone) {
      errors.contact = 'يجب إدخال البريد الإلكتروني أو رقم الهاتف';
    }

    // Validate email if provided
    if (
      customerInfo.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)
    ) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }

    // Validate phone if provided
    if (customerInfo.phone && customerInfo.phone.length < 10) {
      errors.phone = 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل';
    }

    // Required fields
    if (!customerInfo.name.trim()) {
      errors.name = 'الاسم مطلوب';
    }
    if (!customerInfo.governorate) {
      errors.governorate = 'اختر المحافظة';
    }
    if (!customerInfo.city) {
      errors.city = 'اختر المدينة';
    }

    // If billing address is different, validate minimal fields
    if (billingDifferent) {
      if (!billingInfo.address.trim()) errors.billingAddress = 'عنوان الفواتير مطلوب';
      if (!billingInfo.governorate) errors.billingGovernorate = 'اختر محافظة الفواتير';
      if (!billingInfo.city) errors.billingCity = 'اختر مدينة الفواتير';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getActiveFreeShippingMin = () => {
    return overrideFreeShippingMin != null
      ? overrideFreeShippingMin
      : settingsFreeShippingMin;
  };

  const getActiveTaxPercent = () => {
    return overrideTaxPercent != null ? overrideTaxPercent : settingsTaxPercent;
  };

  const getShippingCost = () => {
    const method = uiShippingMethods.find(m => m.id === shippingMethod);
    const price = Number(method?.price ?? 75);
    const subtotal = getSubtotal();
    const threshold = getActiveFreeShippingMin();
    const afterDiscount = Math.max(0, subtotal - (discountAmount || 0));
    if (threshold != null && afterDiscount >= Number(threshold)) return 0;
    return price;
  };

  const getTaxAmount = (taxableBase?: number) => {
    const t = getActiveTaxPercent();
    const base =
      taxableBase != null
        ? taxableBase
        : Math.max(0, getSubtotal() - (discountAmount || 0));
    if (t == null) return 0;
    return Math.max(0, Math.round((base * Number(t)) / 100));
  };

  const getTotal = () => {
    const subtotal = getSubtotal();
    const shipping = getShippingCost();
    const taxableBase = Math.max(0, subtotal - (discountAmount || 0));
    const tax = getTaxAmount(taxableBase);
    const total = taxableBase + shipping + tax;
    return total;
  };

  // Shipping ETA helper (heuristic by governorate and method)
  const getEtaText = () => {
    const gov = (customerInfo.governorate || '').toLowerCase();
    const metro = ['cairo', 'giza', 'alexandria', 'qalyubia'].includes(gov);
    const method = String(shippingMethod || 'STANDARD').toUpperCase();
    if (method === 'EXPRESS') return metro ? '1-2 أيام عمل' : '2-3 أيام عمل';
    return metro ? '2-3 أيام عمل' : '3-5 أيام عمل';
  };

  // Smart coupon suggestions
  const computeCouponSuggestions = () => {
    try {
      const subtotal = getSubtotal();
      const active = (adminCoupons || []).filter(isCouponActive);
      const suggestions: Array<{
        type: 'best' | 'threshold';
        code: string;
        message: string;
        discount?: number;
        remaining?: number;
      }> = [];
      // Best immediate discount
      let best: AdminCoupon | null = null;
      let bestDisc = 0;
      for (const c of active) {
        const d = calcDiscount(subtotal, c);
        if (d > bestDisc) {
          bestDisc = d;
          best = c;
        }
      }
      if (
        best &&
        bestDisc > 0 &&
        (!appliedCoupon ||
          best.code.toLowerCase() !== appliedCoupon.code.toLowerCase())
      ) {
        suggestions.push({
          type: 'best',
          code: best.code,
          message: `وفّر ${formatPrice(bestDisc)} باستخدام ${best.code}`,
          discount: bestDisc,
        });
      }
      // Near threshold suggestions
      const near = active
        .filter(c => c.minPurchase && subtotal < (c.minPurchase as number))
        .map(c => ({ c, remaining: (c.minPurchase as number) - subtotal }))
        .filter(
          x => x.remaining > 0 && x.remaining <= Math.max(100, subtotal * 0.25)
        )
        .sort((a, b) => a.remaining - b.remaining)
        .slice(0, 2);
      for (const x of near) {
        suggestions.push({
          type: 'threshold',
          code: x.c.code,
          message: `تبقّى ${formatPrice(x.remaining)} لتفعيل الكود ${x.c.code}`,
          remaining: x.remaining,
        });
      }
      return suggestions;
    } catch {
      return [] as any[];
    }
  };

  const applySpecificCoupon = (code: string) => {
    setCouponCode(code);
    setTimeout(() => {
      applyCoupon();
    }, 0);
  };

  const handleGovernorateChange = (governorateId: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      governorate: governorateId,
      city: '', // Reset city when governorate changes
    }));
  };

  const handleCheckout = async () => {
    if (!customerInfo.name) {
      toastWarning({
        title: 'أكمل البيانات',
        description: 'يرجى إدخال اسم العميل',
      });
      return;
    }

    if (!validateContactInfo()) {
      return;
    }

    if (cart.length === 0) {
      toastInfo({
        title: 'السلة فارغة',
        description: 'أضف منتجات قبل إتمام الطلب',
      });
      return;
    }

    // Analytics: begin checkout
    try {
      const itemsForAnalytics = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
      }));
      trackBeginCheckout({ value: getSubtotal(), items: itemsForAnalytics });
    } catch {}

    setIsCheckingOut(true);

    try {
      // Prepare cart items with proper structure
      const cartItems = cart.map(item => ({
        id: item.id,
        size: item.size || 'M', // Default size if not specified
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        imageUrl: item.imageUrl,
      }));

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartItems,
          customerName: `${customerInfo.name} ${customerInfo.lastName}`.trim(),
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          customerAddress: customerInfo.address?.trim() ? customerInfo.address : undefined,
          customerCity: customerInfo.city?.trim() ? customerInfo.city : undefined,
          customerGovernorate: customerInfo.governorate?.trim() ? customerInfo.governorate : undefined,
          customerPostalCode: customerInfo.postalCode?.trim() ? customerInfo.postalCode : undefined,
          paymentMethod: 'COD',
          shippingMethod: shippingMethod,
          couponCode: appliedCoupon?.code || '',
          discount: discountAmount || 0,
          billingDifferent,
          billingAddress: billingDifferent && billingInfo.address.trim() ? billingInfo.address : undefined,
          billingCity: billingDifferent && billingInfo.city.trim() ? billingInfo.city : undefined,
          billingGovernorate: billingDifferent && billingInfo.governorate.trim() ? billingInfo.governorate : undefined,
          billingPostalCode: billingDifferent && billingInfo.postalCode.trim() ? billingInfo.postalCode : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Persist last order items for purchase tracking on thank-you page
        try {
          sessionStorage.setItem('last-order-items', JSON.stringify(cart));
        } catch {}
        // Clear cart
        setCart([]);
        localStorage.removeItem(CART_STORAGE_KEY);

        // Notify header to update cart count
        window.dispatchEvent(new CustomEvent('cartUpdated'));

        // Redirect to thank you page (fetches details by order id)
        const orderId = data.orderId || data.orderNumber; // backward compatibility
        window.location.href = `/thank-you?order=${encodeURIComponent(
          orderId
        )}`;
      } else {
        toastError({
          title: 'فشل إنشاء الطلب',
          description: data.error || 'حدث خطأ في إنشاء الطلب',
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toastError({
        title: 'فشل إنشاء الطلب',
        description: 'حدث خطأ في إنشاء الطلب',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (hydrated && cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32">
        <div className="mavex-container">
          <div className="text-center py-20">
            <div className="w-32 h-32 mx-auto mb-8 text-gray-300">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h1 className="royal-title text-[#0c1420] mb-8">السلة فارغة</h1>
            <p className="royal-subtitle text-gray-600 mb-16">
              لم تقم بإضافة أي منتجات إلى السلة بعد
            </p>
            <a
              href="/"
              className="bg-[#0c1420] text-white py-4 px-8 rounded-xl font-bold transition-all duration-300 hover:bg-yellow-600 hover:text-[#0c1420] border-2 border-[#0c1420] hover:border-yellow-600 transform hover:scale-105 shadow-lg hover:shadow-2xl"
            >
              تصفح منتجات Mavex
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32">
        <div className="mavex-container">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Free shipping banner helpers
  const freeMin = getActiveFreeShippingMin();
  const subtotalAfterDiscount = Math.max(
    0,
    getSubtotal() - (discountAmount || 0)
  );
  const remainingForFree =
    freeMin != null ? Math.max(0, Number(freeMin) - subtotalAfterDiscount) : 0;
  const progressPct =
    freeMin != null && Number(freeMin) > 0
      ? Math.min(
          100,
          Math.round((subtotalAfterDiscount / Number(freeMin)) * 100)
        )
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-28 md:pb-36">
      <div className="mavex-container">
        {/* Free shipping banner */}
        {cart.length > 0 && freeMin != null && remainingForFree > 0 && (
          <div
            className="mb-6 rounded-2xl overflow-hidden border"
            style={{ borderColor: 'var(--brand-primary, #0c1420)' }}
          >
            <div
              className="p-4"
              style={{
                background:
                  'color-mix(in oklab, var(--brand-primary, #0c1420) 95%, white)',
              }}
            >
              <div className="flex items-center justify-between gap-4 text-white">
                <div className="font-extrabold">
                  🎉 باقي لك {formatPrice(remainingForFree)} للحصول على شحن
                  مجاني
                </div>
                <div className="text-white/80 text-sm">
                  الحد: {formatPrice(Number(freeMin))}
                </div>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{
                    width: `${progressPct}%`,
                    transition: 'width 500ms ease',
                  }}
                />
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Checkout Form - Left Side (65%) */}
          <div className="lg:col-span-2">
            <div
              className="bg-white rounded-2xl shadow-xl border-2 overflow-hidden"
              style={{ borderColor: 'var(--brand-primary, #0c1420)' }}
            >
              {/* Header with Mavex Logo */}
              <div className="p-6 border-b-2 border-gray-100">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-[#0c1420]">MAVEX</h1>
                </div>
                {/* Progress Stepper */}
                <div className="mt-5">
                  {(() => {
                    const isContactValid =
                      (!!customerInfo.email || !!customerInfo.phone) &&
                      !validationErrors.contact &&
                      (!customerInfo.email ||
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                          customerInfo.email
                        )) &&
                      (!customerInfo.phone || customerInfo.phone.length >= 10);
                    const isDeliveryValid =
                      !!customerInfo.name &&
                      !!customerInfo.governorate &&
                      !!customerInfo.city;
                    const isPaymentValid = true; // COD only
                    const steps = [
                      {
                        key: 'contact',
                        label: 'البيانات',
                        done: isContactValid,
                        icon: <User className="w-4 h-4" />,
                      },
                      {
                        key: 'delivery',
                        label: 'التوصيل',
                        done: isDeliveryValid,
                        icon: <MapPin className="w-4 h-4" />,
                      },
                      {
                        key: 'payment',
                        label: 'الدفع',
                        done: isPaymentValid,
                        icon: <CreditCard className="w-4 h-4" />,
                      },
                      {
                        key: 'review',
                        label: 'المراجعة',
                        done: false,
                        icon: <CheckCircle2 className="w-4 h-4" />,
                      },
                    ];
                    const activeIndex = steps.findIndex(s => !s.done);
                    return (
                      <ol className="grid grid-cols-4 gap-2">
                        {steps.map((s, idx) => {
                          const active =
                            idx === (activeIndex === -1 ? 3 : activeIndex);
                          const state = s.done
                            ? 'done'
                            : active
                            ? 'active'
                            : 'todo';
                          return (
                            <li
                              key={s.key}
                              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-extrabold transition-colors ${
                                state === 'done'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : state === 'active'
                                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                                  : 'bg-white border-gray-200 text-gray-500'
                              }`}
                            >
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${
                                  state === 'done'
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : state === 'active'
                                    ? 'bg-yellow-500 text-[#0c1420] border-yellow-500'
                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span className="hidden sm:inline-flex items-center gap-1">
                                {s.icon}
                                {s.label}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    );
                  })()}
                </div>
              </div>

              {/* Contact Section */}
              <div className="p-8 border-b-2 border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#0c1420]">
                    معلومات الاتصال
                  </h2>
                  <button className="text-yellow-600 hover:text-yellow-700 font-medium">
                    انضم الآن ✨
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="البريد الإلكتروني أو رقم الهاتف"
                      value={customerInfo.email || customerInfo.phone}
                      onChange={e => {
                        const value = e.target.value;
                        if (value.includes('@')) {
                          setCustomerInfo({
                            ...customerInfo,
                            email: value,
                            phone: '',
                          });
                        } else {
                          setCustomerInfo({
                            ...customerInfo,
                            phone: value,
                            email: '',
                          });
                        }
                        setValidationErrors(prev => ({
                          ...prev,
                          contact: '',
                          email: '',
                          phone: '',
                        }));
                      }}
                      className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300 ${
                        validationErrors.contact ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors.contact && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <span>⚠️</span>
                        {validationErrors.contact}
                      </p>
                    )}
                  </div>
                  <label className="flex items-center space-x-3 space-x-reverse">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    <span className="text-gray-700">
                      أرسل لي أخبار وعروض عبر البريد الإلكتروني
                    </span>
                  </label>
                </div>
              </div>

              {/* Delivery Section */}
              <div className="p-8 border-b-2 border-gray-100">
                <h2 className="text-2xl font-bold text-[#0c1420] mb-6">
                  معلومات التوصيل
                </h2>
                <div className="space-y-4">
                  <div>
                    <Select value="egypt" disabled>
                      <SelectTrigger className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300">
                        <SelectValue placeholder="البلد/المنطقة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="egypt">مصر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="الاسم الأول"
                      value={customerInfo.name}
                      onChange={e =>
                        setCustomerInfo({
                          ...customerInfo,
                          name: e.target.value,
                        })
                      }
                      className={`px-4 py-3 border-2 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300 ${
                        validationErrors.name
                          ? 'border-red-500'
                          : 'border-gray-200'
                      }`}
                      required
                    />
                    {validationErrors.name && (
                      <p className="col-span-2 text-red-500 text-sm mt-1">
                        {validationErrors.name}
                      </p>
                    )}
                    <input
                      type="text"
                      placeholder="الاسم الأخير"
                      value={customerInfo.lastName}
                      onChange={e =>
                        setCustomerInfo({
                          ...customerInfo,
                          lastName: e.target.value,
                        })
                      }
                      className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="العنوان"
                      value={customerInfo.address}
                      onChange={e =>
                        setCustomerInfo({
                          ...customerInfo,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="الشقة، المبنى، إلخ (اختياري)"
                      value={customerInfo.apartment}
                      onChange={e =>
                        setCustomerInfo({
                          ...customerInfo,
                          apartment: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Select
                      value={customerInfo.city}
                      onValueChange={value =>
                        setCustomerInfo({ ...customerInfo, city: value })
                      }
                    >
                      <SelectTrigger className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300">
                        <SelectValue placeholder="المدينة" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerInfo.governorate &&
                          getCitiesByGovernorate(customerInfo.governorate).map(
                            city => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            )
                          )}
                      </SelectContent>
                    </Select>
                    {validationErrors.city && (
                      <p className="text-red-500 text-sm mt-1 col-span-1">
                        {validationErrors.city}
                      </p>
                    )}
                    <Select
                      value={customerInfo.governorate}
                      onValueChange={handleGovernorateChange}
                    >
                      <SelectTrigger className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300">
                        <SelectValue placeholder="المحافظة" />
                      </SelectTrigger>
                      <SelectContent>
                        {egyptGovernorates.map(governorate => (
                          <SelectItem
                            key={governorate.id}
                            value={governorate.id}
                          >
                            {governorate.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.governorate && (
                      <p className="text-red-500 text-sm mt-1 col-span-1">
                        {validationErrors.governorate}
                      </p>
                    )}
                    <input
                      type="text"
                      placeholder="الرمز البريدي (اختياري)"
                      value={customerInfo.postalCode}
                      onChange={e =>
                        setCustomerInfo({
                          ...customerInfo,
                          postalCode: e.target.value,
                        })
                      }
                      className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                    />
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="tel"
                      placeholder="رقم الهاتف"
                      value={customerInfo.phone}
                      onChange={e => {
                        setCustomerInfo({
                          ...customerInfo,
                          phone: e.target.value,
                        });
                        setValidationErrors(prev => ({
                          ...prev,
                          contact: '',
                          phone: '',
                        }));
                      }}
                      className={`flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300 ${
                        validationErrors.phone ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    <button className="text-gray-500 hover:text-gray-700">
                      <HelpCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <label className="flex items-center space-x-3 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={saveInfo}
                      onChange={e => setSaveInfo(e.target.checked)}
                      className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    <span className="text-gray-700">
                      احفظ هذه المعلومات للمرة القادمة
                    </span>
                  </label>
                </div>
              </div>

              {/* Shipping Method */}
              <div className="p-8 border-b-2 border-gray-100">
                <h2 className="text-2xl font-bold text-[#0c1420] mb-2">
                  طريقة الشحن
                </h2>
                {freeMin != null && remainingForFree === 0 && (
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm">
                    ✅ شحن مجاني متاح
                  </div>
                )}
                {freeMin != null &&
                  remainingForFree > 0 &&
                  progressPct >= 60 &&
                  progressPct < 100 && (
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-bold text-sm">
                      ⏳ اقتربت من الشحن المجاني — تبقّى{' '}
                      {formatPrice(remainingForFree)}
                    </div>
                  )}
                <div className="mb-4 text-sm text-gray-600">
                  التسليم المتوقع:{' '}
                  <span className="font-bold text-[#0c1420]">
                    {getEtaText()}
                  </span>
                </div>
                <RadioGroup
                  value={shippingMethod}
                  onValueChange={setShippingMethod}
                  className="space-y-4"
                >
                  {uiShippingMethods.map(method => (
                    <div
                      key={method.id}
                      className={`border-2 rounded-xl p-4 transition-all duration-300 ${
                        shippingMethod === method.id ? '' : 'border-gray-200'
                      }`}
                      style={
                        shippingMethod === method.id
                          ? {
                              borderColor: 'var(--brand-primary, #0c1420)',
                              background: '#0000',
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <div>
                            <label
                              htmlFor={method.id}
                              className="font-medium text-[#0c1420] cursor-pointer"
                            >
                              {method.name}
                            </label>
                            {method.description && (
                              <p className="text-sm text-gray-600">
                                {method.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-[#0c1420]">
                          {formatPrice(method.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Payment Section */}
              <div className="p-8 border-b-2 border-gray-100">
                <h2 className="text-2xl font-bold text-[#0c1420] mb-6">
                  طريقة الدفع
                </h2>
                <p className="text-gray-600 mb-4">
                  جميع المعاملات آمنة ومشفرة.
                </p>
                <div
                  className="border-2 rounded-xl p-4"
                  style={{
                    borderColor: 'var(--brand-primary, #0c1420)',
                    background: '#f6f7f9',
                  }}
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={true}
                      readOnly
                      className="w-4 h-4 text-[#0c1420] border-gray-300 focus:ring-[#0c1420]"
                    />
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="text-lg">💵</span>
                      <span className="font-medium text-[#0c1420]">
                        الدفع عند الاستلام (COD)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="p-8 border-b-2 border-gray-100">
                <h2 className="text-2xl font-bold text-[#0c1420] mb-6">
                  عنوان الفواتير
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="billing"
                        checked={!billingDifferent}
                        onChange={() => setBillingDifferent(false)}
                        className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-yellow-500"
                      />
                      <span className="text-gray-700">نفس عنوان الشحن</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="billing"
                        checked={billingDifferent}
                        onChange={() => setBillingDifferent(true)}
                        className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-yellow-500"
                      />
                      <span className="text-gray-700">استخدم عنوان فواتير مختلف</span>
                    </label>
                  </div>

                  {billingDifferent && (
                    <div className="space-y-4 animate-[fadeUp_.25s_ease-out_both]">
                      <div>
                        <input
                          type="text"
                          placeholder="عنوان الفواتير"
                          value={billingInfo.address}
                          onChange={e => setBillingInfo({ ...billingInfo, address: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300 ${
                            validationErrors.billingAddress ? 'border-red-500' : 'border-gray-200'
                          }`}
                        />
                        {validationErrors.billingAddress && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.billingAddress}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <Select
                          value={billingInfo.city}
                          onValueChange={value => setBillingInfo({ ...billingInfo, city: value })}
                        >
                          <SelectTrigger className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300">
                            <SelectValue placeholder="مدينة الفواتير" />
                          </SelectTrigger>
                          <SelectContent>
                            {billingInfo.governorate &&
                              getCitiesByGovernorate(billingInfo.governorate).map(city => (
                                <SelectItem key={city} value={city}>
                                  {city}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {validationErrors.billingCity && (
                          <p className="text-red-500 text-sm mt-1 col-span-1">{validationErrors.billingCity}</p>
                        )}

                        <Select
                          value={billingInfo.governorate}
                          onValueChange={value => setBillingInfo({ ...billingInfo, governorate: value, city: '' })}
                        >
                          <SelectTrigger className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300">
                            <SelectValue placeholder="محافظة الفواتير" />
                          </SelectTrigger>
                          <SelectContent>
                            {egyptGovernorates.map(g => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {validationErrors.billingGovernorate && (
                          <p className="text-red-500 text-sm mt-1 col-span-1">{validationErrors.billingGovernorate}</p>
                        )}

                        <input
                          type="text"
                          placeholder="الرمز البريدي (اختياري)"
                          value={billingInfo.postalCode}
                          onChange={e => setBillingInfo({ ...billingInfo, postalCode: e.target.value })}
                          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Order Button */}
              <div className="p-8">
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full btn-gold-gradient py-6 px-8 rounded-2xl font-extrabold text-xl transition-transform duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isCheckingOut ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      جاري إتمام الطلب...
                    </>
                  ) : (
                    <>
                      <span>إتمام الطلب</span>
                      <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary - Right Side (35%) */}
          <div ref={summaryContainerRef} className="lg:col-span-1 relative">
            <div
              ref={summaryCardRef}
              className="bg-white rounded-2xl shadow-xl border-2 p-8 md:max-h-[calc(100vh-7rem)] lg:max-h-[calc(100vh-8rem)] md:overflow-auto"
              style={{
                borderColor: 'var(--brand-primary, #0c1420)',
                position:
                  summaryMode === 'fixed'
                    ? 'fixed'
                    : summaryMode === 'bottom'
                    ? 'absolute'
                    : undefined,
                top: summaryMode === 'fixed' ? summaryTopOffset : undefined,
                bottom: summaryMode === 'bottom' ? 0 : undefined,
                left:
                  summaryMode === 'fixed'
                    ? summaryLeft
                    : summaryMode === 'bottom'
                    ? 0
                    : undefined,
                width: summaryMode === 'fixed' ? summaryWidth : undefined,
              }}
            >
              <h2 className="text-2xl font-bold text-[#0c1420] mb-6">
                ملخص الطلب
              </h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cart.map((item, idx) => (
                  <div
                    key={`${item.id}:${item.size || ''}`}
                    className="flex items-center space-x-4 space-x-reverse p-3 border border-gray-200 rounded-lg hover:border-yellow-300 transition-all duration-300"
                  >
                    <div className="relative">
                      <ImageWithFallback
                        src={item.imageUrl}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="absolute -top-2 -right-2 bg-yellow-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-[#0c1420] text-sm">
                        {item.name}
                      </h3>
                      <p className="text-xs text-gray-600">
                        أسود / {item.size || 'M'} / Unisex
                      </p>
                      <p className="text-xs mt-1">
                        <span className="text-gray-500">المتاح:</span>{' '}
                        <span className="font-semibold text-[#0c1420]">
                          {getItemStock(item)}
                        </span>
                      </p>
                      <p className="text-sm font-bold text-yellow-600">
                        <AnimatedNumber
                          value={item.price * item.quantity}
                          formatter={formatPrice}
                        />
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.size, item.quantity - 1)
                        }
                        className="w-6 h-6 bg-gray-100 hover:bg-yellow-100 text-gray-600 hover:text-yellow-600 rounded-full flex items-center justify-center transition-all duration-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold text-[#0c1420] min-w-[20px] text-center">
                        <AnimatedNumber value={item.quantity} />
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.size, item.quantity + 1)
                        }
                        disabled={item.quantity >= getItemStock(item)}
                        className="w-6 h-6 bg-gray-100 hover:bg-yellow-100 text-gray-600 hover:text-yellow-600 rounded-full flex items-center justify-center transition-all duration-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id, item.size)}
                        className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-full flex items-center justify-center transition-all duration-300"
                        title="حذف المنتج"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#0c1420] mb-2">
                  كوبون الخصم
                </label>
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="ادخل الكود"
                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all"
                  />
                  <button
                    onClick={applyCoupon}
                    className="px-4 py-2 rounded-xl text-white font-bold transition-all"
                    style={{ background: 'var(--brand-primary, #0c1420)' }}
                  >
                    تطبيق
                  </button>
                  {appliedCoupon && (
                    <button
                      onClick={clearCoupon}
                      className="px-3 py-2 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                      title="مسح الكوبون"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="text-sm text-emerald-700 mt-2">
                    تم تطبيق الكوبون:{' '}
                    <span className="font-bold">{appliedCoupon.code}</span>
                  </p>
                )}
                {(() => {
                  const sugg = computeCouponSuggestions();
                  if (!sugg || sugg.length === 0) return null;
                  return (
                    <div className="mt-3 space-y-2">
                      {sugg.map((s, i) => (
                        <div
                          key={`${s.code}-${i}`}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                        >
                          <div className="text-sm text-gray-700">
                            {s.message}
                          </div>
                          <button
                            onClick={() => applySpecificCoupon(s.code)}
                            className="px-3 py-1.5 rounded-lg text-white text-sm font-bold"
                            style={{
                              background: 'var(--brand-primary, #0c1420)',
                            }}
                          >
                            تطبيق
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Price Breakdown */}
              <div className="border-t-2 border-gray-100 pt-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">المجموع الفرعي</span>
                  <span className="font-bold text-[#0c1420]">
                    <AnimatedNumber
                      value={getSubtotal()}
                      formatter={formatPrice}
                    />
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>الخصم</span>
                    <span className="font-bold">
                      -{' '}
                      <AnimatedNumber
                        value={discountAmount}
                        formatter={formatPrice}
                      />
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">الشحن</span>
                  {getShippingCost() === 0 ? (
                    <span className="font-bold text-emerald-700">
                      شحن مجاني
                    </span>
                  ) : (
                    <span className="font-bold text-[#0c1420]">
                      <AnimatedNumber
                        value={getShippingCost()}
                        formatter={formatPrice}
                      />
                    </span>
                  )}
                </div>
                {/* Tax */}
                {(() => {
                  const taxableBase = Math.max(
                    0,
                    getSubtotal() - (discountAmount || 0)
                  );
                  const tax = getTaxAmount(taxableBase);
                  return tax > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">الضريبة</span>
                      <span className="font-bold text-[#0c1420]">
                        <AnimatedNumber value={tax} formatter={formatPrice} />
                      </span>
                    </div>
                  ) : null;
                })()}
                <div className="border-t-2 border-gray-100 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-[#0c1420]">المجموع</span>
                    <span className="text-[#0c1420]">
                      <AnimatedNumber
                        value={getTotal()}
                        formatter={formatPrice}
                      />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
