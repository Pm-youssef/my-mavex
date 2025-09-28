import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateOrderId } from '@/lib/utils';
import { checkoutSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { cookies } from 'next/headers';
import { getUserCookieName, verifyUserJwt } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getOrderColumns(): Promise<Set<string>> {
  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      `SELECT lower(column_name) AS c FROM information_schema.columns WHERE table_schema = 'public' AND lower(table_name) = 'order'`
    ) as Array<{ c: string }>;
    return new Set((rows || []).map(r => r.c));
  } catch {
    return new Set<string>();
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests / 10 minutes per IP
    const rl = rateLimit(request as unknown as Request, 'checkout', { limit: 10, windowMs: 10 * 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    const body = await request.json();
    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerGovernorate,
      customerPostalCode,
      paymentMethod = 'COD',
      shippingMethod = 'STANDARD',
      couponCode = '',
      discount: clientDiscount = 0,
      billingDifferent = false,
      billingAddress = '',
      billingCity = '',
      billingGovernorate = '',
      billingPostalCode = '',
    } = body;

    const parsed = checkoutSchema.safeParse({
      items,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerGovernorate,
      customerPostalCode,
      paymentMethod,
      shippingMethod,
      billingDifferent,
      billingAddress,
      billingCity,
      billingGovernorate,
      billingPostalCode,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors?.[0]?.message || 'Invalid checkout data' },
        { status: 400 }
      );
    }

    // Enforce COD only for now
    if (String(paymentMethod).toUpperCase() !== 'COD') {
      return NextResponse.json(
        { error: 'طرق الدفع الأونلاين غير مفعلة حالياً. الرجاء اختيار الدفع عند الاستلام (COD).' },
        { status: 400 }
      );
    }

    // تحقق من توافر المخزون لكل عنصر (حسب المقاس)
    // نتوقع أن يحتوي كل عنصر على productId, size, quantity, price
    for (const item of items) {
      const size = String(item.size || '');
      const rows = await prisma.$queryRaw<{ stock: number; size: string }[]>`
        SELECT "stock", "size"
        FROM "ProductVariant"
        WHERE "productId" = ${item.id} AND "size" = ${size}
        LIMIT 1
      `;
      const variant = rows[0];
      if (!variant) {
        return NextResponse.json(
          { error: `المقاس المطلوب غير متوفر للمنتج.` },
          { status: 400 }
        );
      }
      if (Number(variant.stock) < Number(item.quantity)) {
        return NextResponse.json(
          { error: `الكمية المطلوبة غير متاحة لمقاس ${variant.size}.` },
          { status: 400 }
        );
      }
    }

    // إعدادات الشحن/الضريبة من SiteSettings (أو قيم افتراضية)
    let settings: any = null;
    try {
      const anyPrisma = prisma as any;
      if (anyPrisma?.siteSettings?.findUnique) {
        settings = await anyPrisma.siteSettings.findUnique({ where: { id: 'default' } });
      }
    } catch {}
    const shippingStandard = Number(settings?.shippingStandard ?? 75);
    const shippingExpress = Number(settings?.shippingExpress ?? 150);
    const freeShippingMin = settings?.freeShippingMin == null ? null : Number(settings.freeShippingMin);
    const taxPercent = settings?.taxPercent == null ? null : Number(settings.taxPercent);

    // احسب المجموع الفرعي
    const subtotal = Array.isArray(items)
      ? items.reduce((sum: number, it: any) => sum + Number(it.price) * Number(it.quantity), 0)
      : 0;

    // حساب الخصم (تحقّق من الكوبون على الخادم)
    let discount = 0;
    const code = String(couponCode || '').trim().toUpperCase();
    if (code) {
      try {
        const coupon = await (prisma as any).coupon.findUnique({ where: { code } });
        const now = Date.now();
        const isActive = !!coupon && (!coupon.startsAt || new Date(coupon.startsAt).getTime() <= now)
          && (!coupon.endsAt || new Date(coupon.endsAt).getTime() >= now)
          && (coupon.active !== false)
          && (!(coupon.usageLimit != null) || coupon.usageCount < coupon.usageLimit);
        if (isActive) {
          const minOk = !coupon.minSubtotal || subtotal >= Number(coupon.minSubtotal);
          if (minOk) {
            if (coupon.type === 'PERCENT') {
              discount = Math.round((subtotal * Number(coupon.value)) ) / 100; // value is percent
            } else {
              discount = Number(coupon.value || 0);
            }
            if (discount > subtotal) discount = subtotal;
          }
        }
      } catch {}
    }
    // إن لم يوجد كوبون صالح، تجاهل أي خصم من العميل
    if (!Number.isFinite(discount) || discount < 0) discount = 0;

    // حساب تكلفة الشحن وفق الطريقة والحد المجاني
    const methodUpper = String(shippingMethod || 'STANDARD').toUpperCase();
    const baseShipping = methodUpper === 'EXPRESS' ? shippingExpress : shippingStandard;
    const afterDiscount = Math.max(0, subtotal - discount);
    const shippingCost = (freeShippingMin != null && afterDiscount >= Number(freeShippingMin)) ? 0 : baseShipping;

    // حساب الضريبة (إن وجدت) على المبلغ بعد الخصم
    const taxAmount = taxPercent == null ? 0 : Math.max(0, Math.round((afterDiscount * Number(taxPercent)) / 100));

    const totalAmount = afterDiscount + shippingCost + taxAmount;

    // إنشاء الطلب وتحديث المخزون ضمن معاملة
    const token = cookies().get(getUserCookieName())?.value || ''
    const sessionUser = verifyUserJwt(token)

    const order = await prisma.$transaction(async tx => {
      // تقليل المخزون للمقاسات المطلوبة
      for (const item of items) {
        const size = String(item.size || '');

        // تأكيد التوفر داخل المعاملة
        const rows = await tx.$queryRaw<{ id: string; stock: number }[]>`
          SELECT "id", "stock" FROM "ProductVariant"
          WHERE "productId" = ${item.id} AND "size" = ${size}
          LIMIT 1
        `;
        const variant = rows[0];
        if (!variant || Number(variant.stock) < Number(item.quantity)) {
          throw new Error('Insufficient stock or variant not found');
        }

        // خصم المخزون للمقاس المطلوب (محمي بشرط عدم السالب)
        await tx.$executeRaw`
          UPDATE "ProductVariant"
          SET "stock" = "stock" - ${Number(item.quantity)}
          WHERE "productId" = ${
            item.id
          } AND "size" = ${size} AND "stock" >= ${Number(item.quantity)}
        `;

        // تحديث مخزون المنتج الإجمالي (مجموع المقاسات)
        const sumRows = await tx.$queryRaw<{ total: number }[]>`
          SELECT COALESCE(SUM("stock"), 0) AS total
          FROM "ProductVariant"
          WHERE "productId" = ${item.id}
        `;
        const totalStock = Number(sumRows?.[0]?.total || 0);
        await tx.$executeRaw`
          UPDATE "Product" SET "stock" = ${totalStock} WHERE "id" = ${item.id}
        `;
      }

      // حساب الإجمالي تم مسبقًا وفق الإعدادات والكوبون

      // إنشاء الطلب
      const orderData: any = {
        customerName,
        customerEmail,
        customerPhone,
        totalAmount,
        paymentMethod,
        items: {
          create: items.map((it: any) => ({
            productId: it.id,
            quantity: Number(it.quantity),
            price: Number(it.price),
          })),
        },
      };

      // إضافة الحقول الجديدة إذا كانت موجودة في المخطط
      if (customerAddress) orderData.customerAddress = customerAddress;
      if (customerCity) orderData.customerCity = customerCity;
      if (customerGovernorate)
        orderData.customerGovernorate = customerGovernorate;
      if (customerPostalCode) orderData.customerPostalCode = customerPostalCode;
      if (shippingMethod) orderData.shippingMethod = methodUpper;
      orderData.subtotal = subtotal;
      orderData.shippingCost = shippingCost;

      if (sessionUser?.id) {
        (orderData as any).userId = sessionUser.id;
      }
      // Conditionally include billing fields if columns exist
      try {
        const cols = await getOrderColumns();
        if (cols.has('billingdifferent')) (orderData as any).billingDifferent = Boolean(billingDifferent);
        if (cols.has('billingaddress') && billingAddress) (orderData as any).billingAddress = String(billingAddress);
        if (cols.has('billingcity') && billingCity) (orderData as any).billingCity = String(billingCity);
        if (cols.has('billinggovernorate') && billingGovernorate) (orderData as any).billingGovernorate = String(billingGovernorate);
        if (cols.has('billingpostalcode') && billingPostalCode) (orderData as any).billingPostalCode = String(billingPostalCode);
      } catch {}

      const createdOrder = await tx.order.create({
        data: orderData,
        include: { items: { include: { product: true } } },
      });

      return createdOrder;
    });

    // Optional: Send email if SMTP is configured
    try {
      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, ADMIN_EMAIL } = process.env as Record<string, string | undefined>;
      if (SMTP_HOST && SMTP_PORT && SMTP_FROM && (SMTP_USER ? SMTP_PASS : true)) {
        const nodemailerMod: any = await import('nodemailer').catch(() => null);
        const nodemailer = nodemailerMod?.default ?? nodemailerMod;
        if (nodemailer) {
          const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT) || 587,
            secure: Number(SMTP_PORT) === 465,
            auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
          });
          const to = ADMIN_EMAIL || SMTP_FROM;
          const { orderAdminTemplate, orderCustomerTemplate } = await import('@/lib/emails')
          const html = orderAdminTemplate(order)
          await transporter.sendMail({
            from: SMTP_FROM,
            to,
            subject: `طلب جديد: ${order.id}`,
            html,
          }).catch(() => {});

          // Customer confirmation email (if email provided)
          const custTo = (customerEmail || '').trim();
          if (custTo) {
            const custHtml = orderCustomerTemplate(order)
            await transporter.sendMail({
              from: SMTP_FROM,
              to: custTo,
              subject: `تأكيد طلبك: ${order.id}`,
              html: custHtml,
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      // ignore email errors
    }

    return NextResponse.json({
      orderId: order.id,
      success: true,
      message: 'تم إنشاء الطلب بنجاح!',
      totalAmount: order.totalAmount,
      orderNumber: order.id,
      paymentMethod: order.paymentMethod,
    });
  } catch (error: any) {
    console.error('Checkout error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to process checkout' },
      { status: 500 }
    );
  }
}
