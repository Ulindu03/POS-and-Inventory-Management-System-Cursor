import { formatLKR } from '@/lib/utils/currency';
import { proxyImage } from '@/lib/proxyImage';
import { useEffect, useRef, useState } from 'react';
import { settingsApi } from '@/lib/api/settings.api';
import { BarcodeSVG } from '@/components/ui/BarcodeSVG';

interface Item { name: string; qty: number; price: number; total: number; barcode?: string; barcodes?: string[] }
interface Props {
  open: boolean;
  onClose: () => void;
  invoiceNo: string;
  items: Item[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  method?: string;
  payments?: Array<{ method: string; amount: number; tendered?: number; change?: number; cardBrand?: string | null; reference?: string }>;
  promoCode?: string | null;
  cashierName?: string;
  paperWidth?: 80 | 58; // preview width toggle; print will force 80mm unless overridden
  warranties?: Array<{ warrantyNo: string; status: string; periodDays: number; endDate?: string; requiresActivation?: boolean }>;
}

// Open a clean print window and print the provided HTML, scaled to fit page width.
function openAndPrintFit(receiptEl: HTMLElement | null, title: string) {
  if (!receiptEl) return;
  
  const printWin = window.open('', '_blank', 'width=800,height=900');
  if (!printWin) {
    alert('Please allow popups to print the receipt');
    return;
  }
  
  const doc = printWin.document;
  
  // Clone the receipt and capture current image sources
  const clone = receiptEl.cloneNode(true) as HTMLElement;
  
  // Copy all image sources (important for dynamically generated barcode images)
  const originalImgs = receiptEl.querySelectorAll('img');
  const clonedImgs = clone.querySelectorAll('img');
  originalImgs.forEach((origImg, idx) => {
    if (clonedImgs[idx] && origImg.src) {
      clonedImgs[idx].src = origImg.src;
    }
  });
  
  // Build the print document
  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { 
      width: 100%; 
      height: 100%;
      font-family: 'Segoe UI', Arial, sans-serif; 
      background: #fff; 
      color: #000;
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact;
    }
    body { padding: 10mm; display: flex; justify-content: center; }
    .receipt-wrapper {
      width: 100%;
      max-width: 90mm;
      background: #fff;
      padding: 5mm;
      border: 1px solid #ddd;
      border-radius: 2mm;
    }
    .receipt {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 11px;
      line-height: 1.5;
      color: #000 !important;
      background: #fff !important;
    }
    .receipt .store-block { text-align: center; margin-bottom: 4mm; padding-bottom: 3mm; border-bottom: 2px dashed #333; }
    .receipt .store-block img { max-width: 30mm; height: auto; margin: 0 auto 3mm; display: block; }
    .receipt .store-name { font-size: 18px !important; font-weight: 700; margin: 0 0 2mm; color: #000; }
    .receipt .store-info { font-size: 10px; color: #444; margin: 1mm 0; }
    .receipt .invoice-box { background: #f5f5f5; padding: 3mm; margin-bottom: 4mm; border-radius: 2mm; }
    .receipt .row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 1mm 0; }
    .receipt .row-label { color: #555; }
    .receipt .row-value { font-weight: 600; color: #000; }
    .receipt .divider { border: 0; border-top: 1px dashed #999; margin: 3mm 0; }
    .receipt table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 2mm 0; }
    .receipt th { text-align: left; font-weight: 700; padding: 2mm 1mm; border-bottom: 2px solid #333; font-size: 11px; }
    .receipt th.r { text-align: right; }
    .receipt td { padding: 2mm 1mm; vertical-align: top; border-bottom: 1px solid #ddd; }
    .receipt td.r { text-align: right; }
    .receipt .item-name { font-weight: 600; font-size: 11px; }
    .receipt .barcode-row { font-size: 9px; color: #666; font-family: monospace; margin-top: 1mm; }
    .receipt .totals-box { background: #f5f5f5; padding: 3mm; border-radius: 2mm; margin-top: 3mm; }
    .receipt .total-row { display: flex; justify-content: space-between; font-size: 11px; padding: 1mm 0; }
    .receipt .grand-total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; border-top: 2px solid #333; padding-top: 3mm; margin-top: 2mm; }
    .receipt .payments-box { margin-top: 3mm; }
    .receipt .payment-item { background: #f9f9f9; padding: 2mm 3mm; border-radius: 2mm; margin-bottom: 2mm; font-size: 10px; border: 1px solid #eee; }
    .receipt .warranty-box { background: #e3f2fd; border: 1px solid #90caf9; padding: 3mm; border-radius: 2mm; margin-top: 3mm; font-size: 10px; color: #1565c0; }
    .receipt .barcode-section { text-align: center; margin: 4mm 0; padding: 3mm; background: #fafafa; border-radius: 2mm; border: 1px solid #eee; }
    .receipt .barcode-section img { max-width: 70mm; height: 45px; margin: 0 auto; display: block; object-fit: contain; }
    .receipt .barcode-text { font-size: 12px; font-weight: 700; margin-top: 2mm; letter-spacing: 2px; font-family: monospace; color: #000; }
    .receipt .footer { text-align: center; margin-top: 4mm; padding-top: 3mm; border-top: 2px dashed #333; }
    .receipt .footer-warning { font-size: 10px; color: #c62828; margin-bottom: 2mm; font-weight: 600; }
    .receipt .footer-thanks { font-weight: 700; font-size: 13px; color: #000; margin-top: 2mm; }
    @media print {
      body { padding: 0; }
      .receipt-wrapper { border: none; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-wrapper">
    ${clone.outerHTML}
  </div>
</body>
</html>`);
  doc.close();
  
  // Wait for images to load then print
  const tryPrint = () => {
    const imgs = Array.from(doc.images || []);
    const allLoaded = imgs.every(img => img.complete && img.naturalHeight > 0);
    
    if (allLoaded || imgs.length === 0) {
      setTimeout(() => {
        printWin.focus();
        printWin.print();
        setTimeout(() => { try { printWin.close(); } catch {} }, 500);
      }, 150);
    } else {
      // Wait a bit more for images
      setTimeout(tryPrint, 100);
    }
  };
  
  // Start checking after a brief delay
  setTimeout(tryPrint, 200);
}

export const ReceiptModal = ({ open, onClose, invoiceNo, items, subtotal, discount, tax, total, method, payments, promoCode, cashierName, paperWidth = 80, warranties = [] }: Props) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [store, setStore] = useState<{ name?: string; address?: string; phone?: string; email?: string } | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    settingsApi.get().then((res) => {
      const s = res.data.data || res.data;
      if (mounted) {
        setLogoUrl(s?.branding?.logoUrl || null);
        setShowLogo(Boolean(s?.receipt?.showLogo ?? true));
        setStore({
          name: s?.branding?.storeName || 'VoltZone',
          address: s?.branding?.address || '',
          phone: s?.branding?.phone || '',
          email: s?.branding?.email || '',
        });
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [open]);
  if (!open) return null;
  // Compact warranty period summary for the note below totals
  const uniquePeriods: number[] = Array.from(new Set((warranties || []).map(w => w?.periodDays).filter((d): d is number => typeof d === 'number' && d > 0)));
  const formatDays = (d: number) => (d % 365 === 0 ? `${d / 365}y` : d % 30 === 0 ? `${d / 30}m` : `${d}d`);
  const periodLabel = uniquePeriods.length
    ? (uniquePeriods.length === 1
        ? formatDays(uniquePeriods[0])
        : uniquePeriods.slice(0, 3).map(formatDays).join(', ') + (uniquePeriods.length > 3 ? '…' : ''))
    : null;
  const endsOn = warranties.length === 1 && warranties[0]?.endDate ? new Date(warranties[0].endDate as string).toLocaleDateString() : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 no-print"
        onClick={onClose}
        aria-label="Close receipt"
      />
      <div className="relative w-full max-w-md my-8 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 text-[#F8F8F8] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-3 shrink-0 no-print">
          <div className="text-lg font-semibold">Receipt Preview</div>
          <div className="opacity-80">{invoiceNo}</div>
        </div>
        <div className="print-area overflow-y-auto flex-1 min-h-0 pr-2" style={{ scrollbarWidth: 'thin' }}>
          <div
            className={`receipt ${paperWidth === 58 ? 'thermal-58' : ''}`}
            style={{ width: paperWidth === 58 ? '58mm' : '80mm', margin: '0 auto', background: '#fff', color: '#000', padding: '3mm', borderRadius: 6, fontSize: 11 }}
            ref={receiptRef}
          >
            {/* Store Header */}
            <div className="store-block" style={{ textAlign: 'center', marginBottom: '3mm', paddingBottom: '3mm', borderBottom: '1px dashed #000' }}>
              {showLogo && (
                <img src={proxyImage(logoUrl || '/logo.jpg')} alt="Logo" style={{ maxWidth: '25mm', height: 'auto', margin: '0 auto 2mm', display: 'block' }} />
              )}
              <div className="store-name" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 1mm' }}>{store?.name || 'VoltZone'}</div>
              {store?.address && <div className="store-info" style={{ fontSize: 9, color: '#333' }}>{store.address}</div>}
              {(store?.phone || store?.email) && (
                <div className="store-info" style={{ fontSize: 9, color: '#333' }}>{[store.phone, store.email].filter(Boolean).join(' | ')}</div>
              )}
            </div>

            {/* Invoice Info Box */}
            <div className="invoice-box" style={{ background: '#f5f5f5', padding: '2mm', marginBottom: '3mm', borderRadius: '1mm' }}>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                <span className="row-label" style={{ color: '#555' }}>Invoice</span>
                <span className="row-value" style={{ fontWeight: 700 }}>{invoiceNo}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span className="row-label" style={{ color: '#555' }}>Date</span>
                <span className="row-value">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span className="row-label" style={{ color: '#555' }}>Time</span>
                <span className="row-value">{new Date().toLocaleTimeString()}</span>
              </div>
              {cashierName && (
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                  <span className="row-label" style={{ color: '#555' }}>Cashier</span>
                  <span className="row-value">{cashierName}</span>
                </div>
              )}
              {promoCode && (
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                  <span className="row-label" style={{ color: '#555' }}>Promo</span>
                  <span className="row-value" style={{ color: '#0066cc', fontWeight: 600 }}>{promoCode}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="divider" style={{ borderTop: '1px dashed #333', margin: '2mm 0' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontWeight: 600, padding: '1.5mm 0', borderBottom: '1px solid #333' }}>Item</th>
                  <th className="r" style={{ textAlign: 'right', fontWeight: 600, padding: '1.5mm 0', borderBottom: '1px solid #333', width: '8mm' }}>Qty</th>
                  <th className="r" style={{ textAlign: 'right', fontWeight: 600, padding: '1.5mm 0', borderBottom: '1px solid #333', width: '15mm' }}>Price</th>
                  <th className="r" style={{ textAlign: 'right', fontWeight: 600, padding: '1.5mm 0', borderBottom: '1px solid #333', width: '18mm' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={`${i.name}-${i.qty}-${i.total}-${idx}`}>
                    <td style={{ padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '1px solid #eee' }}>
                      <div className="item-name" style={{ fontWeight: 500, fontSize: 10 }}>{i.name}</div>
                      {(i.barcode || (i.barcodes && i.barcodes.length > 0)) && (
                        <div className="barcode-row" style={{ fontSize: 8, color: '#666', marginTop: 1, fontFamily: 'monospace' }}>
                          {i.barcodes && i.barcodes.length > 0
                            ? `BC: ${i.barcodes.slice(0, 2).join(', ')}${i.barcodes.length > 2 ? ` +${i.barcodes.length - 2}` : ''}`
                            : `BC: ${i.barcode}`}
                        </div>
                      )}
                    </td>
                    <td className="r" style={{ textAlign: 'right', padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '1px solid #eee', fontWeight: 600 }}>{i.qty}</td>
                    <td className="r" style={{ textAlign: 'right', padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '1px solid #eee', fontSize: 9 }}>{formatLKR(i.price)}</td>
                    <td className="r" style={{ textAlign: 'right', padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '1px solid #eee', fontWeight: 600 }}>{formatLKR(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Box */}
            <div className="totals-box" style={{ background: '#f9f9f9', padding: '2mm', borderRadius: '1mm', marginTop: '2mm' }}>
              <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '0.5mm 0' }}>
                <span>Subtotal</span>
                <span>{formatLKR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '0.5mm 0', color: '#d32f2f' }}>
                  <span>Discount</span>
                  <span>-{formatLKR(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '0.5mm 0' }}>
                  <span>Tax</span>
                  <span>{formatLKR(tax)}</span>
                </div>
              )}
              <div className="grand-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, borderTop: '1px solid #333', paddingTop: '2mm', marginTop: '1mm' }}>
                <span>TOTAL</span>
                <span>{formatLKR(total)}</span>
              </div>
            </div>

            {/* Payments */}
            {payments && payments.length > 0 && (
              <div className="payments-box" style={{ marginTop: '2mm' }}>
                <div style={{ fontSize: 10, fontWeight: 600, marginBottom: '1mm' }}>Payments</div>
                {payments.map((p, idx) => {
                  const labelMethod = (p.method || '').replace(/_/g, ' ').toUpperCase();
                  const label = p.cardBrand ? `${p.cardBrand.toUpperCase()} ${labelMethod}` : labelMethod;
                  return (
                    <div key={`${p.method}-${idx}`} className="payment-item" style={{ background: '#f5f5f5', padding: '1.5mm 2mm', borderRadius: '1mm', marginBottom: '1mm', fontSize: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>{label}</span>
                        <span>{formatLKR(p.amount)}</span>
                      </div>
                      {typeof p.tendered === 'number' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#555' }}>
                          <span>Tendered</span>
                          <span>{formatLKR(p.tendered)}</span>
                        </div>
                      )}
                      {typeof p.change === 'number' && p.change > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#555' }}>
                          <span>Change</span>
                          <span style={{ fontWeight: 600 }}>{formatLKR(p.change)}</span>
                        </div>
                      )}
                      {p.reference && (
                        <div style={{ fontSize: 8, color: '#666', fontFamily: 'monospace', marginTop: 1 }}>Ref: {p.reference}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Warranty Info */}
            {warranties.length > 0 && (
              <div className="warranty-box" style={{ background: '#e8f4fd', border: '1px solid #90caf9', padding: '2mm', borderRadius: '1mm', marginTop: '2mm', fontSize: 9, color: '#1565c0' }}>
                <div>✓ Warranty linked to Invoice <strong>#{invoiceNo}</strong></div>
                {periodLabel && (
                  <div style={{ marginTop: 1 }}>
                    Period: <strong>{periodLabel}</strong>{endsOn ? ` (ends ${endsOn})` : ''}
                  </div>
                )}
              </div>
            )}

            {/* Barcode Section */}
            <div className="barcode-section" style={{ textAlign: 'center', margin: '3mm 0', padding: '2mm', background: '#fafafa', borderRadius: '1mm' }}>
              <BarcodeSVG value={invoiceNo} height={40} width={1.5} />
              <div className="barcode-text" style={{ fontSize: 10, fontWeight: 600, marginTop: '1mm', letterSpacing: 1, fontFamily: 'monospace' }}>{invoiceNo}</div>
            </div>

            {/* Footer */}
            <div className="footer" style={{ textAlign: 'center', marginTop: '3mm', paddingTop: '2mm', borderTop: '1px dashed #333' }}>
              <div className="footer-warning" style={{ fontSize: 9, color: '#d32f2f', marginBottom: '1mm' }}>
                ⚠️ Warranty claims require Invoice number
              </div>
              <div style={{ fontSize: 9, color: '#555', marginBottom: '1mm' }}>Keep this receipt safe</div>
              <div className="footer-thanks" style={{ fontWeight: 600, fontSize: 11 }}>Thank you for your purchase!</div>
            </div>
          </div>
        </div>
        
        {/* Print Actions */}
        <div className="mt-4 shrink-0 no-print space-y-2">
          {/* Print Options */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Clone receipt content and append to body for clean printing
                const receiptEl = receiptRef.current;
                if (!receiptEl) return;
                
                // Create a print container at body level
                const printContainer = document.createElement('div');
                printContainer.className = 'print-area thermal-print-container';
                printContainer.style.cssText = 'position: fixed; inset: 0; z-index: 99999; background: #fff; overflow: auto; padding: 0;';
                
                // Clone the receipt
                const clone = receiptEl.cloneNode(true) as HTMLElement;
                clone.style.width = '80mm';
                clone.style.margin = '0 auto';
                clone.style.padding = '1.5mm';
                clone.style.background = '#fff';
                clone.style.color = '#000';
                printContainer.appendChild(clone);
                
                // Add print styles
                const style = document.createElement('style');
                style.setAttribute('media', 'print');
                style.setAttribute('data-vz', 'print-thermal');
                style.textContent = `
                  @media print { 
                    @page { size: 80mm auto; margin: 0; }
                    body > *:not(.thermal-print-container) { display: none !important; visibility: hidden !important; }
                    .thermal-print-container { position: static !important; display: block !important; visibility: visible !important; }
                    .thermal-print-container * { visibility: visible !important; }
                    .thermal-print-container .receipt { width: 100% !important; }
                  }
                `;
                document.head.appendChild(style);
                document.body.appendChild(printContainer);

                const cleanup = () => {
                  try { document.body.removeChild(printContainer); } catch {}
                  try { document.head.removeChild(style); } catch {}
                  window.removeEventListener('afterprint', cleanup);
                };
                window.addEventListener('afterprint', cleanup);
                
                setTimeout(() => {
                  window.print();
                  setTimeout(cleanup, 1200);
                }, 50);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all text-sm text-[#F8F8F8]"
              title="Use with thermal printers (80mm/58mm roll paper)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Thermal</span>
            </button>
            
            <button
              onClick={() => {
                // Fit-to-page: open a clean print window to avoid modal/overlay quirks
                openAndPrintFit(receiptRef.current, `Receipt ${invoiceNo}`);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all text-sm text-[#F8F8F8]"
              title="Use when printing to A4/Letter paper"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>A4 / PDF</span>
            </button>
          </div>
          
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]" 
            style={{ background: 'linear-gradient(135deg, #FFE100, #FFD100)', color: '#000' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};


