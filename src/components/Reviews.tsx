"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Star, Pin, Trash2, X, ImagePlus, Loader2 } from "lucide-react";
import Image from "next/image";
import { toastError, toastSuccess, toastWarning } from "@/components/ui/Toast";

type Review = {
  id: string;
  rating: number;
  comment: string;
  date: string;
  pinned?: boolean;
  authorId?: string;
  images?: string[];
};

interface ReviewsProps {
  productId: string;
}

const STORAGE_PREFIX = "REVIEWS:";
const AUTHOR_KEY = STORAGE_PREFIX + "AUTHOR_ID";

export default function Reviews({ productId }: ReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<number>(5);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [authorId, setAuthorId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const MAX_COMMENT = 600;
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxSource, setLightboxSource] = useState<'new' | 'existing'>('existing');
  const [lightboxClosing, setLightboxClosing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const openLightbox = (images: string[], index: number, source: 'new' | 'existing' = 'existing') => {
    if (!Array.isArray(images) || images.length === 0) return;
    setLightboxImages(images);
    setLightboxIndex(Math.max(0, Math.min(index, images.length - 1)));
    setLightboxSource(source);
    setLightboxOpen(true);
  };
  const closeLightbox = () => {
    setLightboxClosing(true);
    setTimeout(() => {
      setLightboxOpen(false);
      setLightboxClosing(false);
    }, 180);
  };
  const nextImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLightboxIndex((i) => (i + 1) % Math.max(1, lightboxImages.length));
  }, [lightboxImages.length]);
  const prevImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLightboxIndex((i) => (i - 1 + Math.max(1, lightboxImages.length)) % Math.max(1, lightboxImages.length));
  }, [lightboxImages.length]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (ev.key === 'Escape') closeLightbox();
      if (ev.key === 'ArrowRight') nextImage();
      if (ev.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, nextImage, prevImage]);

  useEffect(() => {
    // Ensure we have a pseudo user id for client-only ownership
    try {
      let id = localStorage.getItem(AUTHOR_KEY) || "";
      if (!id) {
        id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(AUTHOR_KEY, id);
      }
      setAuthorId(id);
    } catch {}

    // Check admin session
    fetch('/api/admin/session')
      .then((res) => res.ok ? res.json() : { isAuthenticated: false })
      .then((data) => setIsAdmin(Boolean(data?.isAuthenticated)))
      .catch(() => setIsAdmin(false));

    // Load reviews from backend
    const load = async () => {
      try {
        const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const arr = await res.json();
        const normalized: Review[] = Array.isArray(arr)
          ? arr.map((r: any) => ({
              id: String(r.id),
              rating: Number(r.rating) || 0,
              comment: typeof r.comment === 'string' ? r.comment : "",
              date: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
              pinned: Boolean(r.pinned),
              authorId: typeof r.authorId === 'string' ? r.authorId : undefined,
              images: Array.isArray(r.images) ? r.images : undefined,
            }))
          : [];
        setReviews(normalized);
      } catch {
        setReviews([]);
      }
    };
    load();
  }, [productId]);

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return (
      Math.round(
        (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) *
          10
      ) / 10
    );
  }, [reviews]);

  const sortedReviews = useMemo(() => {
    const arr = reviews.slice();
    arr.sort((a, b) => {
      const pinDiff = Number(!!b.pinned) - Number(!!a.pinned);
      if (pinDiff !== 0) return pinDiff;
      return +new Date(b.date) - +new Date(a.date);
    });
    return arr;
  }, [reviews]);

  const visibleReviews = useMemo(() => {
    const arr = sortedReviews;
    // Show only a single review by default; reveal all when toggled
    return showAll ? arr : arr.slice(0, 1);
  }, [sortedReviews, showAll]);

  const notifyUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reviewsUpdated', { detail: { productId } }));
    }
  };

  const addReview = async () => {
    if (rating <= 0) {
      toastWarning({ title: 'اكمل التقييم', description: 'يرجى اختيار التقييم بالنجوم' });
      return;
    }
    try {
      setIsPosting(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, comment: comment.trim(), authorId, images: newImages }),
      });
      if (!res.ok) throw new Error('failed');
      const r = await res.json();
      const created: Review = {
        id: String(r.id),
        rating: Number(r.rating) || 0,
        comment: typeof r.comment === 'string' ? r.comment : '',
        date: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
        pinned: Boolean(r.pinned),
        authorId: typeof r.authorId === 'string' ? r.authorId : undefined,
        images: Array.isArray(newImages) ? newImages.slice(0, 6) : undefined,
      };
      setReviews((prev) => [created, ...prev]);
      notifyUpdated();
      setRating(5);
      setHover(0);
      setComment("");
      setNewImages([]);
      toastSuccess({ title: 'تم إضافة تقييمك', description: 'شكراً لمشاركتك رأيك' });
    } catch {
      toastError({ title: 'فشل إضافة التقييم', description: 'تعذر إضافة التقييم، حاول لاحقًا' });
    } finally {
      setIsPosting(false);
    }
  };

  const togglePin = async (id: string) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !(reviews.find(r => r.id === id)?.pinned) }),
      });
      if (!res.ok) throw new Error('failed');
      const updated = await res.json();
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, pinned: Boolean(updated?.pinned) } : r)));
      notifyUpdated();
    } catch {}
  };

  const deleteReview = async (id: string) => {
    try {
      const options: RequestInit = { method: 'DELETE' };
      if (!isAdmin) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify({ authorId });
      }
      const res = await fetch(`/api/reviews/${id}`, options);
      if (!res.ok) throw new Error('failed');
      setReviews((prev) => prev.filter((r) => r.id !== id));
      notifyUpdated();
    } catch {
      toastError({ title: 'تعذر الحذف', description: 'لا تملك صلاحية حذف هذا التقييم' });
    }
  };

  const handleFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).slice(0, Math.max(0, 6 - newImages.length));
    if (arr.length === 0) return;
    setIsUploading(true);
    setUploadProgress({ done: 0, total: arr.length });
    for (const f of arr) {
      if (!f.type.startsWith('image/')) {
        toastWarning({ title: 'ملف غير مدعوم', description: 'الرجاء اختيار صور فقط' });
        setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        toastWarning({ title: 'الصورة كبيرة', description: 'الحد الأقصى 5MB للصورة' });
        setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
        continue;
      }
      try {
        const form = new FormData();
        form.append('file', f);
        const res = await fetch('/api/reviews/upload', { method: 'POST', body: form });
        if (!res.ok) throw new Error('upload-failed');
        const data = await res.json();
        const url = String(data?.url || '');
        if (!url) throw new Error('invalid-url');
        setNewImages(prev => (prev.includes(url) ? prev : [...prev, url]).slice(0, 6));
      } catch {
        toastError({ title: 'فشل رفع الصورة', description: 'حاول مجددًا' });
      }
      setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#0c1420]">التقييمات</span>
          <div className="flex items-center text-yellow-500">
            {Array.from({ length: 5 }, (_, i) => i + 1).map((i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i <= Math.round(avg) ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500">{avg} / 5</span>
          <span className="text-sm text-gray-500">({reviews.length})</span>
        </div>
        {/* Filters removed as requested */}
      </div>

      {/* Input */}
      <div className="border border-gray-200 rounded-2xl p-4 md:p-5 mb-4 bg-white relative overflow-hidden">
        {/* Upload progress bar */}
        {isUploading && uploadProgress.total > 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
            <div
              className="h-full bg-yellow-500 transition-all"
              style={{ width: `${Math.min(100, Math.round((uploadProgress.done / uploadProgress.total) * 100))}%` }}
            />
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(i)}
              className="p-1"
              aria-label={`تقييم ${i}`}
              title={`تقييم ${i}`}
            >
              <Star
                className={`w-6 h-6 ${
                  i <= (hover || rating)
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
        <div className="relative mt-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
            rows={4}
            placeholder="شاركنا رأيك بلمسة لطيفة: ما الذي أعجبك أو تود تحسينه؟ (اختياري)"
            className="w-full pr-36 pl-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none placeholder:text-gray-400"
          />
          <span className="absolute right-3 bottom-3 text-xs text-gray-400 select-none">
            {comment.length}/{MAX_COMMENT}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesUpload(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-3 bottom-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-yellow-500 text-[#0c1420] bg-yellow-50 hover:bg-yellow-100 font-extrabold"
            title="أضف صوراً (اختياري)"
            aria-label="رفع صور للتقييم"
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            <span className="text-sm">إضافة صور</span>
          </button>
          <span className="absolute left-3 bottom-[3.4rem] text-xs text-gray-400 select-none">
            {newImages.length}/6 صور
          </span>
        </div>
        {newImages.length > 0 && (
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {newImages.map((u, i) => (
              <div key={`${u}-${i}`} className="relative group">
                <button type="button" onClick={() => openLightbox(newImages, i, 'new')} className="block w-full">
                  <Image src={u} alt={`review-upload-${i}`} width={240} height={240} className="w-full h-20 object-cover rounded-md border transition-transform duration-200 hover:scale-[1.02]" />
                </button>
                <button
                  type="button"
                  aria-label="حذف الصورة"
                  title="حذف الصورة"
                  onClick={() => setNewImages((prev) => prev.filter((x) => x !== u))}
                  className="absolute -top-2 -left-2 bg-rose-600 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button
            onClick={addReview}
            disabled={isPosting || isUploading || rating <= 0}
            className="btn-gold-gradient rounded-2xl px-5 py-3 font-extrabold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isPosting ? 'جاري الإرسال…' : 'أضف تقييمك'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="border border-gray-200 rounded-xl bg-white">
        <div className="divide-y divide-gray-100">
          {reviews.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">لا توجد تقييمات بعد</div>
          ) : (
            visibleReviews.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i <= r.rating
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  {r.pinned && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-bold">
                      مثبت
                    </span>
                  )}
                  <div className="ms-auto flex items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => togglePin(r.id)}
                        title={r.pinned ? "إلغاء التثبيت" : "تثبيت"}
                        aria-label={r.pinned ? "إلغاء التثبيت" : "تثبيت"}
                        className="p-1.5 rounded-md border border-gray-200 hover:border-yellow-400 hover:bg-yellow-50"
                      >
                        <Pin className={`w-4 h-4 ${r.pinned ? 'text-yellow-600' : 'text-gray-500'}`} />
                      </button>
                    )}
                    {(isAdmin || r.authorId === authorId) && (
                      <button
                        type="button"
                        onClick={() => deleteReview(r.id)}
                        title="حذف"
                        aria-label="حذف"
                        className="p-1.5 rounded-md border border-gray-200 hover:border-rose-300 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </button>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(r.date).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-[#0c1420] leading-6 whitespace-pre-wrap">
                    {r.comment}
                  </p>
                )}
                {Array.isArray(r.images) && r.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {r.images.map((u, i) => (
                      <button key={`${r.id}-img-${i}`} type="button" className="relative block" onClick={() => openLightbox(r.images!, i, 'existing')}>
                        <Image src={u} alt={`review-${r.id}-${i}`} width={320} height={320} className="w-full h-24 object-cover rounded-md border transition-transform duration-200 hover:scale-[1.02]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        {reviews.length > 1 && (
          <div className="p-3 text-center">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 text-sm font-medium text-[#0c1420]"
            >
              {showAll ? 'عرض أقل' : `عرض الآراء (${reviews.length - 1})`}
            </button>
          </div>
        )}
        {/* Lightbox */}
        {lightboxOpen && (
          <div
            className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 ${lightboxClosing ? 'animate-out fade-out-0 zoom-out-95 duration-150' : 'animate-in fade-in-0 zoom-in-95 duration-150'}`}
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
          >
            <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="relative w-full h-[70vh] md:h-[80vh]">
                <Image
                  src={lightboxImages[lightboxIndex]}
                  alt={`review-large-${lightboxIndex}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 80vw"
                  className="object-contain rounded-xl shadow-2xl"
                />
              </div>
              {lightboxImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-[#0c1420] rounded-full w-10 h-10 font-bold"
                    aria-label="السابق"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-[#0c1420] rounded-full w-10 h-10 font-bold"
                    aria-label="التالي"
                  >
                    ›
                  </button>
                </>
              )}
              {/* Delete from lightbox for new uploads */}
              {lightboxSource === 'new' && (
                <button
                  type="button"
                  onClick={() => {
                    const url = lightboxImages[lightboxIndex];
                    setNewImages((prev) => prev.filter((x) => x !== url));
                    if (lightboxImages.length <= 1) {
                      closeLightbox();
                    } else {
                      const next = lightboxImages.filter((x, idx) => idx !== lightboxIndex);
                      setLightboxImages(next);
                      setLightboxIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
                    }
                  }}
                  className="absolute left-2 top-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full px-3 py-1.5 text-xs font-extrabold shadow"
                  aria-label="حذف الصورة"
                  title="حذف الصورة"
                >
                  حذف
                </button>
              )}
              <button
                type="button"
                onClick={closeLightbox}
                className="absolute -top-3 -right-3 bg-white text-[#0c1420] rounded-full w-10 h-10 font-extrabold shadow-lg"
                aria-label="إغلاق"
              >
                ×
              </button>
              <div className="absolute bottom-2 right-1/2 translate-x-1/2 text-xs text-white/80">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
