import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import FormModal from '@/components/ui/FormModal';
import { damagesApi } from '@/lib/api/damages.api';
import { uploadToSupabaseImages, deleteSupabasePublicImage } from '@/lib/supabase';
import { productsApi, type ProductListItem } from '@/lib/api/products.api';
import { returnsApi } from '@/lib/api/returns.api';

type Props = Readonly<{ open: boolean; onClose: () => void; defaultReason?: string }>;

export default function QuickDamageModal({ open, onClose, defaultReason }: Props) {
  const [reasons, setReasons] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [product, setProduct] = useState<ProductListItem | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [reason, setReason] = useState<string>(defaultReason || 'broken');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  // Sale/customer search mode
  const [mode, setMode] = useState<'product' | 'sale'>('product');
  const [saleQ, setSaleQ] = useState('');
  const [saleResults, setSaleResults] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [saleSearchTrigger, setSaleSearchTrigger] = useState(0);
  const [saleSearching, setSaleSearching] = useState(false);
  const [saleSearchError, setSaleSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset all state when modal closes
      setQ(''); 
      setResults([]); 
      setProduct(null); 
      setQty(1); 
      setUnitCost(0); 
      setDesc(''); 
      setPhotos([]);
      setMode('product'); 
      setSaleQ(''); 
      setSaleResults([]); 
      setSelectedSale(null);
      setSelectedItemId(null);
      setSaleSearchError(null);
      return;
    }
    damagesApi.reasons().then((r) => setReasons(r.data.data || r.data));
  }, [open]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!q) { setResults([]); return; }
      const res = await productsApi.list({ q, limit: 8 });
      if (!active) return;
      setResults(res.data.items);
    };
    run();
    return () => { active = false; };
  }, [q]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!saleQ) { setSaleResults([]); return; }
      setSaleSearching(true); setSaleSearchError(null);
      try {
        // Search by invoice number, customer NIC, or phone
        const searchQuery = saleQ.trim();
        const res = await returnsApi.lookupSales({ 
          invoiceNo: searchQuery, 
          customerPhone: searchQuery, 
          customerNIC: searchQuery,
          customerName: searchQuery,
          searchDays: 365 // Search last year of sales
        });
        if (!active) return;
        // response shape: { success: true, data: { sales: [...] } }
        const sales = (res?.data?.sales) || [];
        console.debug('lookupSales response:', res, 'parsed sales:', sales);
        
        // Flatten sales into items for the damage modal (which expects individual items)
        const flattenedItems: any[] = [];
        if (Array.isArray(sales)) {
          for (const sale of sales) {
            const saleItems = sale.items || [];
            const customer = sale.customer || {};
            const customerName = typeof customer === 'object' 
              ? (customer.name || (customer.firstName && customer.lastName ? `${customer.firstName} ${customer.lastName}` : customer.firstName || customer.lastName) || 'Walk-in Customer')
              : customer || 'Walk-in Customer';
            
            for (const item of saleItems) {
              const product = item.productDetails || item.product || {};
              const productName = typeof product.name === 'object' 
                ? (product.name?.en || product.name?.si || 'Unknown Product')
                : (product.name || 'Unknown Product');
              const productId = item.product?._id || item.product || product._id || product;
              const productIdStr = productId ? (productId.toString ? productId.toString() : String(productId)) : null;
              
              flattenedItems.push({
                _id: `${sale._id}_${productIdStr || item._id || Date.now()}`,
                saleId: sale._id?.toString ? sale._id.toString() : String(sale._id),
                invoiceNo: sale.invoiceNo || 'N/A',
                saleDate: sale.createdAt || sale.saleDate || new Date(),
                customer: customer,
                customerName: customerName,
                productId: productIdStr,
                productName: productName,
                sku: product.sku || 'N/A',
                quantity: item.quantity || 1,
                price: item.price || (product.price?.retail || 0),
                cost: item.cost || (product.price?.cost || 0),
                saleItem: item,
                sale: sale
              });
            }
          }
        }
        setSaleResults(flattenedItems);
      } catch (err: any) {
        console.error('Sale lookup failed', err);
        if (!active) return;
        const msg = err?.response?.data?.message || err?.message || 'Lookup failed';
        setSaleSearchError(String(msg));
        setSaleResults([]);
      } finally {
        if (active) setSaleSearching(false);
      }
    };
    run();
    return () => { active = false; };
  }, [saleSearchTrigger]);

  // Get max quantity from selected sale item if available
  const selectedItem = selectedSale && saleResults.length > 0 
    ? saleResults.find((item: any) => item.productId === product?._id)
    : null;
  const maxQty = selectedItem?.quantity;
  const disable = !product || qty <= 0 || (maxQty && qty > maxQty) || unitCost < 0 || !reason;

  const submit = async () => {
    if (disable) return;
    try {
      setSaving(true);
      const payload: any = {
        items: [{ product: product!._id, quantity: qty, unitCost, reason, description: desc, images: photos }],
        reason,
        disposition: 'scrap',
      };
      if (selectedSale) {
        // Extract customer ID properly - handle both sale object and flattened item structure
        const customer = selectedSale.customer || {};
        const customerId = selectedSale.customerId || 
                          (customer?._id ? customer._id.toString() : null) ||
                          (typeof customer === 'string' ? customer : null);
        const saleId = selectedSale._id || selectedSale.saleId || selectedSale.id;
        
        if (customerId && customerId !== 'walk-in' && customerId !== 'null') {
          payload.customerId = customerId;
        } else {
          payload.customerId = 'walk-in';
        }
        
        // Store sale reference
        if (saleId) {
          payload.saleId = saleId;
        }
        
        // Add sale info to notes if available
        const invoiceNo = selectedSale.invoiceNo;
        if (invoiceNo) {
          const saleNote = `Sale: ${invoiceNo}`;
          payload.notes = desc ? `${desc} | ${saleNote}` : saleNote;
        } else if (desc) {
          payload.notes = desc;
        }
      } else {
        payload.customerId = 'walk-in';
      }
      await damagesApi.shopReturn(payload);
      toast.success('Damage recorded successfully', {
        description: `Damage for ${product.name?.en || product.sku} has been recorded.`
      });
      onClose();
      // reset
      setQ(''); setResults([]); setProduct(null); setQty(1); setUnitCost(0); setDesc(''); setPhotos([]);
      setMode('product'); setSaleQ(''); setSaleResults([]); setSelectedSale(null); setSelectedItemId(null);
    } catch (error: any) {
      console.error('Failed to save damage:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to record damage. Please try again.';
      toast.error('Failed to record damage', {
        description: errorMessage
      });
    } finally { 
      setSaving(false); 
    }
  };

  // Handlers extracted to reduce nesting
  const handlePickProduct = (p: ProductListItem) => {
    setProduct(p);
    // Prefer cost if present in backend shape; fall back to retail
    const maybeCost = (p as unknown as { price?: { cost?: number; retail?: number } }).price?.cost;
    setUnitCost(maybeCost ?? p.price?.retail ?? 0);
    setResults([]);
    setQ('');
  };

  const handlePickSaleItem = (item: any) => {
    console.log('Selecting item:', item);
    // Item is already a flattened item from the search results
    const productId = item.productId || item.product?._id || item.product;
    if (!productId) {
      console.error('No product ID found in item:', item);
      return;
    }
    
    setProduct({
      _id: productId.toString(),
      name: typeof item.productName === 'object' ? item.productName : { en: item.productName || 'Unknown Product' },
      sku: item.sku || 'N/A',
      price: {
        retail: item.price || 0,
        cost: item.cost || 0
      }
    });
    // Use cost if available, otherwise use retail price
    const cost = item.cost ?? item.price ?? 0;
    setUnitCost(cost);
    // Set quantity to 1 by default, but allow user to adjust up to sold quantity
    setQty(1);
    // Store the sale reference
    setSelectedSale(item.sale || { _id: item.saleId, invoiceNo: item.invoiceNo, customer: item.customer });
    // Mark this item as selected for visual feedback
    setSelectedItemId(item._id || `${item.saleId}_${productId}`);
    // Don't clear the results - keep them visible so user can see what was selected
  };

  const handlePhotosSelected = async (files: FileList | null) => {
    if (!files) return;
    let ok = 0;
    for (const f of Array.from(files)) {
      try {
        const up = await uploadToSupabaseImages(f, { folder: 'damages' });
        setPhotos((prev) => [...prev, up.url]);
        ok += 1;
      } catch (err) {
        console.error('Damage photo upload failed', err);
      }
    }
    if (ok > 0) {
      setPhotoMsg(`Uploaded ${ok} photo${ok > 1 ? 's' : ''} successfully`);
    } else {
      setPhotoMsg('Failed to upload photos');
    }
    setTimeout(() => setPhotoMsg(null), 2500);
  };

  const handleRemovePhoto = (url: string) => {
    setPhotos((prev) => prev.filter((x) => x !== url));
  // best-effort delete in storage
  deleteSupabasePublicImage(url).catch(() => {});
  };

  return (
    <FormModal
      isOpen={open}
      onClose={onClose}
      title="Record Damaged Item"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-white/10">Cancel</button>
          <button disabled={disable || saving} onClick={submit} className="px-4 py-2 rounded bg-rose-600 disabled:opacity-50">Save Damage</button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2 items-center">
          <button type="button" onClick={() => setMode('product')} className={`px-3 py-1 rounded ${mode === 'product' ? 'bg-white/10' : 'bg-transparent'}`}>Search Product</button>
          <button type="button" onClick={() => setMode('sale')} className={`px-3 py-1 rounded ${mode === 'sale' ? 'bg-white/10' : 'bg-transparent'}`}>Find By Sale / Customer</button>
        </div>

        {mode === 'product' && (
          <div>
            
            <input id="damage_search" className="w-full rounded bg-white/10 px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, SKU, barcode" />
            {results.length > 0 && (
              <div className="mt-1 rounded border border-white/10 divide-y divide-white/10">
                {results.map((p) => (
                  <button key={p._id} type="button" onClick={() => handlePickProduct(p)} className="w-full text-left px-3 py-2 hover:bg-white/5">
                    {p.name?.en || p.sku} — Rs {p.price?.retail}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'sale' && (
          <div>
            <label htmlFor="damage_sale_search" className="block text-sm mb-1">Invoice / NIC / Phone</label>
            <div className="flex gap-2">
              <input id="damage_sale_search" className="flex-1 rounded bg-white/10 px-3 py-2" value={saleQ} onChange={(e) => setSaleQ(e.target.value)} placeholder="Invoice number, customer NIC or phone" />
              <button type="button" onClick={() => setSaleSearchTrigger((s) => s + 1)} className="px-3 py-2 rounded bg-white/10">Search</button>
            </div>
            {saleSearching && (
              <div className="mt-1 px-3 py-2 text-sm text-[#F8F8F8]/60">Searching…</div>
            )}
            {saleSearchError && (
              <div className="mt-1 px-3 py-2 text-sm text-rose-400">{saleSearchError}</div>
            )}
            {saleResults.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-400 mb-2">
                  Found {saleResults.length} purchased item{saleResults.length !== 1 ? 's' : ''}
                </div>
                <div className="rounded border border-white/10 divide-y divide-white/10 max-h-64 overflow-auto">
                  {saleResults.map((item) => {
                    const itemId = item._id || `${item.saleId}_${item.productId}`;
                    const isSelected = selectedItemId === itemId;
                    return (
                    <button 
                      key={itemId} 
                      type="button" 
                      onClick={() => handlePickSaleItem(item)} 
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        isSelected 
                          ? 'bg-blue-600/30 border-l-4 border-l-blue-400' 
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm truncate ${isSelected ? 'text-blue-300' : ''}`}>
                            {item.productName || 'Unknown Product'}
                            {isSelected && <span className="ml-2 text-xs">✓ Selected</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            <div>SKU: {item.sku || 'N/A'}</div>
                            <div className="mt-0.5">
                              Invoice: <span className="font-medium">{item.invoiceNo}</span>
                              {item.customerName && ` • Customer: ${item.customerName}`}
                            </div>
                            <div className="mt-0.5">
                              Qty: {item.quantity} • Price: Rs {item.price?.toLocaleString() || item.price || 0}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(item.saleDate || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                    );
                  })}
                </div>
              </div>
            )}
            {!saleSearching && !saleSearchError && saleResults.length === 0 && saleSearchTrigger > 0 && (
              <div className="mt-1 px-3 py-2 text-sm text-[#F8F8F8]/60">No purchased items found for that search</div>
            )}
          </div>
        )}
        {product && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="damage_qty" className="block text-sm mb-1">
                Quantity
                {maxQty && (
                  <span className="text-xs text-gray-400 ml-1">(max: {maxQty})</span>
                )}
              </label>
              <input 
                id="damage_qty" 
                type="number" 
                min="1"
                max={maxQty || undefined}
                className="w-full rounded bg-white/10 px-3 py-2" 
                value={qty} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (maxQty && val > maxQty) {
                    setQty(maxQty);
                  } else if (val >= 1) {
                    setQty(val);
                  }
                }} 
              />
            </div>
            <div>
              <label htmlFor="damage_cost" className="block text-sm mb-1">Unit Cost</label>
              <input id="damage_cost" type="number" step="0.01" min="0" className="w-full rounded bg-white/10 px-3 py-2" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="damage_reason" className="block text-sm mb-1">Reason</label>
            <select 
  id="damage_reason" 
  className="w-full rounded bg-white/10 px-3 py-2" 
  value={reason} 
  onChange={(e) => setReason(e.target.value)}
  style={{ backgroundColor: '#3a3a3a', color: '#f5f5f5' }}
>
              {reasons.map((r) => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="damage_notes" className="block text-sm mb-1">Notes (optional)</label>
            <input id="damage_notes" className="w-full rounded bg-white/10 px-3 py-2" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        {/* Photos */}
        <div>
          <label htmlFor="damage_photos" className="block text-sm mb-1">Damage Photos (optional)</label>
          {photoMsg && <div className="text-xs text-emerald-300 mb-1">{photoMsg}</div>}
          <div className="flex items-center gap-2">
            <label htmlFor="damage_photos" className="px-3 py-2 rounded bg-white/10 cursor-pointer text-xs inline-block">Add Photos</label>
            <input
              id="damage_photos"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => { await handlePhotosSelected(e.target.files); if (e.currentTarget) e.currentTarget.value = ''; }}
            />
          </div>
          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((u, i) => (
                <div key={u} className="relative">
                  <img src={u} alt="damage" className="w-16 h-16 object-cover rounded" />
                  <button type="button" className="absolute -top-1 -right-1 bg-black/70 text-white text-[10px] rounded px-1" onClick={() => handleRemovePhoto(u)}>x</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FormModal>
  );
}
