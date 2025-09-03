import { useCartStore } from '@/store/cart.store';
import { productsApi, categoriesApi, type ProductListItem, type CategoryItem } from '@/lib/api/products.api';
import { motion } from 'framer-motion';
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
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 focus:outline-none text-[#F8F8F8]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 focus:outline-none text-[#F8F8F8]"
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
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((p) => (
            <motion.button
              key={p._id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => addItem({ id: p._id, name: p.name.en, price: p.price.retail })}
              className="text-left rounded-2xl p-4 border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition"
            >
              <div className="font-medium text-[#F8F8F8]">{p.name.en}</div>
              <div className="text-sm opacity-80">LKR {p.price.retail.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};


