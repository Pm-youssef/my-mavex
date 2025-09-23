import { z } from 'zod';

import { FALLBACK_IMAGE_URL } from '@/lib/constants';

// قبول كل من روابط http/https وأيضًا المسارات المحلية مع أو بدون سلاش بادئ (img/, /img/, uploads/, /uploads/)
const isUrlOrPath = (v: string) => {
  const s = (v || '').trim();
  return (
    s.length === 0 ||
    /^https?:\/\//.test(s) ||
    /^\/?(img|uploads)\//.test(s)
  );
};

export const productSchema = z.object({
  name: z.string().min(1, 'اسم المنتج مطلوب').max(100, 'اسم المنتج طويل جداً'),
  description: z
    .string()
    .min(10, 'الوصف يجب أن يكون 10 أحرف على الأقل')
    .max(1000, 'الوصف طويل جداً'),
  // وقت انتهاء الخصم (اختياري) - يستخدم للعرض كعداد تنازلي
  discountEndsAt: z
    .string()
    .trim()
    .refine((s) => s.length === 0 || !Number.isNaN(Date.parse(s)), 'تاريخ الخصم غير صالح')
    .optional(),
  // قائمة مميزات المنتج (نقاط) - اختيارية
  features: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'الميزة لا يجب أن تكون فارغة')
        .max(160, 'النقطة طويلة جداً')
    )
    .max(12, 'الحد الأقصى لعدد النقاط هو 12')
    .optional(),
  originalPrice: z
    .number()
    .min(0, 'السعر يجب أن يكون موجب')
    .max(1000000, 'السعر مرتفع جداً'),
  discountedPrice: z
    .number()
    .min(0, 'السعر يجب أن يكون موجب')
    .max(1000000, 'السعر مرتفع جداً'),
  // يدعم روابط خارجية https:// وكذلك مسارات محلية تبدأ بـ /img/ أو /uploads/ وأيضًا بدون سلاش بادئ
  imageUrl: z
    .string()
    .trim()
    .refine(isUrlOrPath, 'رابط الصورة غير صحيح')
    .optional()
    .default(FALLBACK_IMAGE_URL),
  hoverImageUrl: z
    .string()
    .trim()
    .refine(isUrlOrPath, 'رابط الصورة غير صحيح')
    .optional(),
  thumbnailUrl: z
    .string()
    .trim()
    .refine(isUrlOrPath, 'رابط الصورة غير صحيح')
    .optional(),
  image2Url: z
    .string()
    .trim()
    .refine(isUrlOrPath, 'رابط الصورة غير صحيح')
    .optional(),
  image3Url: z
    .string()
    .trim()
    .refine(isUrlOrPath, 'رابط الصورة غير صحيح')
    .optional(),
  stock: z
    .number()
    .int()
    .min(0, 'الكمية يجب أن تكون موجب')
    .max(100000, 'الكمية مرتفعة جداً'),
  variants: z
    .array(
      z.object({
        size: z.string().min(1),
        stock: z.number().int().min(0),
        minDisplayStock: z.number().int().min(0),
      })
    )
    .optional(),
});

export const checkoutSchema = z.object({
  customerName: z
    .string()
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
    .max(100, 'الاسم طويل جداً'),
  customerEmail: z.string().email('البريد الإلكتروني غير صحيح'),
  customerPhone: z
    .string()
    .min(10, 'رقم الهاتف غير صحيح')
    .max(15, 'رقم الهاتف طويل جداً'),
  customerAddress: z
    .string()
    .min(6, 'العنوان يجب أن يكون 6 أحرف على الأقل')
    .max(500, 'العنوان طويل جداً')
    .optional(),
  customerCity: z
    .string()
    .min(2, 'المدينة يجب أن تكون حرفين على الأقل')
    .max(100, 'اسم المدينة طويل جداً')
    .optional(),
  customerGovernorate: z
    .string()
    .min(2, 'المحافظة يجب أن تكون حرفين على الأقل')
    .max(100, 'اسم المحافظة طويل جداً')
    .optional(),
  customerPostalCode: z
    .string()
    .min(3, 'الرمز البريدي يجب أن يكون 3 أحرف على الأقل')
    .max(10, 'الرمز البريدي طويل جداً')
    .optional(),
  paymentMethod: z.string().min(1, 'طريقة الدفع مطلوبة').default('COD'),
  shippingMethod: z.string().min(1, 'طريقة الشحن مطلوبة').default('STANDARD'),
  items: z
    .array(
      z.object({
        id: z.string(),
        size: z.string().optional(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })
    )
    .min(1, 'يجب أن تحتوي الطلبية على منتج واحد على الأقل'),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

// Auth
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'الاسم قصير').max(100, 'الاسم طويل').optional().nullable(),
  email: z.string().trim().email('البريد الإلكتروني غير صحيح'),
  password: z.string().trim().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().email('البريد الإلكتروني غير صحيح'),
  password: z.string().trim().min(1, 'كلمة المرور مطلوبة'),
});

// Reviews
export const reviewCreateSchema = z.object({
  productId: z.string().min(1, 'productId مطلوب'),
  rating: z.coerce.number().int().min(1, 'التقييم بين 1 و 5').max(5, 'التقييم بين 1 و 5'),
  comment: z
    .string()
    .max(1000, 'التعليق طويل جداً')
    .optional(),
  authorId: z.string().optional(),
  images: z
    .array(z.string().trim().refine(isUrlOrPath, 'رابط الصورة غير صحيح'))
    .max(6, 'يمكنك رفع حتى 6 صور كحد أقصى')
    .optional(),
});

export const reviewUpdateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
  pinned: z.boolean().optional(),
  images: z
    .array(z.string().trim().refine(isUrlOrPath, 'رابط الصورة غير صحيح'))
    .max(6)
    .optional(),
  status: z.enum(['pending','approved','rejected']).optional(),
});

export const orderSchema = z.object({
  customerName: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  customerEmail: z.string().email('البريد الإلكتروني غير صحيح'),
  customerPhone: z.string().min(10, 'رقم الهاتف غير صحيح'),
  customerAddress: z.string().min(10, 'العنوان يجب أن يكون 10 أحرف على الأقل'),
  items: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'يجب أن تحتوي الطلبية على منتج واحد على الأقل'),
});

export const paymobWebhookSchema = z.object({
  type: z.string(),
  obj: z.object({
    id: z.number(),
    amount_cents: z.number(),
    currency: z.string(),
    merchant_order_id: z.string(),
    success: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    pending: z.boolean(),
    error_occured: z.boolean(),
  }),
});

export type ProductFormData = z.infer<typeof productSchema>;
export type CheckoutFormData = z.infer<typeof checkoutSchema>;
export type AdminLoginFormData = z.infer<typeof adminLoginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type PaymobWebhookData = z.infer<typeof paymobWebhookSchema>;
export type ReviewCreateData = z.infer<typeof reviewCreateSchema>;
export type ReviewUpdateData = z.infer<typeof reviewUpdateSchema>;
