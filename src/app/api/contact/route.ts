import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const contactSchema = z.object({
  formData: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional().default(''),
    subject: z.string().min(2),
    message: z.string().min(5),
    company: z.string().optional().default(''),
  }),
  turnstileToken: z.string().optional().default(''),
})

export async function POST(req: Request) {
  try {
    const isProd = process.env.NODE_ENV === 'production'
    // Rate limit: 10 requests / 10 minutes per IP for contact form
    const rl = rateLimit(req, 'contact', { limit: 10, windowMs: 10 * 60_000 })
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
    const body = await req.json()
    const parsed = contactSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid payload',
          ...(isProd ? {} : { issues: parsed.error.flatten() }),
        },
        { status: 400 }
      )
    }
    const { formData, turnstileToken } = parsed.data

    // Honeypot check
    if (formData.company && formData.company.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // Turnstile verification (if configured)
    const secretKey = process.env.TURNSTILE_SECRET_KEY
    if (isProd && secretKey) {
      if (!turnstileToken) {
        return NextResponse.json({ ok: false, error: 'Missing Turnstile token' }, { status: 400 })
      }
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: secretKey, response: turnstileToken }).toString(),
      })
      const verifyJson = (await verifyRes.json()) as { success?: boolean }
      if (!verifyJson.success) {
        return NextResponse.json({ ok: false, error: 'Turnstile verification failed' }, { status: 400 })
      }
    }

    // Persist to DB
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || ''
    const userAgent = req.headers.get('user-agent') || ''
    let savedId: string | null = null
    try {
      const saved = await prisma.contactMessage.create({
        data: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || '',
          subject: formData.subject,
          message: formData.message,
          ip,
          userAgent,
        },
      })
      savedId = saved.id
    } catch (e) {
      console.error('DB write failed (contactMessage.create):', e)
      if (isProd) {
        return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
      }
    }

    // Optional: Send email if SMTP is configured
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, ADMIN_EMAIL } = process.env as Record<string, string | undefined>
    if (SMTP_HOST && SMTP_PORT && SMTP_FROM && (SMTP_USER ? SMTP_PASS : true)) {
      // Dynamically import nodemailer so build doesn't fail if it's not installed
      let transporter: any = null
      try {
        const nodemailerMod: any = await import('nodemailer')
        const nodemailer = nodemailerMod?.default ?? nodemailerMod
        transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: Number(SMTP_PORT) || 587,
          secure: Number(SMTP_PORT) === 465, // true for 465, false for others
          auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
        })
      } catch (e) {
        console.error('Failed to load nodemailer module:', e)
      }

      const to = ADMIN_EMAIL || SMTP_FROM
      const { contactEmailTemplate } = await import('@/lib/emails')
      const html = contactEmailTemplate({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        meta: { IP: ip, 'User-Agent': userAgent, 'Message ID': savedId || 'N/A (dev)' }
      })
      try {
        if (transporter) {
          await transporter.sendMail({
            from: SMTP_FROM,
            to,
            subject: `رسالة تواصل: ${formData.subject}`,
            replyTo: formData.email,
            html,
          })
        }
      } catch (e) {
        console.error('SMTP send error:', e)
        // continue without failing the request
      }
    }

    return NextResponse.json({ ok: true, id: savedId }, { status: 200 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }
}
