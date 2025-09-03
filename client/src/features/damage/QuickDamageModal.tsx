import { useEffect, useState } from 'react';
import FormModal from '@/components/ui/FormModal';
import { damagesApi } from '@/lib/api/damages.api';
import { uploadToSupabaseImages, deleteSupabasePublicImage } from '@/lib/supabase';
import { productsApi, type ProductListItem } from '@/lib/api/products.api';

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

  useEffect(() => {
    if (!open) return;
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

  const disable = !product || qty <= 0 || unitCost < 0 || !reason;

  const submit = async () => {
    if (disable) return;
    try {
      setSaving(true);
      await damagesApi.shopReturn({
        customerId: 'walk-in', // optional linkage for POS quick intake
        items: [{ product: product._id, quantity: qty, unitCost, reason, description: desc, images: photos }],
        reason,
        disposition: 'scrap',
      });
      onClose();
      // reset
      setQ(''); setResults([]); setProduct(null); setQty(1); setUnitCost(0); setDesc(''); setPhotos([]);
    } finally { setSaving(false); }
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
        <div>
          <label htmlFor="damage_search" className="block text-sm mb-1">Search Product</label>
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
        {product && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="damage_qty" className="block text-sm mb-1">Quantity</label>
              <input id="damage_qty" type="number" className="w-full rounded bg-white/10 px-3 py-2" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div>
              <label htmlFor="damage_cost" className="block text-sm mb-1">Unit Cost</label>
              <input id="damage_cost" type="number" className="w-full rounded bg-white/10 px-3 py-2" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="damage_reason" className="block text-sm mb-1">Reason</label>
            <select id="damage_reason" className="w-full rounded bg-white/10 px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)}>
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
