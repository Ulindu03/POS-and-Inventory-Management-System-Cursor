import { Settings } from '../models/Settings.model';
import { sendEmailRaw } from './emailProvider';

async function getFlags() {
  const s = await Settings.findOne();
  return {
    email: Boolean(s?.notifications?.email?.enabled),
    sms: Boolean(s?.notifications?.sms?.enabled),
  };
}

export async function sendEmail(subject: string, to: string, text: string, html?: string) {
  const { email } = await getFlags();
  console.log('[email:debug] settings email enabled:', email, 'subject:', subject, 'to:', to);
  if (!email) {
    console.log('[email][skipped][disabled]', subject);
    return false;
  }
  try {
    await sendEmailRaw({ to, subject, html: html || `<pre>${text}</pre>`, text });
    console.log('[email][sale_receipt][sent]', to, subject);
    return true;
  } catch (e: any) {
    console.error('[email][sale_receipt][error]', subject, e?.message || e);
    return false;
  }
}

export async function sendSMS(to: string, text: string) {
  const { sms } = await getFlags();
  if (!sms) return false;
  // TODO: integrate provider (e.g., Twilio)
  console.log(`[sms] to=${to} text=${text}`);
  return true;
}

export function buildSaleReceiptEmail(sale: any, customer: any) {
  const currency = (sale?.currency?.code) || 'LKR';
  const items = (sale?.items || []).map((it: any) => {
    const name = (it?.product?.name?.en || it?.product?.name || it?.name || 'Item');
    const qty = Number(it?.quantity) || 0;
    const price = Number(it?.price) || 0;
    const total = qty * price;
    const warrantyDays = Number(it?.product?.warranty?.periodDays || 0);
    const warrantyEnabled = Boolean(it?.product?.warranty?.enabled && warrantyDays > 0);
    const barcode = it?.product?.barcode || it?.barcode || null;
    return { name, qty, price, total, warrantyEnabled, warrantyDays, barcode };
  });
  const subtotal = items.reduce((s: number, l: any) => s + l.total, 0);
  const discount = Number(sale?.discount || 0);
  const vat = Number(sale?.tax?.vat || 0);
  const nbt = Number(sale?.tax?.nbt || 0);
  const total = Number(sale?.total ?? (subtotal - discount + vat + nbt));

  const text = [
    `Hi ${customer?.name || 'Customer'},`,
    '',
    `Thank you for your purchase. Invoice: ${sale?.invoiceNo}`,
    '',
    'Items:',
    ...items.map((i: any) => ` - ${i.name} x${i.qty} @ ${i.price} = ${i.total}`),
    '',
    `Subtotal: ${subtotal}`,
    discount ? `Discount: -${discount}` : '',
    vat ? `VAT: ${vat}` : '',
    nbt ? `NBT: ${nbt}` : '',
    `Total: ${total} ${currency}`,
    '',
    'We appreciate your business.'
  ].filter(Boolean).join('\n');

  const logoUrl = sale?.settings?.branding?.logoUrl || sale?.branding?.logoUrl || '';
  const storeName = sale?.settings?.branding?.storeName || sale?.branding?.storeName || 'VoltZone';
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:20px;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg, #ffdf00 0%, #1d1d1d 100%);padding:30px 20px;text-align:center;color:#1d1d1d;">
        ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" style="max-height:60px;max-width:150px;margin-bottom:15px;object-fit:contain;" />` : ''}
        <h1 style="margin:0;font-size:28px;font-weight:700;">${storeName}</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Your Purchase Receipt</p>
      </div>
      
      <!-- Invoice Info Box -->
      <div style="background:#f8f9fa;padding:20px;border-bottom:3px solid #ffdf00;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding:4px 0;">
              <span style="font-size:13px;color:#6c757d;">Invoice Number</span><br>
              <strong style="font-size:18px;color:#212529;">${sale?.invoiceNo}</strong>
            </td>
            <td align="right" style="padding:4px 0;">
              <span style="font-size:13px;color:#6c757d;">Date</span><br>
              <strong style="font-size:14px;color:#212529;">${new Date(sale?.createdAt || Date.now()).toLocaleDateString()}</strong>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Greeting -->
      <div style="padding:25px 20px 15px;">
        <h2 style="margin:0 0 10px;font-size:20px;color:#212529;">Hi ${customer?.name || 'Valued Customer'},</h2>
        <p style="margin:0;font-size:15px;color:#6c757d;line-height:1.6;">Thank you for your purchase! Below is a detailed summary of your order.</p>
      </div>
      
      <!-- Items Table -->
      <div style="padding:0 20px 20px;">
        <table width="100%" cellspacing="0" cellpadding="12" style="border-collapse:collapse;border:1px solid #e9ecef;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#ffdf00;color:#1d1d1d;">
              <th align="left" style="font-size:13px;font-weight:600;padding:12px;">Item</th>
              <th align="center" style="font-size:13px;font-weight:600;padding:12px;width:60px;">Qty</th>
              <th align="right" style="font-size:13px;font-weight:600;padding:12px;width:80px;">Price</th>
              <th align="right" style="font-size:13px;font-weight:600;padding:12px;width:90px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((i: any, idx: number) => `
              <tr style="border-bottom:1px solid #e9ecef;${idx % 2 === 0 ? 'background:#f8f9fa;' : ''}">
                <td style="padding:12px;vertical-align:top;">
                  <div style="font-size:14px;color:#212529;font-weight:600;margin-bottom:4px;">${i.name}</div>
                  ${i.barcode ? `
                    <div style="background:#fff3cd;border-left:3px solid #ffc107;padding:6px 8px;margin-top:6px;border-radius:4px;">
                      <div style="font-size:10px;color:#856404;font-weight:600;text-transform:uppercase;margin-bottom:2px;">Barcode${i.qty > 1 ? ` (${i.qty} units)` : ''}</div>
                      <div style="font-family:'Courier New',monospace;font-size:12px;color:#212529;font-weight:600;">${i.barcode}</div>
                    </div>
                  ` : ''}
                  ${i.warrantyEnabled ? `
                    <div style="background:#d1ecf1;border-left:3px solid #17a2b8;padding:6px 8px;margin-top:6px;border-radius:4px;">
                      <div style="font-size:11px;color:#0c5460;">
                        <span style="font-weight:600;">✓ Warranty:</span> ${i.warrantyDays} days coverage
                      </div>
                    </div>
                  ` : ''}
                </td>
                <td align="center" style="padding:12px;font-size:15px;font-weight:700;color:#495057;">${i.qty}</td>
                <td align="right" style="padding:12px;font-size:14px;color:#495057;">${i.price.toLocaleString()}</td>
                <td align="right" style="padding:12px;font-size:15px;font-weight:700;color:#212529;">${i.total.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Totals Section -->
      <div style="padding:0 20px 25px;">
        <div style="background:#f8f9fa;border-radius:8px;padding:15px;border:2px solid #e9ecef;">
          <table width="100%" cellspacing="0" cellpadding="6">
            <tr>
              <td align="right" style="font-size:14px;color:#6c757d;padding:4px 0;">Subtotal:</td>
              <td align="right" style="font-size:14px;color:#212529;font-weight:600;width:120px;padding:4px 0;">${subtotal.toLocaleString()} ${currency}</td>
            </tr>
            ${discount > 0 ? `
              <tr>
                <td align="right" style="font-size:14px;color:#dc3545;padding:4px 0;">Discount:</td>
                <td align="right" style="font-size:14px;color:#dc3545;font-weight:600;padding:4px 0;">-${discount.toLocaleString()} ${currency}</td>
              </tr>
            ` : ''}
            ${vat > 0 ? `
              <tr>
                <td align="right" style="font-size:14px;color:#6c757d;padding:4px 0;">VAT:</td>
                <td align="right" style="font-size:14px;color:#212529;font-weight:600;padding:4px 0;">${vat.toLocaleString()} ${currency}</td>
              </tr>
            ` : ''}
            ${nbt > 0 ? `
              <tr>
                <td align="right" style="font-size:14px;color:#6c757d;padding:4px 0;">NBT:</td>
                <td align="right" style="font-size:14px;color:#212529;font-weight:600;padding:4px 0;">${nbt.toLocaleString()} ${currency}</td>
              </tr>
            ` : ''}
            <tr style="border-top:2px solid #ffdf00;">
              <td align="right" style="font-size:18px;color:#212529;font-weight:700;padding:12px 0 4px;">Total:</td>
              <td align="right" style="font-size:20px;color:#1d1d1d;font-weight:700;padding:12px 0 4px;">${total.toLocaleString()} ${currency}</td>
            </tr>
          </table>
        </div>
      </div>
      
      <!-- Important Notice -->
      <div style="background:#fff3cd;border-top:3px solid #ffc107;border-bottom:3px solid #ffc107;padding:20px;margin:0 20px 25px;border-radius:8px;">
        <div style="display:flex;align-items:start;">
          <div style="font-size:24px;margin-right:12px;">⚠️</div>
          <div>
            <div style="font-size:14px;color:#856404;font-weight:700;margin-bottom:6px;">Important: Save This Receipt</div>
            <div style="font-size:13px;color:#856404;line-height:1.6;">
              This invoice number <strong>${sale?.invoiceNo}</strong> is required for warranty claims and returns. Please keep this email for your records.
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background:#f8f9fa;padding:25px 20px;text-align:center;border-top:1px solid #e9ecef;">
        <div style="font-size:16px;color:#212529;font-weight:600;margin-bottom:8px;">Thank You for Your Purchase! </div>
        <div style="font-size:13px;color:#6c757d;margin-bottom:15px;">We appreciate your business and look forward to serving you again.</div>
        <div style="font-size:12px;color:#868e96;line-height:1.6;">
          Questions? Reply to this email or contact our support team.<br>
          This is an automated receipt from ${storeName}.
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
  return { subject: `Your Receipt - ${sale?.invoiceNo}`, text, html };
}

