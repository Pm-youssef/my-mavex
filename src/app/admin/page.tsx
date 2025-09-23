'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
 
import LocalImagePicker from '@/components/LocalImagePicker';
import { FALLBACK_IMAGE_URL } from '@/lib/constants';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface VariantForm {
  size: string;
  stock: string; // نستخدم نص لتسهيل الإدخال ثم نحوّل لأرقام عند الإرسال
  minDisplayStock: string;
}

interface ProductVariant {
  id: string;
  size: string;
  stock: number;
  minDisplayStock: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  imageUrl: string;
  hoverImageUrl?: string; // صورة عند hover
  thumbnailUrl?: string;
  image2Url?: string;
  image3Url?: string;
  stock: number;
  features?: string[];
  variants?: ProductVariant[];
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'price' | 'stock'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<'ALL'|'IN'|'OUT'>('ALL');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [hasDiscount, setHasDiscount] = useState<boolean>(false);
  const [showImageNote, setShowImageNote] = useState<boolean>(true);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [discountEndsAt, setDiscountEndsAt] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    originalPrice: '',
    discountedPrice: '',
    imageUrl: '',
    hoverImageUrl: '', // صورة عند hover
    thumbnailUrl: '',
    image2Url: '',
    image3Url: '',
    stock: '',
    featuresText: '', // سطر لكل نقطة
  });
  const [variants, setVariants] = useState<VariantForm[]>([
    { size: '', stock: '0', minDisplayStock: '0' },
  ]);
  const [imageError, setImageError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Initialize dismissible note
  useEffect(() => {
    try {
      const v = localStorage.getItem('admin-products-image-note-dismissed');
      setShowImageNote(v !== '1');
    } catch {}
  }, []);

  // Check admin session on mount
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/admin/session', { cache: 'no-store' });
        const data = await res.json();
        setIsAuthenticated(Boolean(data?.isAuthenticated));
      } catch {
        setIsAuthenticated(false);
      }
    };
    check();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchCategories();
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        const err = await res.json().catch(() => ({}));
        toastError({ title: 'فشل الدخول', description: err?.error || 'كلمة المرور غير صحيحة' });
      }
    } catch {
      toastError({ title: 'خطأ', description: 'خطأ في تسجيل الدخول' });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      setIsAuthenticated(false);
      setPassword('');
      toastSuccess({ title: 'تم تسجيل الخروج', description: 'تم إنهاء الجلسة بنجاح' });
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const response = await fetch('/api/products', { cache: 'no-store' });
      const data = await response.json();
      const normalized = Array.isArray(data)
        ? data
            .map((p: any) => ({
              ...p,
              originalPrice: Number(p?.originalPrice ?? p?.price ?? 0) || 0,
              discountedPrice:
                Number(
                  p?.discountedPrice ?? p?.originalPrice ?? p?.price ?? 0
                ) || 0,
              stock: Number(p?.stock ?? 0) || 0,
            }))
            .filter((p: any) => p && typeof p.id === 'string')
        : [];
      setProducts(normalized);
    } catch (error) {
      console.error('Error fetching products:', error);
      toastError({ title: 'خطأ', description: 'تعذّر جلب المنتجات' });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Load categories for the optional category selector
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories?page=1&pageSize=100', { cache: 'no-store' });
      const j = await res.json();
      const items = Array.isArray(j?.items) ? j.items : [];
      setCategories(items.map((c: any) => ({ id: String(c.id), name: String(c.name) })));
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      setFieldErrors({});
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const submitter = (e as any).nativeEvent?.submitter as (HTMLButtonElement | undefined);
      const action = submitter?.dataset?.action || 'save';

      // حوّل النص إلى قائمة نقاط (حد أقصى 12)
      const features = (formData.featuresText || '')
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 12);

      const payload: any = {
        name: formData.name,
        description: formData.description,
        originalPrice: parseFloat(formData.originalPrice) || 0,
        imageUrl: formData.imageUrl,
        hoverImageUrl: formData.hoverImageUrl, // إضافة hoverImageUrl
        thumbnailUrl: formData.thumbnailUrl,
        image2Url: formData.image2Url,
        image3Url: formData.image3Url,
        stock: parseInt(formData.stock) || 0,
      };

      // Optional discount handling
      const originalPriceNum = parseFloat(formData.originalPrice) || 0;
      const hasDisc = hasDiscount && String(formData.discountedPrice || '').trim() !== '';
      if (hasDisc) {
        const d = parseFloat(formData.discountedPrice);
        if (!isFinite(d) || d <= 0 || d >= originalPriceNum) {
          toastError({ title: 'قيمة خصم غير صالحة', description: 'يجب أن يكون سعر ما بعد الخصم أقل من السعر قبل الخصم وأكبر من 0.' });
          setIsSaving(false);
          return;
        }
        payload.discountedPrice = d;
      }

      // Optional: category and discount end date
      if (categoryId) payload.categoryId = categoryId;
      if (discountEndsAt && hasDiscount) payload.discountEndsAt = discountEndsAt;

      // أرسل المقاسات إذا كان هناك أي مخزون > 0 أو حد أدنى > 0 (وبحجم صالح)
      const cleanedVariants = variants
        .map(v => ({
          size: String(v.size || '').trim(),
          stock: Number(v.stock) || 0,
          minDisplayStock: Number(v.minDisplayStock) || 0,
        }))
        .filter(v => v.size.length > 0 && (v.stock > 0 || v.minDisplayStock > 0));

      // منع تكرار المقاسات
      const seen = new Set<string>();
      for (const v of cleanedVariants) {
        const key = v.size.toLowerCase();
        if (seen.has(key)) {
          toastError({ title: 'مقاسات مكررة', description: `المقاس "${v.size}" مكرر. يرجى تعديل المقاسات.` });
          setIsSaving(false);
          return;
        }
        seen.add(key);
      }

      // Variants: when editing, always send the array (even if empty) to allow clearing variants
      if (editingProduct) {
        payload.variants = cleanedVariants;
      } else if (cleanedVariants.length > 0) {
        payload.variants = cleanedVariants;
      }

      // عند التعديل: أرسل دائمًا المصفوفة حتى لو كانت فارغة لمسح المميزات
      // عند الإضافة: أرسل فقط إذا كانت غير فارغة
      if (editingProduct) {
        payload.features = features;
      } else if (features.length > 0) {
        payload.features = features;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchProducts();
        setFormData({
          name: '',
          description: '',
          originalPrice: '',
          discountedPrice: '',
          imageUrl: '',
          hoverImageUrl: '', // إعادة تهيئة hoverImageUrl
          thumbnailUrl: '',
          image2Url: '',
          image3Url: '',
          stock: '',
          featuresText: '',
        });
        setVariants([{ size: '', stock: '0', minDisplayStock: '0' }]);

        // After save: if adding new or user chose Save & Add Another, clear editing. Otherwise keep editing mode.
        if (action === 'save_new' || method === 'POST') {
          setEditingProduct(null);
        }
        toastSuccess({ title: 'تم الحفظ', description: editingProduct ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح' });
        setIsSaving(false);
      } else {
        const err = await response.json().catch(() => ({}));
        if (err && typeof err === 'object') {
          setFieldErrors((err as any).fieldErrors || {});
        }
        toastError({ title: 'خطأ في الحفظ', description: err?.error || 'فشل حفظ المنتج' });
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toastError({ title: 'خطأ', description: 'حدث خطأ في حفظ المنتج' });
      setIsSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      originalPrice: product.originalPrice.toString(),
      discountedPrice: product.discountedPrice.toString(),
      imageUrl: product.imageUrl,
      hoverImageUrl: product.hoverImageUrl || '', // تعبئة hoverImageUrl
      thumbnailUrl: product.thumbnailUrl || '',
      image2Url: product.image2Url || '',
      image3Url: product.image3Url || '',
      stock: product.stock.toString(),
      featuresText: Array.isArray(product.features) ? product.features.join('\n') : '',
    });
    // عبّئ المقاسات إن وجدت (ديناميكيًا من المنتج)
    setHasDiscount(Number(product.discountedPrice) < Number(product.originalPrice));
    setCategoryId((product as any).categoryId || '');
    try {
      const d = (product as any).discountEndsAt ? new Date((product as any).discountEndsAt) : null;
      setDiscountEndsAt(d ? d.toISOString().slice(0,10) : '');
    } catch { setDiscountEndsAt(''); }
    if (product.variants && product.variants.length > 0) {
      const mapped = product.variants.map(v => ({ size: v.size, stock: String(v.stock), minDisplayStock: String(v.minDisplayStock) })) as VariantForm[];
      setVariants(mapped);
    } else {
      setVariants([{ size: '', stock: '0', minDisplayStock: '0' }]);
    }
  };

  const handleImageChange = (imageUrl: string) => {
    setFormData({ ...formData, imageUrl });
  };
  const handleHoverImageChange = (hoverImageUrl: string) => {
    setFormData({ ...formData, hoverImageUrl });
  };

  const handleDuplicate = (product: Product) => {
    // Treat as new product with pre-filled data
    setEditingProduct(null);
    setFormData({
      name: product.name + ' (نسخة)',
      description: product.description,
      originalPrice: String(product.originalPrice || ''),
      discountedPrice: String(product.discountedPrice || ''),
      imageUrl: product.imageUrl,
      hoverImageUrl: product.hoverImageUrl || '',
      thumbnailUrl: product.thumbnailUrl || '',
      image2Url: product.image2Url || '',
      image3Url: product.image3Url || '',
      stock: String(product.stock || ''),
      featuresText: Array.isArray(product.features) ? product.features.join('\n') : '',
    });
    if (product.variants && product.variants.length) {
      const mapped = product.variants.map(v => ({ size: v.size, stock: String(v.stock), minDisplayStock: String(v.minDisplayStock) }));
      setVariants(mapped as VariantForm[]);
    }
    toastSuccess({ title: 'تم النسخ', description: 'تم نسخ بيانات المنتج، قم بالحفظ لإضافة نسخة.' });
  };

  const handleDelete = (productId: string) => {
    setConfirmDeleteId(productId);
  };

  const confirmDelete = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchProducts();
        setConfirmDeleteId(null);
        toastSuccess({ title: 'تم الحذف', description: 'تم حذف المنتج بنجاح' });
      } else {
        const err = await response.json().catch(() => ({}));
        toastError({ title: 'فشل الحذف', description: err?.error || 'حدث خطأ في حذف المنتج' });
      }
    } catch (error) {
      toastError({ title: 'خطأ', description: 'حدث خطأ في حذف المنتج' });
    }
  };

  const cancelDelete = () => setConfirmDeleteId(null);

  const handleImageError = () => {
    setImageError(true);
  };
  // Export helpers
  const exportCSV = (rows: Product[]) => {
    const headers = ['id','name','price','discountedPrice','stock'];
    const dataRows = rows.map(p => [p.id, p.name, String(p.originalPrice), String(p.discountedPrice), String(p.stock)]);
    const csv = [headers.join(','), ...dataRows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const exportJSON = (rows: Product[]) => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'products.json'; a.click(); URL.revokeObjectURL(url);
  };

  const productToDelete = useMemo(() => {
    return confirmDeleteId ? (products.find(p => p.id === confirmDeleteId) || null) : null;
  }, [products, confirmDeleteId]);

  // Derived dataset: filter, sort, paginate
  const lowerQ = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!lowerQ) return products;
    return products.filter(p =>
      (p.name || '').toLowerCase().includes(lowerQ) ||
      (p.description || '').toLowerCase().includes(lowerQ)
    );
  }, [products, lowerQ]);

  const stockFiltered = useMemo(() => {
    if (stockFilter === 'ALL') return filteredProducts;
    return filteredProducts.filter(p => (stockFilter === 'IN' ? p.stock > 0 : p.stock <= 0));
  }, [filteredProducts, stockFilter]);

  const priceFiltered = useMemo(() => {
    const min = minPrice !== '' ? Number(minPrice) : null;
    const max = maxPrice !== '' ? Number(maxPrice) : null;
    if (min == null && max == null) return stockFiltered;
    return stockFiltered.filter(p => {
      const price = Number(p.discountedPrice || p.originalPrice || 0);
      if (min != null && price < min) return false;
      if (max != null && price > max) return false;
      return true;
    });
  }, [stockFiltered, minPrice, maxPrice]);

  const sortedProducts = useMemo(() => {
    const arr = [...priceFiltered];
    arr.sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === 'name') { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase(); }
      else if (sortKey === 'price') { av = Number(a.discountedPrice || a.originalPrice || 0); bv = Number(b.discountedPrice || b.originalPrice || 0); }
      else { av = Number(a.stock || 0); bv = Number(b.stock || 0); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [priceFiltered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIdx = (clampedPage - 1) * pageSize;
  const displayedProducts = sortedProducts.slice(startIdx, startIdx + pageSize);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32">
        <div className="mavex-container">
          <div className="max-w-md mx-auto">
            <div className="modern-card">
              <div className="text-center mb-8">
                <div className="royal-divider mb-8"></div>
                <h1 className="royal-title text-black mb-8">
                  لوحة <span className="mavex-gold-text">الإدارة</span>
                </h1>
                <p className="royal-subtitle text-gray-600">
                  أدخل كلمة المرور للوصول إلى لوحة الإدارة
                </p>
                <div className="royal-divider mt-8"></div>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleLogin();
                }}
              >
                <div className="mb-8">
                  <label className="mavex-label text-black">كلمة المرور</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="mavex-input focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="text-white py-4 px-8 rounded-xl font-bold transition-all duration-300 border-2 transform hover:scale-105 shadow-lg hover:shadow-2xl"
                  style={{ background: 'var(--brand-primary, #0c1420)', borderColor: 'var(--brand-primary, #0c1420)' }}
                >
                  دخول
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-32">
      <div className="mavex-container">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="royal-divider"></div>
          <h1 className="royal-title text-black mb-8">
            لوحة <span className="mavex-gold-text">الإدارة</span>
          </h1>
          <p className="royal-subtitle text-gray-600">
            إدارة المنتجات والمخزون
          </p>

          <div className="flex justify-center space-x-6 space-x-reverse mt-12">
            <button
              onClick={handleLogout}
              className="bg-gray-600 hover:bg-gray-700 text-white py-4 px-8 rounded-xl font-bold transition-all duration-300 border-2 border-gray-600 hover:border-gray-700 transform hover:scale-105 shadow-lg hover:shadow-2xl"
            >
              تسجيل خروج
            </button>
            <Link
              href="/admin/orders"
              className="text-white py-4 px-8 rounded-xl font-bold transition-all duration-300 border-2 transform hover:scale-105 shadow-lg hover:shadow-2xl"
              style={{ background: 'var(--brand-primary, #0c1420)', borderColor: 'var(--brand-primary, #0c1420)' }}
            >
              عرض الطلبات
            </Link>
            <Link
              href="/admin/messages"
              className="text-white py-4 px-8 rounded-xl font-bold transition-all duration-300 border-2 transform hover:scale-105 shadow-lg hover:shadow-2xl"
              style={{ background: 'var(--brand-primary, #0c1420)', borderColor: 'var(--brand-primary, #0c1420)' }}
            >
              رسائل التواصل
            </Link>
            <Link
              href="/admin/reviews"
              className="text-white py-4 px-8 rounded-xl font-bold transition-all duration-300 border-2 transform hover:scale-105 shadow-lg hover:shadow-2xl"
              style={{ background: 'var(--brand-primary, #0c1420)', borderColor: 'var(--brand-primary, #0c1420)' }}
            >
              إدارة التعليقات
            </Link>
          </div>
          <div className="royal-divider mt-12"></div>
        </div>

        {/* Add/Edit Product Form */}
        <div className="modern-card mb-16">
          <h2 className="text-3xl font-bold text-black mb-12 border-b-2 pb-6" style={{ borderColor: 'var(--brand-primary, #0c1420)' }}>
            {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
          </h2>

          {showImageNote && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8 relative rounded-xl">
            <button
              type="button"
              aria-label="إغلاق"
              className="absolute top-2 left-2 text-blue-500 hover:text-blue-700"
              onClick={() => { setShowImageNote(false); try { localStorage.setItem('admin-products-image-note-dismissed', '1'); } catch {} }}
            >×</button>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>ملاحظة مهمة:</strong>
                  <br />• أدخل روابط الصور مباشرة في الحقول المخصّصة.
                  <br />• يُفضّل استخدام صور منسّقة بالحجم المناسب للأداء الجيد.
                </p>
              </div>
            </div>
          </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* الحقول الأساسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="mavex-label text-black">اسم المنتج</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mavex-input focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  placeholder="أدخل اسم المنتج"
                  required
                />
                {fieldErrors.name && (
                  <div className="text-xs text-red-600 mt-1">{fieldErrors.name}</div>
                )}
              </div>

              <div>
                <label className="mavex-label text-black">المخزون</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={e =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  className="mavex-input focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  placeholder="أدخل كمية المخزون"
                  required
                />
                {fieldErrors.stock && (
                  <div className="text-xs text-red-600 mt-1">{fieldErrors.stock}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="mavex-label text-black">
                  السعر قبل الخصم
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={e =>
                    setFormData({ ...formData, originalPrice: e.target.value })
                  }
                  className="mavex-input focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  placeholder="مثال: 800"
                  required
                />
                {fieldErrors.originalPrice && (
                  <div className="text-xs text-red-600 mt-1">{fieldErrors.originalPrice}</div>
                )}
              </div>
              <div>
                <label className="mavex-label text-black flex items-center gap-2">
                  يوجد خصم؟
                  <input type="checkbox" checked={hasDiscount} onChange={(e)=> setHasDiscount(e.target.checked)} />
                </label>
                {hasDiscount && (
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discountedPrice}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        discountedPrice: e.target.value,
                      })
                    }
                    className="mavex-input focus:border-brand-500 focus:ring-2 focus:ring-brand-200 mt-2"
                    placeholder="مثال: 600"
                  />
                )}
                {hasDiscount && fieldErrors.discountedPrice && (
                  <div className="text-xs text-red-600 mt-1">{fieldErrors.discountedPrice}</div>
                )}
                {hasDiscount && (
                  <>
                    {(() => {
                      const op = parseFloat(formData.originalPrice || '');
                      const dp = parseFloat(formData.discountedPrice || '');
                      if (!isFinite(op) || op <= 0 || !isFinite(dp) || dp <= 0) return null;
                      const invalid = dp >= op;
                      if (invalid) {
                        return <p className="text-red-600 text-xs mt-1">يجب أن يكون السعر بعد الخصم أقل من السعر قبل الخصم.</p>;
                      }
                      const pct = Math.round((1 - dp / op) * 100);
                      return <p className="text-emerald-700 text-xs mt-1">نسبة الخصم: {pct}%</p>;
                    })()}
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="mavex-label text-black">الوصف</label>
              <textarea
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value.slice(0, 500) })
                }
                maxLength={500}
                className="mavex-textarea focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                rows={6}
                placeholder="أدخل وصف المنتج"
                required
              />
              <div className="text-xs text-gray-500 mt-1">{formData.description.length}/500</div>
              {fieldErrors.description && (
                <div className="text-xs text-red-600 mt-1">{fieldErrors.description}</div>
              )}
            </div>

            {/* مميزات المنتج */}
            <div>
              <label className="mavex-label text-black">
                مميزات المنتج (اكتب كل ميزة في سطر مستقل)
              </label>
              <textarea
                value={formData.featuresText}
                onChange={e =>
                  setFormData({ ...formData, featuresText: e.target.value })
                }
                className="mavex-textarea focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                rows={6}
                placeholder={"خامة قطنية ممتازة\nطباعة عالية الجودة\nمقاسات متعددة متوفرة"}
              />
              <div className="text-xs text-gray-500 mt-1">
                {(formData.featuresText ? formData.featuresText.split(/\r?\n/).filter(s=>s.trim().length>0).length : 0)}/12 بنود
              </div>
              <p className="text-xs text-gray-500 mt-1">
                سيتم عرض هذه المميزات كنقاط في صفحة المنتج. الحد الأقصى 12 نقطة.
              </p>
            </div>

            {/* اختيار الصور من /public/img أو إدخال رابط */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <LocalImagePicker
                  label="رابط الصورة الرئيسية"
                  value={formData.imageUrl}
                  onChange={handleImageChange}
                  placeholder="/img/your-image.png"
                />
                {fieldErrors.imageUrl && (
                  <div className="text-xs text-red-600 mt-1">{fieldErrors.imageUrl}</div>
                )}
              </div>
            </div>

            {/* Advanced Options */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-black">خيارات متقدمة</h3>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(v => !v)}
                  className="px-4 py-2 rounded-xl border-2 text-sm font-bold"
                  style={{ borderColor: 'var(--brand-primary, #0c1420)', color: 'var(--brand-primary, #0c1420)' }}
                >{showAdvanced ? 'إخفاء' : 'عرض'}</button>
              </div>
              {showAdvanced && (
                <div className="mt-4 space-y-6">
                  {/* Category */}
                  <div>
                    <label className="mavex-label text-black">الفئة (اختياري)</label>
                    <select
                      value={categoryId}
                      onChange={(e)=> setCategoryId(e.target.value)}
                      className="mavex-input focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    >
                      <option value="">— بدون فئة —</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Discount end date (if discount) */}
                  {hasDiscount && (
                    <div>
                      <label className="mavex-label text-black">ينتهي الخصم في (اختياري)</label>
                      <input
                        type="date"
                        value={discountEndsAt}
                        onChange={e => setDiscountEndsAt(e.target.value)}
                        className="mavex-input focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                      />
                    </div>
                  )}

                  {/* Secondary images with reordering */}
                  {(() => {
                    const items = [
                      { key: 'hoverImageUrl' as const, label: 'رابط صورة الـ Hover', value: formData.hoverImageUrl },
                      { key: 'thumbnailUrl' as const, label: 'رابط صورة المصغّر (Thumbnail)', value: formData.thumbnailUrl },
                      { key: 'image2Url' as const, label: 'صورة المعرض 2', value: formData.image2Url },
                      { key: 'image3Url' as const, label: 'صورة المعرض 3', value: formData.image3Url },
                    ];
                    const move = (from: number, to: number) => {
                      if (to < 0 || to >= items.length) return;
                      const arr = [...items];
                      const [moved] = arr.splice(from, 1);
                      arr.splice(to, 0, moved);
                      // Apply back to formData in the new order
                      const next: any = { ...formData };
                      const keys = arr.map(a => a.key);
                      const vals = arr.map(a => a.value);
                      keys.forEach((k, i) => { (next as any)[k] = vals[i]; });
                      setFormData(next);
                    };
                    return (
                      <div className="space-y-4">
                        {items.map((it, idx) => (
                          <div key={it.key} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                              <LocalImagePicker
                                label={it.label}
                                value={(formData as any)[it.key]}
                                onChange={(val) => setFormData(prev => ({ ...prev, [it.key]: val }))}
                                placeholder="/img/your-image.png"
                              />
                              {(fieldErrors as any)[it.key] && (
                                <div className="text-xs text-red-600 mt-1">{(fieldErrors as any)[it.key]}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" className="px-3 py-2 rounded-lg border text-xs font-bold" onClick={() => move(idx, idx - 1)} disabled={idx === 0}>فوق</button>
                              <button type="button" className="px-3 py-2 rounded-lg border text-xs font-bold" onClick={() => move(idx, idx + 1)} disabled={idx === items.length - 1}>تحت</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* المقاسات والمخزون */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-black">المقاسات والمخزون</h3>
                <button
                  type="button"
                  onClick={() => setVariants(v => [...v, { size: '', stock: '0', minDisplayStock: '0' }])}
                  className="btn-gold-gradient px-4 py-2 text-sm"
                >إضافة مقاس</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {variants.map((v, idx) => (
                  <div key={`variant-${idx}`} className="grid grid-cols-1 gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div>
                      <label className="block text-xs font-bold text-black mb-1">المقاس</label>
                      <input
                        type="text"
                        value={v.size}
                        onChange={e => {
                          const next = [...variants];
                          next[idx] = { ...next[idx], size: e.target.value };
                          setVariants(next);
                        }}
                        placeholder="مثال: S أو M أو XL"
                        className="mavex-input focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-black mb-1">المخزون</label>
                      <input
                        type="number"
                        min={0}
                        value={v.stock}
                        onChange={e => {
                          const next = [...variants];
                          next[idx] = { ...next[idx], stock: e.target.value };
                          setVariants(next);
                        }}
                        placeholder="الكمية"
                        className="mavex-input focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-black mb-1">حدّ أدنى ظاهر</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={v.minDisplayStock}
                          onChange={e => {
                            const next = [...variants];
                            next[idx] = { ...next[idx], minDisplayStock: e.target.value };
                            setVariants(next);
                          }}
                          placeholder="مثال: 4"
                          className="mavex-input focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...variants];
                            next[idx] = { ...next[idx], minDisplayStock: '4' };
                            setVariants(next);
                          }}
                          className="px-3 py-2 text-xs rounded-lg border border-gray-300 hover:border-brand-500 hover:bg-brand-50"
                        >4</button>
                        <button
                          type="button"
                          onClick={() => setVariants(v => v.filter((_, i) => i !== idx))}
                          className="px-3 py-2 text-xs rounded-lg border border-red-400 text-red-600 hover:bg-red-50"
                        >حذف</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">حدّ العرض لا يؤثر على المخزون الحقيقي بل على الرقم المعروض فقط.</p>
            </div>

            <div className="flex space-x-6 space-x-reverse pt-6">
              <button
                type="submit"
                data-action="save"
                className="btn-gold-gradient py-4 px-8 disabled:opacity-60"
                disabled={isSaving || Object.keys(fieldErrors).length > 0}
              >
                {isSaving ? 'جارٍ الحفظ...' : (editingProduct ? 'تحديث المنتج' : 'إضافة المنتج')}
              </button>
              <button
                type="submit"
                data-action="save_new"
                className="btn-gold-gradient py-4 px-8 disabled:opacity-60"
                disabled={isSaving || Object.keys(fieldErrors).length > 0}
              >
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ وإضافة آخر'}
              </button>

              {editingProduct && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setFormData({
                      name: '',
                      description: '',
                      originalPrice: '',
                      discountedPrice: '',
                      imageUrl: '',
                      hoverImageUrl: '', // إعادة تهيئة hoverImageUrl
                      thumbnailUrl: '',
                      image2Url: '',
                      image3Url: '',
                      stock: '',
                      featuresText: '',
                    });
                    setVariants([
                      { size: 'S', stock: '0', minDisplayStock: '0' },
                      { size: 'M', stock: '0', minDisplayStock: '0' },
                      { size: 'L', stock: '0', minDisplayStock: '0' },
                      { size: 'XL', stock: '0', minDisplayStock: '0' },
                      { size: 'XXL', stock: '0', minDisplayStock: '0' },
                    ]);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-4 px-8 rounded-xl font-bold transition-all duration-300 border-2 border-gray-600 hover:border-gray-700 transform hover:scale-105 shadow-lg hover:shadow-2xl"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Live Preview removed by request */}

        {/* Products List */}
        <div className="modern-card">
          <h2 className="text-3xl font-bold text-black mb-6 border-b-2 pb-4" style={{ borderColor: 'var(--brand-primary, #0c1420)' }}>
            قائمة المنتجات
          </h2>

          {/* Toolbar: search, sort, page size */}
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="ابحث بالاسم أو الوصف..."
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">ترتيب حسب</label>
              <select value={sortKey} onChange={e=>setSortKey(e.target.value as any)} className="border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200">
                <option value="name">الاسم</option>
                <option value="price">السعر</option>
                <option value="stock">المخزون</option>
              </select>
              <button onClick={()=>setSortDir(d=> d==='asc'?'desc':'asc')} className="px-3 py-2 rounded-xl border-2" style={{ borderColor: 'var(--brand-primary, #0c1420)', color: 'var(--brand-primary, #0c1420)' }}>
                {sortDir==='asc'?'تصاعدي':'تنازلي'}
              </button>
            </div>
            <div className="flex items-center gap-2 justify-between lg:justify-end">
              <div className="text-sm text-gray-600">{sortedProducts.length} عنصر</div>
              <select value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(1); }} className="border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Filters: stock, price, export */}
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">المخزون</label>
              <select value={stockFilter} onChange={e=>{ setStockFilter(e.target.value as any); setPage(1); }} className="border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200">
                <option value="ALL">الكل</option>
                <option value="IN">متوفر</option>
                <option value="OUT">نفذ</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" value={minPrice} onChange={e=>{ setMinPrice(e.target.value); setPage(1); }} placeholder="أقل سعر" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
              <input type="number" value={maxPrice} onChange={e=>{ setMaxPrice(e.target.value); setPage(1); }} placeholder="أعلى سعر" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
            </div>
            <div className="flex items-center gap-2 justify-between lg:justify-end">
              <button onClick={()=>exportCSV(sortedProducts)} className="px-3 py-2 rounded-xl border-2" style={{ borderColor: 'var(--brand-primary, #0c1420)', color: 'var(--brand-primary, #0c1420)' }}>Export CSV</button>
              <button onClick={()=>exportJSON(sortedProducts)} className="px-3 py-2 rounded-xl border-2" style={{ borderColor: 'var(--brand-primary, #0c1420)', color: 'var(--brand-primary, #0c1420)' }}>Export JSON</button>
            </div>
          </div>

          {isLoadingProducts ? (
            <div className="space-y-3">
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
              <div className="h-40 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-8 text-gray-300">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <p className="text-gray-600 text-xl font-medium">لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: 'var(--brand-primary, #0c1420)' }}>
                    <th className="text-right py-6 px-6 font-bold text-black text-lg">
                      الصورة
                    </th>
                    <th className="text-right py-6 px-6 font-bold text-black text-lg">
                      الاسم
                    </th>
                    <th className="text-right py-6 px-6 font-bold text-black text-lg">
                      الوصف
                    </th>
                    <th className="text-right py-6 px-6 font-bold text-black text-lg">
                      السعر قبل الخصم
                    </th>
                    <th className="text-right py-6 px-6 font-bold text-black text-lg">
                      السعر بعد الخصم
                    </th>
                    <th className="text-right py-6 px-6 font-bold text-black text-lg">
                      المخزون
                    </th>
                    <th className="text-right py-6 px-6 font-bold text-black text-lg">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(displayedProducts || []).map(product => (
                    <tr
                      key={product.id}
                      className="border-b-2 border-gray-100 transition-all duration-300 hover:bg-brand-50"
                    >
                      <td className="py-6 px-6">
                        <div className="relative w-20 h-20">
                          <Image
                            src={product.imageUrl || FALLBACK_IMAGE_URL}
                            alt={product.name}
                            fill
                            sizes="80px"
                            className="object-cover rounded-none border-2 border-gray-200 hover:border-brand-500 transition-all duration-300"
                          />
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <p className="font-bold text-black text-lg">
                          {product.name}
                        </p>
                      </td>
                      <td className="py-6 px-6">
                        <p className="text-gray-600 text-base line-clamp-2">
                          {product.description}
                        </p>
                      </td>
                      <td className="py-6 px-6">
                        {Number(product.discountedPrice) < Number(product.originalPrice) ? (
                          <p className="font-bold text-gray-600 text-lg line-through">
                            {formatPrice(product.originalPrice)}
                          </p>
                        ) : (
                          <p className="font-bold text-gray-700 text-lg">
                            {formatPrice(product.originalPrice)}
                          </p>
                        )}
                      </td>
                      <td className="py-6 px-6">
                        {Number(product.discountedPrice) < Number(product.originalPrice) ? (
                          <p className="font-bold text-[#0c1420] text-xl">
                            {formatPrice(product.discountedPrice)}
                          </p>
                        ) : (
                          <p className="text-gray-400">—</p>
                        )}
                      </td>
                      <td className="py-6 px-6">
                        <span
                          className={`px-4 py-2 rounded-none text-sm font-bold border-2 ${
                            product.stock > 0
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-500'
                              : 'bg-red-100 text-red-800 border-red-500'
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex space-x-3 space-x-reverse">
                          <button
                            onClick={() => handleEdit(product)}
                            className="btn-gold-gradient px-6 py-3"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-300 font-bold border-2 border-red-600 hover:border-red-700 transform hover:scale-105"
                          >
                            حذف
                          </button>
                          <button
                            onClick={() => handleDuplicate(product)}
                            className="px-6 py-3 rounded-xl transition-all duration-300 font-bold border-2"
                            style={{ borderColor: 'var(--brand-primary, #0c1420)', color: 'var(--brand-primary, #0c1420)' }}
                          >
                            نسخ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <button
                  className="px-4 py-2 rounded-xl border-2 disabled:opacity-50"
                  style={{ borderColor: 'var(--brand-primary, #0c1420)', color: 'var(--brand-primary, #0c1420)' }}
                  onClick={()=> setPage(p => Math.max(1, p-1))}
                  disabled={clampedPage <= 1}
                >السابق</button>
                <div className="text-sm text-gray-600">صفحة {clampedPage} من {totalPages}</div>
                <button
                  className="px-4 py-2 rounded-xl border-2 disabled:opacity-50"
                  style={{ borderColor: 'var(--brand-primary, #0c1420)', color: 'var(--brand-primary, #0c1420)' }}
                  onClick={()=> setPage(p => Math.min(totalPages, p+1))}
                  disabled={clampedPage >= totalPages}
                >التالي</button>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Delete Modal */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={cancelDelete} />
            <div className="absolute inset-0 grid place-items-center p-4">
              <div className="bg-white rounded-2xl border-2 max-w-md w-full p-6" style={{ borderColor: 'var(--brand-primary, #0c1420)' }}>
                <h3 className="text-xl font-bold text-[#0c1420] mb-2">تأكيد الحذف</h3>
                <p className="text-gray-600 mb-4">هل أنت متأكد من حذف المنتج {productToDelete ? `"${productToDelete.name}"` : ''}؟ لا يمكن التراجع.</p>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={cancelDelete} className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:bg-gray-50">إلغاء</button>
                  <button onClick={()=>confirmDelete(confirmDeleteId)} className="px-4 py-2 text-white rounded-xl" style={{ background: '#dc2626' }}>حذف</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
