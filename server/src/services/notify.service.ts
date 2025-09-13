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
    return { name, qty, price, total, warrantyEnabled, warrantyDays };
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
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:16px;border:1px solid #eee;">
    ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="Company Logo" style="max-height:64px;max-width:100%;object-fit:contain;" /></div>` : ''}
    <h2 style="margin:0 0 12px;">Receipt - Invoice ${sale?.invoiceNo}</h2>
    <p>Hi ${customer?.name || 'Customer'},</p>
    <p>Thank you for your purchase.</p>
    <table width="100%" cellspacing="0" cellpadding="6" style="border-collapse:collapse;margin:12px 0;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th align="left">Item</th>
          <th align="right">Qty</th>
          <th align="right">Price</th>
          <th align="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((i: any) => `
          <tr>
            <td>${i.name}</td>
            <td align="right">${i.qty}</td>
            <td align="right">${i.price}</td>
            <td align="right">${i.total}</td>
          </tr>
          ${i.warrantyEnabled ? `<tr><td colspan="4" style="font-size:12px;color:#555;padding-top:0;">Warranty: ${i.warrantyDays} days</td></tr>` : ''}
        `).join('')}
      </tbody>
    </table>
    <table width="100%" style="margin:8px 0 16px;">
      <tr><td align="right">Subtotal:</td><td align="right">${subtotal}</td></tr>
      ${discount ? `<tr><td align="right">Discount:</td><td align="right">-${discount}</td></tr>` : ''}
      ${vat ? `<tr><td align="right">VAT:</td><td align="right">${vat}</td></tr>` : ''}
      ${nbt ? `<tr><td align="right">NBT:</td><td align="right">${nbt}</td></tr>` : ''}
      <tr><td align="right"><strong>Total:</strong></td><td align="right"><strong>${total} ${currency}</strong></td></tr>
    </table>
    <p style="font-size:12px;color:#666;">If you have questions, reply to this email.</p>
  </div>
  `;
  return { subject: `Your Receipt - ${sale?.invoiceNo}`, text, html };
}

