import { formatLKR } from '@/lib/utils/currency';
import { proxyImage } from '@/lib/proxyImage';
import { useEffect, useRef, useState } from 'react';
import { settingsApi } from '@/lib/api/settings.api';

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
function openAndPrintFit(html: string, title: string) {
  const printWin = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900');
  if (!printWin) return;
  const doc = printWin.document;

  const closeLater = () => { try { printWin.close(); } catch { /* noop */ } };
  const doPrint = () => { printWin.print(); window.setTimeout(closeLater, 400); };

  const render = () => {
    doc.title = title;
    const style = doc.createElement('style');
    style.textContent = `@page { size: auto; margin: 0; }
      html, body { height: 100%; }
      body { margin: 0; background: #fff; }
      /* Ensure receipt expands to page width in this mode */
      .receipt { width: 100% !important; box-sizing: border-box; padding-left: 10mm; padding-right: 10mm; color: #000; font-family: 'Consolas','Courier New',monospace; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt .store-block img { width: 110px; height: auto; object-fit: contain; margin: 0 auto 6px; display: block; }
      .receipt h1 { font-size: 18px; margin: 0 0 4px; font-family: Arial, Helvetica, sans-serif; }
      .receipt .row { font-size: 12px; display:flex; justify-content: space-between; gap:6px; }
      .receipt table { width: 100%; border-collapse: collapse; }
      .receipt th, .receipt td { font-size: 12px; text-align: left; padding: 2px 0; }
      .receipt .qty, .receipt .price, .receipt .total { width: auto; text-align: right; }
      .receipt hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }`;
    doc.head.appendChild(style);

    const container = doc.createElement('div');
    container.innerHTML = html;
    doc.body.appendChild(container);
    const waitForImages = () => {
      const imgs = Array.from(doc.images || []);
      if (imgs.length === 0) return Promise.resolve();
      return Promise.race([
        Promise.all(imgs.map(img => new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })) ),
        new Promise<void>((resolve) => setTimeout(resolve, 500))
      ]);
    };

    const proceed = async () => {
      try { await (doc as any).fonts?.ready; } catch {}
      try { await waitForImages(); } catch {}
      printWin.focus();
      doPrint();
    };
    proceed();
  };

  if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
    render();
  } else {
    doc.addEventListener('DOMContentLoaded', render, { once: true });
  }
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
            style={{ width: paperWidth === 58 ? '58mm' : '80mm', margin: '0 auto', background: '#fff', color: '#000', padding: 8, borderRadius: 6 }}
            ref={receiptRef}
          >
            <div className="store-block" style={{ textAlign: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid #000' }}>
              {showLogo && (
                <img src={proxyImage(logoUrl || '/logo.jpg')} alt="Company Logo" style={{ width: '28mm', maxWidth: 120, height: 'auto', objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />
              )}
              <h1 style={{ fontSize: 20, margin: '0 0 4px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 700 }}>{store?.name || 'VoltZone'}</h1>
              {store?.address && (<div className="muted small" style={{ fontSize: 11, color: '#555' }}>{store.address}</div>)}
              {(store?.phone || store?.email) && (
                <div className="muted small" style={{ fontSize: 11, color: '#555' }}>{[store.phone, store.email].filter(Boolean).join(' | ')}</div>
              )}
            </div>
            <div style={{ background: '#f5f5f5', padding: '6px 8px', marginBottom: 8, borderRadius: 4 }}>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 12, marginBottom: 3 }}><span style={{ fontWeight: 600 }}>Invoice</span><span style={{ fontWeight: 700 }}>{invoiceNo}</span></div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 11 }}><span>Date</span><span>{new Date().toLocaleDateString()}</span></div>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 11 }}><span>Time</span><span>{new Date().toLocaleTimeString()}</span></div>
              {cashierName && (<div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 11 }}><span>Cashier</span><span>{cashierName}</span></div>)}
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 11 }}><span>Payment</span><span style={{ fontWeight: 600 }}>{(method || 'cash').replace(/_/g, ' ').toUpperCase()}</span></div>
              {promoCode && <div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 11 }}><span>Promo</span><span style={{ color: '#0066cc', fontWeight: 600 }}>{promoCode}</span></div>}
            </div>
            <hr style={{ borderTop: '2px solid #000', margin: '8px 0' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000' }}>
                  <th style={{ textAlign: 'left', fontSize: 11, padding: '4px 0', fontWeight: 700 }}>Item</th>
                  <th className="qty" style={{ width: '10mm', textAlign: 'right', fontSize: 11, padding: '4px 0', fontWeight: 700 }}>Qty</th>
                  <th className="price" style={{ width: '18mm', textAlign: 'right', fontSize: 11, padding: '4px 0', fontWeight: 700 }}>Price</th>
                  <th className="total" style={{ width: '22mm', textAlign: 'right', fontSize: 11, padding: '4px 0', fontWeight: 700 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <>
                    <tr key={`${i.name}-${i.qty}-${i.total}-${idx}`} style={{ borderBottom: '1px solid #ddd' }}>
                      <td className="item-name" style={{ fontSize: 12, padding: '6px 0', fontWeight: 500 }}>{i.name}</td>
                      <td className="qty" style={{ textAlign: 'right', fontSize: 12, padding: '6px 0', fontWeight: 600 }}>{i.qty}</td>
                      <td className="price" style={{ textAlign: 'right', fontSize: 12, padding: '6px 0' }}>{formatLKR(i.price)}</td>
                      <td className="total" style={{ textAlign: 'right', fontSize: 12, padding: '6px 0', fontWeight: 600 }}>{formatLKR(i.total)}</td>
                    </tr>
                    {(i.barcode || i.barcodes) && (
                      <tr key={`${i.name}-barcode-${idx}`}>
                        <td colSpan={4} style={{ fontSize: 9, padding: '2px 0 6px 4px', color: '#666', background: '#fafafa' }}>
                          {i.barcodes && i.barcodes.length > 0 ? (
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 10 }}>Barcodes ({i.barcodes.length}):</span>
                              {i.barcodes.map((bc, bcIdx) => (
                                <div key={bcIdx} style={{ marginLeft: 4, fontFamily: 'monospace' }}>#{bcIdx + 1}: {bc}</div>
                              ))}
                            </div>
                          ) : i.barcode ? (
                            <div style={{ fontFamily: 'monospace' }}>
                              <span style={{ fontWeight: 600, fontSize: 10 }}>Barcode{i.qty > 1 ? ` (${i.qty} units)` : ''}:</span> {i.barcode}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            <hr style={{ borderTop: '2px solid #000', margin: '8px 0' }} />
            <div style={{ background: '#f9f9f9', padding: '8px', borderRadius: 4 }}>
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 12, marginBottom: 2 }}><span>Subtotal</span><span>{formatLKR(subtotal)}</span></div>
              {discount > 0 && <div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 12, marginBottom: 2, color: '#d32f2f' }}><span>Discount</span><span>-{formatLKR(discount)}</span></div>}
              {tax > 0 && <div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 12, marginBottom: 4 }}><span>Tax</span><span>{formatLKR(tax)}</span></div>}
              <div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 14, paddingTop: 6, borderTop: '2px solid #333' }}><strong style={{ fontWeight: 700 }}>Total</strong><strong style={{ fontWeight: 700 }}>{formatLKR(total)}</strong></div>
            </div>
            {warranties.length > 0 && (
              <>
                <hr style={{ margin: '8px 0' }} />
                <div style={{ background: '#e3f2fd', padding: '8px', borderRadius: 4, border: '1px solid #90caf9' }}>
                  <div className="muted" style={{ fontSize: 10, color: '#1565c0', lineHeight: 1.4 }}>
                    ✓ Warranty for eligible items is linked to Invoice <strong>#{invoiceNo}</strong>. Keep this receipt for reference.
                  </div>
                  {periodLabel && (
                    <div className="muted" style={{ fontSize: 10, color: '#1565c0', marginTop: 2 }}>
                      {uniquePeriods.length > 1 ? 'Periods' : 'Period'}: <strong>{periodLabel}</strong>{endsOn ? <> (ends {endsOn})</> : null}
                    </div>
                  )}
                </div>
              </>
            )}
            {payments && payments.length > 0 && (
              <>
                <hr style={{ margin: '8px 0' }} />
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Payments</div>
                {payments.map((p, idx) => {
                  const labelMethod = (p.method || '').replace(/_/g, ' ').toUpperCase();
                  const label = p.cardBrand ? `${p.cardBrand.toUpperCase()} ${labelMethod}` : labelMethod;
                  return (
                    <div key={`${p.method}-${idx}`} style={{ marginBottom: 6, background: '#f5f5f5', padding: '4px 6px', borderRadius: 3 }}>
                      <div className="row" style={{ fontSize: 12, fontWeight: 600 }}><span>{label}</span><span>{formatLKR(p.amount)}</span></div>
                    {typeof p.tendered === 'number' && (
                      <div className="row" style={{ fontSize: 10, color: '#555' }}><span>Tendered</span><span>{formatLKR(p.tendered)}</span></div>
                    )}
                    {typeof p.change === 'number' && (
                      <div className="row" style={{ fontSize: 10, color: '#555' }}><span>Balance</span><span style={{ fontWeight: 600 }}>{formatLKR(p.change)}</span></div>
                    )}
                    {p.reference && (
                      <div className="row" style={{ fontSize: 9, color: '#666', fontFamily: 'monospace' }}><span>Ref</span><span>{p.reference}</span></div>
                    )}
                    </div>
                  );
                })}
              </>
            )}
            <hr style={{ borderTop: '2px solid #000', margin: '10px 0' }} />
            <div className="muted footer" style={{ textAlign: 'center', marginTop: 8, padding: '8px 0', background: '#f9f9f9', borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: '#333', fontWeight: 600, marginBottom: 4 }}>
                ⚠️ Warranty claims require the Invoice number.
              </div>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>
                Keep this receipt safe.
              </div>
              <div style={{ fontSize: 12, color: '#000', fontWeight: 700 }}>
                Thank you for your purchase! 
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4 shrink-0 no-print flex-wrap">
          <button
            onClick={() => {
              // Thermal: temporarily force width to 100% of roll and margin 0
              const style = document.createElement('style');
              style.setAttribute('media', 'print');
              style.setAttribute('data-vz', 'print-thermal');
              style.textContent = `@media print { @page { size: 80mm auto; margin: 0; } }`;
              document.head.appendChild(style);

              document.body.classList.add('print-thermal-fit');

              const cleanup = () => {
                document.body.classList.remove('print-thermal-fit');
                try { document.head.removeChild(style); } catch {}
                window.removeEventListener('afterprint', cleanup);
              };
              window.addEventListener('afterprint', cleanup);
              setTimeout(() => {
                window.print();
                setTimeout(cleanup, 1200);
              }, 50);
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm"
            title="Use with thermal printers (80mm/58mm). Choose the thermal paper in the printer dialog."
          >
            Print (Thermal)
          </button>
          <button
            onClick={() => {
              // Fit-to-page: open a clean print window to avoid modal/overlay quirks
              const node = receiptRef.current;
              const html = node ? node.outerHTML : '';
              openAndPrintFit(html, `Receipt ${invoiceNo}`);
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm"
            title="Use when the destination has only A4/B5/etc."
          >
            Print (Fit to page)
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl font-semibold text-sm" style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}>Close</button>
        </div>
      </div>
    </div>
  );
};


