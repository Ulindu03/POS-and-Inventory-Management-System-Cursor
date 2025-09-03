import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '@/lib/api/products.api';
import { BarcodeSVG } from '@/components/ui/BarcodeSVG';

interface StickerPrintModalProps {
  product: any;
  onClose: () => void;
  initialBarcodes?: string[];
}

export const StickerPrintModal: React.FC<StickerPrintModalProps> = ({ product, onClose, initialBarcodes }) => {
  const [quantity, setQuantity] = useState(1);
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
  const [warrantyText, setWarrantyText] = useState<string>(() => {
    const d = (product?.specifications?.warranty?.duration ?? 0) as number;
    const t = (product?.specifications?.warranty?.type ?? 'months') as string;
    if (!d) return '';
    let unit = 'Month';
    if (t === 'years') unit = 'Year';
    else if (t === 'days') unit = 'Day';
    return `${d} ${unit}${d > 1 ? 's' : ''}`;
  });
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
      const { data } = await productsApi.createStickerBatch({
        productId: product._id,
        quantity,
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
      setTimeout(() => {
        // focus printable area
        printRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
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

  const gridStyle = useMemo(() => {
    if (sheetType === 'a4') {
      if (labelSize === 'a4_5x7_auto') {
        return {
          gridTemplateColumns: `repeat(${a4Cols}, ${mm(labelDims.w)})`,
          padding: mm(a4Margin),
          gap: mm(a4Gap),
        } as React.CSSProperties;
      }
      return {
        gridTemplateColumns: `repeat(auto-fill, ${mm(labelDims.w)})`,
        justifyContent: 'space-between',
      } as React.CSSProperties;
    }
  return { gridTemplateColumns: 'repeat(1, 1fr)' } as React.CSSProperties;
  }, [sheetType, labelSize, a4Cols, a4Margin, a4Gap, labelDims.w]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f0f12] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="text-lg font-semibold">Generate Stickers</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" onClick={onClose}>Close</button>
            <button className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-[#F8F8F8]/70">Product</div>
              <div className="font-semibold">{product?.name?.en || product?.name}</div>
              <div className="text-sm">Price: {product?.price?.retail?.toFixed ? product.price.retail.toFixed(2) : product?.price?.retail}</div>
            </div>
            <label className="block">
              <div className="text-sm mb-1">Quantity</div>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value || '1', 10))} className="w-full bg-white/10 rounded px-3 py-2" />
            </label>
            <label className="block">
              <div className="text-sm mb-1">Template</div>
              <select value={template} onChange={(e) => setTemplate(e.target.value as any)} className="w-full bg-white/10 rounded px-3 py-2">
                <option value="simple">Simple</option>
                <option value="bag_label">Retail bag label</option>
                <option value="electronics">Electronics (name + price + barcode)</option>
              </select>
            </label>
            <label className="block">
              <div className="text-sm mb-1">Barcode Mode</div>
              <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="w-full bg-white/10 rounded px-3 py-2">
                <option value="reuse_product_barcode">Reuse product barcode</option>
                <option value="unique_per_unit">Unique per unit</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <div className="text-sm mb-1">Label size</div>
                <select value={labelSize} onChange={(e) => setLabelSize(e.target.value as any)} className="w-full bg-white/10 rounded px-3 py-2">
                  <option value="50x25">50 x 25 mm</option>
                  <option value="50x30">50 x 30 mm</option>
                  <option value="50x35">50 x 35 mm</option>
                  <option value="40x30">40 x 30 mm</option>
                  {sheetType === 'a4' && (
                    <option value="a4_5x7_auto">A4 5 x 7 auto (sheet)</option>
                  )}
                </select>
              </label>
              <label className="block">
                <div className="text-sm mb-1">Media</div>
                <select value={sheetType} onChange={(e) => setSheetType(e.target.value as any)} className="w-full bg-white/10 rounded px-3 py-2">
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
                <label className="block">
                  <div className="text-sm mb-1">Warranty text</div>
                  <input type="text" value={warrantyText} onChange={(e) => setWarrantyText(e.target.value)} className="w-full bg-white/10 rounded px-3 py-2" placeholder="1 Year" />
                </label>
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
            <button onClick={onGenerate} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 rounded px-3 py-2 font-semibold">
              {loading ? 'Generating…' : 'Generate Preview'}
            </button>
            <button onClick={onLoadLastBatch} disabled={loading} className="w-full bg-white/10 hover:bg-white/20 rounded px-3 py-2">Load Last Batch</button>
            {barcodes && (
              <button onClick={() => window.print()} className="w-full bg-white/10 hover:bg-white/20 rounded px-3 py-2">Print</button>
            )}
            <button onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 rounded px-3 py-2">Cancel</button>
      </div>
  <div className={`md:col-span-2 ${sheetType === 'a4' ? 'labels-a4' : 'labels-roll'}`}>
            <div className="text-sm text-[#F8F8F8]/70 mb-2">Preview</div>
            <div
              ref={printRef}
              className="print-area"
              style={sheetType === 'roll' ? { width: mm(labelDims.w), margin: '0 auto' } : undefined}
            >
              <div className={`labels-grid ${sheetType === 'roll' ? 'roll' : ''}`} style={gridStyle}>
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
                        <div className="w-full">
                          <div className="flex items-center justify-center gap-1 text-[7px] leading-tight w-full">
                            <div className="min-w-0 max-w-[50%] truncate text-center">{brandText || ''}</div>
                            <div className="min-w-0 max-w-[50%] truncate text-center">{skuText ? `SKU: ${skuText}` : ''}</div>
                          </div>
                          {warrantyText && (
                            <div className="text-[7px] text-center leading-tight">Warranty: {warrantyText}</div>
                          )}
                          {specsText && (
                            <div className="text-[7px] text-center leading-tight">{specsText}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
