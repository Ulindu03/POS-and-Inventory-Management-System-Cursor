import { useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '@/lib/api/products.api';
import { BarcodeSVG } from '@/components/ui/BarcodeSVG';
import { toast } from 'sonner';

interface StickerPrintModalProps {
  product: any;
  onClose: () => void;
  initialBarcodes?: string[];
}

export const StickerPrintModal: React.FC<StickerPrintModalProps> = ({ product, onClose, initialBarcodes }) => {
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [labelSize, setLabelSize] = useState<'50x25' | '50x30' | '50x35' | '40x30' | 'a4_5x7_auto'>('50x25');
  const [sheetType, setSheetType] = useState<'roll' | 'a4'>('roll');
  const [mode, setMode] = useState<'reuse_product_barcode' | 'unique_per_unit'>('reuse_product_barcode');
  const [template, setTemplate] = useState<'simple' | 'bag_label' | 'electronics'>('simple');
  // extras to match reference label
  const [mrp, setMrp] = useState<number>(() => (product?.price?.retail ?? 0));
  const [color, setColor] = useState<string>('');
  const [itemSize, setItemSize] = useState<string>('');
  const [packedDate, setPackedDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [leftText, setLeftText] = useState<string>('');
  const [rightText, setRightText] = useState<string>('');
  // electronics template fields
  const [storeName, setStoreName] = useState<string>('VoltZone Electronics');
  const [skuText, setSkuText] = useState<string>(product?.sku || '');
  const [brandText, setBrandText] = useState<string>(product?.brand || '');
  // Parse existing warranty text or product warranty
  const parseWarranty = () => {
    const d = (product?.specifications?.warranty?.duration ?? 0) as number;
    const t = (product?.specifications?.warranty?.type ?? 'months') as string;
    if (d) {
      let unit = 'month';
      if (t === 'years') unit = 'year';
      else if (t === 'days') unit = 'day';
      else if (t === 'weeks') unit = 'week';
      return { duration: d, unit };
    }
    return { duration: 1, unit: 'year' };
  };

  const initialWarranty = parseWarranty();
  const [warrantyDuration, setWarrantyDuration] = useState<number | ''>(initialWarranty.duration);
  const [warrantyUnit, setWarrantyUnit] = useState<'day' | 'week' | 'month' | 'year'>(initialWarranty.unit as 'day' | 'week' | 'month' | 'year');

  // Generate warranty text from duration and unit
  const warrantyText = useMemo(() => {
    const duration = typeof warrantyDuration === 'number' ? warrantyDuration : 0;
    if (duration <= 0) return '';
    const unitMap: Record<string, string> = {
      day: duration === 1 ? 'Day' : 'Days',
      week: duration === 1 ? 'Week' : 'Weeks',
      month: duration === 1 ? 'Month' : 'Months',
      year: duration === 1 ? 'Year' : 'Years',
    };
    return `${duration} ${unitMap[warrantyUnit] || warrantyUnit}`;
  }, [warrantyDuration, warrantyUnit]);
  const [specsText, setSpecsText] = useState<string>('');
  const [inclVat, setInclVat] = useState<boolean>(false);
  const [barcodes, setBarcodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const lineStyle: React.CSSProperties = { width: '100%', borderTop: '1px solid #333', opacity: 0.6, margin: '1px 0' };

  // A4 sheet preset (like sample): default 5 columns x 7 rows
  const [a4Cols, setA4Cols] = useState<number>(5);
  const [a4Rows, setA4Rows] = useState<number>(7);
  const [a4Gap, setA4Gap] = useState<number>(3); // mm
  const [a4Margin, setA4Margin] = useState<number>(10); // mm

  useEffect(() => {
    // Load server sticker defaults in future if needed
  }, []);

  useEffect(() => {
    if (initialBarcodes && initialBarcodes.length > 0) setBarcodes(initialBarcodes);
  }, [initialBarcodes]);

  const onGenerate = async () => {
    setLoading(true);
    try {
      const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
      const { data } = await productsApi.createStickerBatch({
        productId: product._id,
        quantity: qty,
        mode,
        layout: {
          labelSize,
          sheetType,
          template,
          extras: {
            mrp,
            color,
            size: itemSize,
            packedDate,
            leftText,
            rightText,
            storeName,
            sku: skuText,
            brand: brandText,
            warranty: warrantyText,
            specs: specsText,
            inclVat
          }
        },
      });
      const arr = (data?.data?.barcodes) || (data?.barcodes) || [];
      setBarcodes(arr);
      if (arr.length > 0) {
        toast.success(`Generated ${arr.length} sticker${arr.length !== 1 ? 's' : ''}`, {
          description: mode === 'unique_per_unit' ? 'Each sticker has a unique barcode' : 'All stickers use the same barcode'
        });
        setTimeout(() => {
          // focus printable area
          printRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      } else {
        toast.error('No stickers generated', {
          description: 'Please check the quantity and try again'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const onLoadLastBatch = async () => {
    setLoading(true);
    try {
      const data = await productsApi.getStickerBatch({ productId: product._id });
      const arr = (data?.data?.barcodes) || (data?.barcodes) || [];
      setBarcodes(arr);
    } finally {
      setLoading(false);
    }
  };

  const onPrint = async () => {
    // Use a dedicated print window to avoid app-level print CSS hiding content
    if (!printRef.current) {
      window.print();
      return;
    }

    // Ensure barcode images are ready; regenerate if missing
    const labelNodes = Array.from(printRef.current.querySelectorAll('.labels-grid > div')) as HTMLElement[];
    labelNodes.forEach((label) => {
      try {
        const img = label.querySelector('img') as HTMLImageElement | null;
        const codeEl = Array.from(label.querySelectorAll('div')).reverse().find((d) => (d.textContent || '').trim().length > 0);
        const code = codeEl?.textContent?.trim() || '';
        if (img && code) {
          const needsSrc = !img.src || img.src.trim() === '' || img.naturalWidth === 0;
          if (needsSrc) {
            const canvas = document.createElement('canvas');
            try {
              JsBarcode(canvas, code, {
                format: /^\d{12,13}$/.test(code) ? 'EAN13' : 'CODE128',
                displayValue: false,
                height: 36,
                margin: 0,
                width: 1.3,
                background: '#fff',
                lineColor: '#000',
              });
              img.src = canvas.toDataURL('image/png');
            } catch {
              // skip
            }
          }
        }
      } catch {
        // ignore per-label errors
      }
    });

    const imgs = Array.from(printRef.current.querySelectorAll('img')) as HTMLImageElement[];
    const waits = imgs.map((img) => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const onLoad = () => { cleanup(); resolve(); };
        const onErr = () => { cleanup(); resolve(); };
        const cleanup = () => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onErr);
        };
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onErr);
        setTimeout(() => { cleanup(); resolve(); }, 1500);
      });
    });
    await Promise.all(waits);

    const printHtml = printRef.current.innerHTML;

    const gapMm = sheetType === 'a4'
      ? (labelSize === 'a4_5x7_auto' ? `${a4Gap}mm` : '2mm')
      : '2mm';
    const cols = sheetType === 'a4'
      ? (labelSize === 'a4_5x7_auto' ? a4Cols : calculateA4Columns)
      : 1;
    const colWidth = mm(labelDims.w);

    const pageSize = sheetType === 'roll' ? `${mm(labelDims.w)} auto` : 'A4';
    const pageMargin = sheetType === 'roll' ? '0mm' : '5mm';
    const bodyPadding = sheetType === 'roll' ? '0mm' : '5mm';

    const labelHeight = mm(labelDims.h);

    // NOTE: We inject the app's styles (Tailwind + components) so labels match the preview.
    // The app also includes aggressive print rules (print.css) that can break label layout.
    // These overrides are scoped to body.vz-sticker-print and use !important to win.
    const printStyles = `
      <style>
        @page { size: ${pageSize}; margin: ${pageMargin}; }
        body.vz-sticker-print { margin: 0; padding: ${bodyPadding}; background: #fff; color: #000; }
        body.vz-sticker-print * { box-sizing: border-box; }

        body.vz-sticker-print .print-area,
        body.vz-sticker-print .print-area * {
          visibility: visible !important;
        }

        body.vz-sticker-print .labels-grid {
          display: grid !important;
          grid-template-columns: repeat(${cols}, ${colWidth}) !important;
          gap: ${gapMm} !important;
          align-content: start !important;
          justify-content: ${sheetType === 'roll' ? 'center' : 'start'} !important;
          grid-auto-rows: ${labelHeight} !important;
        }

        body.vz-sticker-print .labels-grid.roll {
          grid-template-columns: repeat(1, ${colWidth}) !important;
          width: ${colWidth} !important;
          margin: 0 auto !important;
        }

        body.vz-sticker-print .labels-grid > div {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: space-between !important;
          width: ${colWidth} !important;
          height: ${labelHeight} !important;
          min-height: ${labelHeight} !important;
          max-height: ${labelHeight} !important;
          overflow: hidden !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          -webkit-region-break-inside: avoid !important;
          padding: 0.8mm !important;
          font-size: 6px !important;
          line-height: 1.1 !important;
          gap: 0.2mm !important;
          background: #fff !important;
          color: #000 !important;
          border: 1px solid #ccc !important;
          box-sizing: border-box !important;
        }

        body.vz-sticker-print .labels-grid > div > * {
          width: 100% !important;
          overflow: hidden !important;
          text-align: center !important;
        }

        /* Store name - top, bold, slightly larger */
        body.vz-sticker-print .labels-grid > div > div:first-child {
          font-size: 6px !important;
          font-weight: bold !important;
          line-height: 1 !important;
          flex-shrink: 0 !important;
        }

        /* Product name - smaller, multi-line */
        body.vz-sticker-print .labels-grid > div > div:nth-child(2) {
          font-size: 5px !important;
          line-height: 1.05 !important;
          word-wrap: break-word !important;
          flex-shrink: 0 !important;
        }

        /* Price */
        body.vz-sticker-print .labels-grid > div > div:nth-child(3) {
          font-size: 6px !important;
          font-weight: 600 !important;
          line-height: 1 !important;
          flex-shrink: 0 !important;
        }

        /* Barcode container */
        body.vz-sticker-print .labels-grid > div > div:nth-child(4) {
          flex: 0 0 auto !important;
        }

        /* Barcode number text */
        body.vz-sticker-print .labels-grid > div > div:nth-child(5) {
          font-size: 5px !important;
          font-weight: bold !important;
          line-height: 1 !important;
          letter-spacing: 0.5px !important;
          flex-shrink: 0 !important;
        }

        /* Brand + SKU + Warranty - footer - EXPAND TO FILL SPACE */
        body.vz-sticker-print .labels-grid > div > div:nth-child(n+6) {
          font-size: 4.5px !important;
          line-height: 1.1 !important;
          word-break: break-word !important;
          flex-shrink: 0 !important;
          white-space: normal !important;
          text-align: center !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        body.vz-sticker-print .labels-grid > div * {
          margin: 0 !important;
          padding: 0 !important;
          word-break: break-word !important;
          text-align: center !important;
        }

        body.vz-sticker-print .labels-grid > div img {
          display: block !important;
          max-width: 95% !important;
          width: auto !important;
          height: auto !important;
          flex-shrink: 0 !important;
          object-fit: contain !important;
        }

        /* Hide any toast/UI that might have been cloned */
        body.vz-sticker-print [data-sonner-toaster],
        body.vz-sticker-print .sonner-toast-container {
          display: none !important;
          visibility: hidden !important;
        }

        /* Never print buttons */
        body.vz-sticker-print button {
          display: none !important;
          visibility: hidden !important;
        }
      </style>
    `;

    // IMPORTANT: include the app's loaded styles (Tailwind + component CSS).
    // Without this, the cloned markup renders with default browser styles and overlaps.
    const inheritedCss = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => (node as HTMLElement).outerHTML)
      .join('\n');

    const headHtml = `
      <base href="${window.location.origin}/" />
      ${inheritedCss}
      ${printStyles}
    `;

    const w = window.open('', 'PRINT', 'height=900,width=700');
    if (!w) {
      window.print();
      return;
    }
    w.document.write('<html><head><title>Print</title>' + headHtml + '</head><body class="vz-sticker-print">');
    w.document.write('<div class="print-area">');
    w.document.write(printHtml);
    w.document.write('</div>');
    w.document.write('</body></html>');
    w.document.close();
    w.focus();

    // Wait a moment for CSS + images to apply in the new window
    setTimeout(async () => {
      try {
        // Wait for fonts if supported
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fontsReady = (w.document as any).fonts?.ready;
        if (fontsReady && typeof fontsReady.then === 'function') {
          await fontsReady;
        }
      } catch {
        // ignore
      }
      w.print();
      w.close();
    }, 500);
  };

  const mm = (n: number) => `${n}mm`;
  const labelDims = useMemo(() => {
    if (labelSize === 'a4_5x7_auto') {
      const pageW = 210; const pageH = 297;
      const usableW = pageW - 2 * a4Margin - (a4Cols - 1) * a4Gap;
      const usableH = pageH - 2 * a4Margin - (a4Rows - 1) * a4Gap;
      return { w: usableW / a4Cols, h: usableH / a4Rows };
    }
    if (labelSize === '50x25') return { w: 50, h: 25 };
    if (labelSize === '50x30') return { w: 50, h: 30 };
    if (labelSize === '50x35') return { w: 50, h: 35 };
    if (labelSize === '40x30') return { w: 40, h: 30 };
    return { w: 50, h: 25 };
  }, [labelSize, a4Cols, a4Rows, a4Gap, a4Margin]);

  const barcodeDims = useMemo(() => {
    // Tighter barcode for short labels; wider bars for wider labels
    let height = 44;
    if (template === 'electronics') {
      if (labelDims.h <= 25) height = 30;
      else if (labelDims.h <= 30) height = 36;
    }
    const width = labelDims.w <= 40 ? 1.2 : 1.4;
    return { height, width };
  }, [labelDims, template]);

  const priceText = useMemo(() => {
    const raw: any = (mrp ?? product?.price?.retail);
    if (typeof raw === 'number') {
      const vat = inclVat ? ' (Incl. VAT)' : '';
      return `LKR ${raw.toFixed(2)}${vat}`;
    }
    return raw ?? '';
  }, [mrp, product?.price?.retail, inclVat]);

  // Calculate optimal columns for A4 based on label width
  const calculateA4Columns = useMemo(() => {
    if (sheetType !== 'a4' || labelSize === 'a4_5x7_auto') return a4Cols;
    const pageWidth = 210; // A4 width in mm
    const margin = 10; // margin on each side
    const gap = 2; // gap between labels
    const usableWidth = pageWidth - (margin * 2);
    const cols = Math.floor((usableWidth + gap) / (labelDims.w + gap));
    return Math.max(1, cols);
  }, [sheetType, labelSize, labelDims.w, a4Cols]);

  const gridStyle = useMemo(() => {
    if (sheetType === 'a4') {
      if (labelSize === 'a4_5x7_auto') {
        return {
          gridTemplateColumns: `repeat(${a4Cols}, ${mm(labelDims.w)})`,
          padding: mm(a4Margin),
          gap: mm(a4Gap),
        } as React.CSSProperties;
      }
      // Calculate optimal columns for A4
      const cols = calculateA4Columns;
      return {
        gridTemplateColumns: `repeat(${cols}, ${mm(labelDims.w)})`,
        padding: mm(10),
        gap: mm(2),
        justifyContent: 'start',
      } as React.CSSProperties;
    }
    // For roll, use single column but allow better spacing
    return { 
      gridTemplateColumns: 'repeat(1, 1fr)',
      gap: mm(2),
    } as React.CSSProperties;
  }, [sheetType, labelSize, a4Cols, a4Margin, a4Gap, labelDims.w, calculateA4Columns]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f0f12] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10 no-print">
          <div className="text-lg font-semibold">Generate Stickers</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" onClick={onClose}>Close</button>
            <button className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto no-print" style={{ overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 pb-8 no-print" style={{ position: 'relative' }}>
          <div className="space-y-3 no-print" style={{ position: 'relative', zIndex: 1 }}>
            <div>
              <div className="text-sm text-[#F8F8F8]/70">Product</div>
              <div className="font-semibold">{product?.name?.en || product?.name}</div>
              <div className="text-sm">Price: {product?.price?.retail?.toFixed ? product.price.retail.toFixed(2) : product?.price?.retail}</div>
              <div className="text-sm mt-1">
                <span className="text-[#F8F8F8]/70">Stock Available: </span>
                <span className={`font-medium ${(product?.stock?.current ?? 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {product?.stock?.current ?? 0}
                </span>
              </div>
            </div>
            <label className="block">
              <div className="text-sm mb-1">Quantity</div>
              <input 
                type="number" 
                min={1}
                max={product?.stock?.current ?? 0}
                value={quantity} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setQuantity('');
                  } else {
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) {
                      setQuantity(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  const stockAvailable = product?.stock?.current ?? 0;
                  if (val === '' || isNaN(parseInt(val, 10)) || parseInt(val, 10) < 1) {
                    setQuantity(1);
                  } else if (parseInt(val, 10) > stockAvailable) {
                    setQuantity(stockAvailable > 0 ? stockAvailable : 1);
                  }
                }}
                className={`w-full bg-white/10 rounded px-3 py-2 ${typeof quantity === 'number' && quantity > (product?.stock?.current ?? 0) ? 'border border-red-500' : ''}`}
              />
              {typeof quantity === 'number' && quantity > (product?.stock?.current ?? 0) && (
                <p className="text-xs text-red-400 mt-1">Quantity exceeds available stock ({product?.stock?.current ?? 0})</p>
              )}
            </label>
            <label className="block relative z-50">
              <div className="text-sm mb-1">Template</div>
              <select value={template} onChange={(e) => setTemplate(e.target.value as any)} className="w-full bg-white/10 rounded px-3 py-2 vz-select">
                <option value="simple">Simple</option>
                <option value="bag_label">Retail bag label</option>
                <option value="electronics">Electronics (name + price + barcode)</option>
              </select>
            </label>
            <label className="block relative z-40">
              <div className="text-sm mb-1">Barcode Mode</div>
              <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="w-full bg-white/10 rounded px-3 py-2 vz-select">
                <option value="reuse_product_barcode">Reuse product barcode</option>
                <option value="unique_per_unit">Unique per unit</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block relative z-30">
                <div className="text-sm mb-1">Label size</div>
                <select value={labelSize} onChange={(e) => setLabelSize(e.target.value as any)} className="w-full bg-white/10 rounded px-3 py-2 vz-select">
                  <option value="50x25">50 x 25 mm</option>
                  <option value="50x30">50 x 30 mm</option>
                  <option value="50x35">50 x 35 mm</option>
                  <option value="40x30">40 x 30 mm</option>
                  {sheetType === 'a4' && (
                    <option value="a4_5x7_auto">A4 5 x 7 auto (sheet)</option>
                  )}
                </select>
              </label>
              <label className="block relative z-30">
                <div className="text-sm mb-1">Media</div>
                <select value={sheetType} onChange={(e) => setSheetType(e.target.value as any)} className="w-full bg-white/10 rounded px-3 py-2 vz-select">
                  <option value="roll">Roll (continuous)</option>
                  <option value="a4">A4 sheet</option>
                </select>
              </label>
            </div>
            {sheetType === 'a4' && labelSize === 'a4_5x7_auto' && (
              <div className="grid grid-cols-4 gap-2 text-sm">
                <label className="block">
                  <div className="text-xs mb-1">Columns</div>
                  <input type="number" min={1} value={a4Cols} onChange={(e) => setA4Cols(parseInt(e.target.value || '5', 10))} className="w-full bg-white/10 rounded px-2 py-1" />
                </label>
                <label className="block">
                  <div className="text-xs mb-1">Rows</div>
                  <input type="number" min={1} value={a4Rows} onChange={(e) => setA4Rows(parseInt(e.target.value || '7', 10))} className="w-full bg-white/10 rounded px-2 py-1" />
                </label>
                <label className="block">
                  <div className="text-xs mb-1">Gap (mm)</div>
                  <input type="number" min={0} value={a4Gap} onChange={(e) => setA4Gap(parseFloat(e.target.value || '3'))} className="w-full bg-white/10 rounded px-2 py-1" />
                </label>
                <label className="block">
                  <div className="text-xs mb-1">Margin (mm)</div>
                  <input type="number" min={0} value={a4Margin} onChange={(e) => setA4Margin(parseFloat(e.target.value || '10'))} className="w-full bg-white/10 rounded px-2 py-1" />
                </label>
              </div>
            )}
            {template === 'bag_label' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <div className="text-sm mb-1">MRP</div>
                  <input type="number" min={0} value={mrp} onChange={(e) => setMrp(parseFloat(e.target.value || '0'))} className="w-full bg-white/10 rounded px-3 py-2" />
                </label>
                <label className="block">
                  <div className="text-sm mb-1">Packed Date</div>
                  <input type="date" value={packedDate} onChange={(e) => setPackedDate(e.target.value)} className="w-full bg-white/10 rounded px-3 py-2" />
                </label>
                <label className="block">
                  <div className="text-sm mb-1">Colour</div>
                  <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="w-full bg-white/10 rounded px-3 py-2" />
                </label>
                <label className="block">
                  <div className="text-sm mb-1">Size</div>
                  <input type="text" value={itemSize} onChange={(e) => setItemSize(e.target.value)} className="w-full bg-white/10 rounded px-3 py-2" />
                </label>
                <label className="block">
                  <div className="text-sm mb-1">Left text (vertical)</div>
                  <input type="text" value={leftText} onChange={(e) => setLeftText(e.target.value)} className="w-full bg-white/10 rounded px-3 py-2" />
                </label>
                <label className="block">
                  <div className="text-sm mb-1">Right text (vertical)</div>
                  <input type="text" value={rightText} onChange={(e) => setRightText(e.target.value)} className="w-full bg-white/10 rounded px-3 py-2" />
                </label>
              </div>
            )}
            {template === 'electronics' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="block col-span-2">
                  <div className="text-sm mb-1">Store / Shop name</div>
                  <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full bg-white/10 rounded px-3 py-2" placeholder="VoltZone Electronics" />
                </label>
                <label className="block">
                  <div className="text-sm mb-1">Brand</div>
                  <input type="text" value={brandText} onChange={(e) => setBrandText(e.target.value)} className="w-full bg-white/10 rounded px-3 py-2" />
                </label>
                <label className="block">
                  <div className="text-sm mb-1">SKU / Item code</div>
                  <input type="text" value={skuText} onChange={(e) => setSkuText(e.target.value)} className="w-full bg-white/10 rounded px-3 py-2" />
                </label>
                <label className="block">
                  <div className="text-sm mb-1">Price</div>
                  <input type="number" min={0} value={mrp} onChange={(e) => setMrp(parseFloat(e.target.value || '0'))} className="w-full bg-white/10 rounded px-3 py-2" />
                </label>
                <div className="grid grid-cols-3 gap-2 items-end col-span-2">
                  <label className="block col-span-2">
                    <div className="text-sm mb-1">Warranty Duration</div>
                    <input 
                      type="number" 
                      min={1}
                      value={warrantyDuration} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setWarrantyDuration('');
                        } else {
                          const num = parseInt(val, 10);
                          if (!isNaN(num) && num > 0) {
                            setWarrantyDuration(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val === '' || isNaN(parseInt(val, 10)) || parseInt(val, 10) < 1) {
                          setWarrantyDuration(1);
                        }
                      }}
                      className="w-full bg-white/10 rounded px-3 py-2 h-[42px]" 
                      placeholder="1"
                    />
                  </label>
                  <label className="block relative" style={{ zIndex: 100 }}>
                    <div className="text-sm mb-1">Unit</div>
                    <select 
                      value={warrantyUnit} 
                      onChange={(e) => setWarrantyUnit(e.target.value as 'day' | 'week' | 'month' | 'year')} 
                      className="w-full bg-white/10 rounded px-3 py-2 vz-select h-[42px]"
                      style={{ position: 'relative', zIndex: 100 }}
                    >
                      <option value="day">Day(s)</option>
                      <option value="week">Week(s)</option>
                      <option value="month">Month(s)</option>
                      <option value="year">Year(s)</option>
                    </select>
                  </label>
                </div>
                <label className="block col-span-2">
                  <div className="text-sm mb-1">Specs (short)</div>
                  <input type="text" value={specsText} onChange={(e) => setSpecsText(e.target.value)} className="w-full bg-white/10 rounded px-3 py-2" placeholder="9W | 6500K | E27" />
                </label>
                <label className="flex items-center gap-2 col-span-2 text-sm">
                  <input type="checkbox" checked={inclVat} onChange={(e) => setInclVat(e.target.checked)} />
                  <span>Price includes VAT</span>
                </label>
              </div>
            )}
            <button 
              onClick={onGenerate} 
              disabled={loading || !quantity || (typeof quantity === 'number' && quantity < 1) || (typeof quantity === 'number' && quantity > (product?.stock?.current ?? 0))} 
              className="w-full bg-purple-600 hover:bg-purple-700 rounded px-3 py-2 font-semibold disabled:opacity-50"
            >
              {loading 
                ? `Generating ${typeof quantity === 'number' ? quantity : 1} sticker${(typeof quantity === 'number' ? quantity : 1) !== 1 ? 's' : ''}…` 
                : `Generate ${typeof quantity === 'number' ? quantity : 1} Sticker${(typeof quantity === 'number' ? quantity : 1) !== 1 ? 's' : ''}`
              }
            </button>
            <button onClick={onLoadLastBatch} disabled={loading} className="w-full bg-white/10 hover:bg-white/20 rounded px-3 py-2">Load Last Batch</button>
            {barcodes && (
              <button onClick={onPrint} className="w-full bg-white/10 hover:bg-white/20 rounded px-3 py-2">Print</button>
            )}
            <button onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 rounded px-3 py-2">Cancel</button>
      </div>
  <div className={`md:col-span-2 ${sheetType === 'a4' ? 'labels-a4' : 'labels-roll'}`}>
            <div className="flex items-center justify-between mb-2 no-print">
              <div className="text-sm text-[#F8F8F8]/70 font-semibold">Preview</div>
              {barcodes && barcodes.length > 0 && (
                <div className="text-xs text-green-400 font-medium">
                  ✓ {barcodes.length} sticker{barcodes.length !== 1 ? 's' : ''} generated
                </div>
              )}
            </div>
            {barcodes && barcodes.length > 0 && (
              <div className="mb-2 flex items-center justify-between text-xs text-gray-400 no-print">
                <div>
                  {sheetType === 'a4' && (
                    <span>Layout: {calculateA4Columns} column{calculateA4Columns !== 1 ? 's' : ''} per page</span>
                  )}
                  {sheetType === 'roll' && (
                    <span>Continuous roll format</span>
                  )}
                </div>
              </div>
            )}
            <div 
              className="overflow-auto max-h-[60vh] border border-white/10 rounded p-2 bg-white/5 preview-wrapper"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div
                ref={printRef}
                className={`print-area labels-print-area ${sheetType === 'a4' ? 'labels-a4-print' : 'labels-roll-print'}`}
                style={sheetType === 'roll' ? { width: mm(labelDims.w), margin: '0 auto' } : undefined}
              >
              <div className={`labels-grid ${sheetType === 'roll' ? 'roll' : ''}`} style={gridStyle}>
                {/* Render all barcodes - browser handles rendering efficiently */}
                {(barcodes || []).map((code, i) => (
                  <div
                    key={`${code}-${i}`}
                    className="bg-white text-black rounded p-1 border border-gray-300 flex flex-col items-center justify-center"
                    style={{ width: mm(labelDims.w), height: mm(labelDims.h), breakInside: 'avoid' as any }}
                  >
                    {template === 'simple' && (
                      <>
                        <div className="text-[10px] font-semibold mb-1 text-center line-clamp-2 w-full">{product?.name?.en || product?.name}</div>
                        <div className="text-[10px] mb-1">{typeof (mrp ?? product?.price?.retail) === 'number' ? (mrp as number).toFixed(2) : (mrp ?? product?.price?.retail)}</div>
                        <BarcodeSVG value={code} className="w-full" height={barcodeDims.height} width={barcodeDims.width} />
                        <div className="text-[10px] mt-1 tracking-widest">{code}</div>
                      </>
                    )}
                    {template === 'bag_label' && (
                      <div className="w-full h-full flex flex-col">
                        <div className="flex items-center justify-between text-[9px] font-semibold">
                          <span>BAG LABEL</span>
                          <span>CONVERSION</span>
                        </div>
                        <div className="flex-1 flex">
                          <div className="text-[8px] rotate-180 writing-vertical-rl pr-1 opacity-80">{leftText}</div>
                          <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="text-[9px] leading-tight text-center font-medium line-clamp-2 mb-0.5">{product?.name?.en || product?.name}</div>
                            <BarcodeSVG value={code} className="w-full" height={barcodeDims.height} width={barcodeDims.width} />
                            <div className="text-[9px] font-semibold text-center">{code}</div>
                          </div>
                          <div className="text-[8px] writing-vertical-rl pl-1 opacity-80">{rightText}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-1 text-[8px] mt-0.5">
                          <div>MRP. Rs.: <span className="font-semibold">{typeof (mrp ?? product?.price?.retail) === 'number' ? (mrp as number).toFixed(0) : (mrp ?? product?.price?.retail)}</span></div>
                          <div>SIZE <span className="font-semibold">{itemSize}</span></div>
                          <div>Pkd. Dt. {packedDate ? new Date(packedDate).toLocaleDateString() : ''}</div>
                          <div>COLOUR <span className="font-semibold">{color}</span></div>
                        </div>
                      </div>
                    )}
                    {template === 'electronics' && (
                      <div className="w-full h-full flex flex-col">
                        {storeName && <div className="text-[8px] font-semibold text-center leading-none">{storeName}</div>}
                        <div style={lineStyle} />
                        <div className="text-[8px] leading-tight text-center font-medium line-clamp-2">{product?.name?.en || product?.name}</div>
                        <div className="text-[8px] text-center leading-none">{priceText}</div>
                        <div style={lineStyle} />
                        <BarcodeSVG value={code} className="w-full" height={barcodeDims.height} width={barcodeDims.width} />
                        <div className="text-[8px] text-center tracking-widest leading-none">{code}</div>
                        <div style={lineStyle} />
                        <div className="w-full flex flex-col items-center">
                          {brandText && (
                            <div className="text-[7px] leading-tight text-center w-full truncate">{brandText}</div>
                          )}
                          {(skuText || (mode === 'unique_per_unit' && code)) && (
                            <div className="text-[7px] leading-tight text-center w-full truncate">
                              {mode === 'unique_per_unit' && code 
                                ? `SKU: ${skuText ? skuText + '-' + String(i + 1).padStart(3, '0') : code}`
                                : `SKU: ${skuText}`
                              }
                            </div>
                          )}
                          {warrantyText && (
                            <div className="text-[7px] text-center leading-tight w-full">Warranty: {warrantyText}</div>
                          )}
                          {specsText && (
                            <div className="text-[7px] text-center leading-tight w-full">{specsText}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            </div>
            {!barcodes || barcodes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border border-white/10 rounded p-4 bg-white/5">
                No stickers generated yet. Click "Generate Preview" to create stickers.
              </div>
            ) : null}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
