import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';

// GET (public-limited): return non-PII order details for thank-you page
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        paymentMethod: true,
        shippingMethod: true,
        createdAt: true,
      },
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin auth
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const validStatuses = [
      'PENDING',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { status },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Optional: notify customer by email if SMTP configured and customerEmail exists
    try {
      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env as Record<string, string | undefined>;
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
          const orderMinimal = await prisma.order.findUnique({
            where: { id: params.id },
            select: { customerEmail: true, customerName: true, id: true, status: true, totalAmount: true },
          });
          const to = (orderMinimal?.customerEmail || '').trim();
          if (to) {
            const html = `
              <h2>تحديث حالة الطلب</h2>
              <p>مرحباً ${orderMinimal?.customerName || ''},</p>
              <p>تم تحديث حالة طلبك رقم <strong>${orderMinimal?.id}</strong> إلى: <strong>${status}</strong>.</p>
              <p><strong>الإجمالي:</strong> ${orderMinimal?.totalAmount ?? ''}</p>
            `;
            await transporter.sendMail({
              from: SMTP_FROM,
              to,
              subject: `تحديث حالة الطلب: ${orderMinimal?.id}`,
              html,
            }).catch(() => {});
          }
        }
      }
    } catch {
      // ignore email errors
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin auth
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await prisma.order.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
