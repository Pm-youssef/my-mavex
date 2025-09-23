export function emailLayout(title: string, bodyHtml: string) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
      <div style="background:#111827;color:#f59e0b;padding:16px 20px;font-weight:800;font-size:18px;">${title}</div>
      <div style="padding:20px;color:#111827;line-height:1.8;font-size:14px;">${bodyHtml}</div>
      <div style="padding:16px 20px;background:#f9fafb;color:#6b7280;font-size:12px;">متجر التيشيرت — رسالة آلية</div>
    </div>
  </div>`
}

export function contactEmailTemplate(data: { name: string; email: string; phone?: string; subject: string; message: string; meta?: Record<string,string|number|undefined> }) {
  const rows = [
    `<p><strong>الاسم:</strong> ${data.name}</p>`,
    `<p><strong>البريد:</strong> ${data.email}</p>`,
    `<p><strong>الهاتف:</strong> ${data.phone || '-'}</p>`,
    `<p><strong>الموضوع:</strong> ${data.subject}</p>`,
    `<p><strong>الرسالة:</strong><br/>${data.message.replace(/\n/g,'<br/>')}</p>`,
  ]
  if (data.meta) {
    rows.push('<hr/>')
    for (const [k,v] of Object.entries(data.meta)) rows.push(`<p><strong>${k}:</strong> ${String(v ?? '')}</p>`)
  }
  return emailLayout('رسالة تواصل جديدة', rows.join('\n'))
}

export function orderAdminTemplate(order: any) {
  const itemsHtml = Array.isArray(order.items) ? order.items.map((it: any) => `<tr><td>${it.product?.name || it.productId}</td><td>${it.quantity}</td><td>${it.price}</td></tr>`).join('') : ''
  const body = `
    <p><strong>طلب جديد:</strong> ${order.id}</p>
    <p><strong>الاسم:</strong> ${order.customerName}</p>
    <p><strong>الهاتف:</strong> ${order.customerPhone || '-'}</p>
    <p><strong>الإجمالي:</strong> ${order.totalAmount}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:10px">
      <thead><tr><th align="right">المنتج</th><th align="right">الكمية</th><th align="right">السعر</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
  `
  return emailLayout('طلب جديد', body)
}

export function orderCustomerTemplate(order: any) {
  const body = `
    <p>مرحباً ${order.customerName},</p>
    <p>شكرًا لطلبك من متجرنا. تم استلام طلبك برقم <strong>${order.id}</strong>.</p>
    <p><strong>طريقة الدفع:</strong> ${order.paymentMethod}</p>
    <p><strong>الإجمالي:</strong> ${order.totalAmount}</p>
  `
  return emailLayout('تأكيد طلبك', body)
}
