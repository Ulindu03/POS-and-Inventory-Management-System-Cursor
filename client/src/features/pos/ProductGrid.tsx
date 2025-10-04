import { useCartStore } from '@/store/cart.store';
import { productsApi, categoriesApi, type ProductListItem, type CategoryItem } from '@/lib/api/products.api';
import { motion } from 'framer-motion';
import { proxyImage } from '@/lib/proxyImage';
import { useEffect, useState } from 'react';

export const ProductGrid = () => {
  const addItem = useCartStore((s) => s.addItem);
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [category, setCategory] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await productsApi.list({ ...(q ? { q } : {}), ...(category ? { category } : {}) });
        if (mounted) setItems(res.data.items);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [q, category]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await categoriesApi.list();
      if (mounted) setCategories(res.data.items);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-3 min-h-0">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 focus:outline-none text-[#F8F8F8]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 focus:outline-none text-[#F8F8F8] sm:w-48"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name.en}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="opacity-80">Loading...</div>
    ) : (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {items.map((p) => {
            // Prefer inventory/effectiveStock where available
            const eff = p.effectiveStock || undefined;
            const current = (eff?.current ?? p.inventory?.currentStock ?? p.stock?.current ?? 0);
            const min = (eff?.minimum ?? p.inventory?.minimumStock ?? p.stock?.minimum ?? 0);
            const out = current <= 0; // hard stop
            const low = !out && min > 0 && current <= min; // low-stock hint only

            return (
              <motion.button
                key={p._id}
                whileHover={{ scale: out ? 1 : 1.02 }}
                whileTap={{ scale: out ? 1 : 0.98 }}
                onClick={() => { if (!out) addItem({ id: p._id, name: p.name.en, price: p.price.retail }); }}
                disabled={out}
                className={`relative text-left rounded-2xl p-4 border border-white/10 bg-white/5 backdrop-blur-md ${out ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/10'} transition`}
              >
                {/* Product image thumbnail */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2 bg-white/5">
                  {(() => {
                    const thumb = p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url || '';
                    return thumb ? (
                      <img
                        src={proxyImage(thumb)}
                        alt={p.name.en}
                        loading="lazy"
                        className="w-full h-full object-cover object-center block"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.jpg'; }}
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center">
                        <img
                          src="/logo.jpg"
                          alt="No preview available"
                          loading="lazy"
                          className="w-16 h-16 object-contain opacity-70"
                        />
                      </div>
                    );
                  })()}
                </div>
                {/* Badges */}
                {out && (
                  <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-sm">Out of stock</span>
                )}
                {low && (
                  <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/90 text-black shadow-sm">Low</span>
                )}
                <div className="font-medium text-[#F8F8F8]">{p.name.en}</div>
                <div className="text-sm opacity-80">LKR {p.price.retail.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};


