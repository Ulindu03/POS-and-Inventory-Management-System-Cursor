import { useCartStore } from '@/store/cart.store';
import { usePosStore } from '@/store/pos.store';
import { productsApi, categoriesApi, type ProductListItem, type CategoryItem } from '@/lib/api/products.api';
import { motion } from 'framer-motion';
import { proxyImage } from '@/lib/proxyImage';
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { formatLKR } from '@/lib/utils/currency';

export interface ProductGridRef {
  focusSearch: () => void;
}

interface ProductGridProps {
  /** Currently selected product index for keyboard navigation */
  selectedIndex?: number;
  /** Callback when products are loaded (passes product array) */
  onProductsLoaded?: (products: ProductListItem[]) => void;
  /** Callback when search input is focused */
  onFocus?: () => void;
}

export const ProductGrid = forwardRef<ProductGridRef, ProductGridProps>(({ 
  selectedIndex = -1, 
  onProductsLoaded,
  onFocus 
}, ref) => {
  const addItem = useCartStore((s) => s.addItem);
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [category, setCategory] = useState<string>('');
  const customerType = usePosStore((s) => s.customerType);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const productRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Expose focusSearch method to parent
  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      searchInputRef.current?.focus();
    }
  }));

  // Scroll selected product into view
  useEffect(() => {
    if (selectedIndex >= 0 && productRefs.current[selectedIndex]) {
      productRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Notify parent when products change
  useEffect(() => {
    onProductsLoaded?.(items);
  }, [items, onProductsLoaded]);

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
          ref={searchInputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={onFocus}
          placeholder="Search products... (F1)"
          className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-[#F8F8F8]"
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
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5">
          {items.map((p, index) => {
            // Prefer inventory/effectiveStock where available
            const eff = p.effectiveStock || undefined;
            const current = (eff?.current ?? p.inventory?.currentStock ?? p.stock?.current ?? 0);
            const min = (eff?.minimum ?? p.inventory?.minimumStock ?? p.stock?.minimum ?? 0);
            const out = current <= 0; // hard stop
            const low = !out && min > 0 && current <= min; // low-stock hint only
            const isSelected = index === selectedIndex;

            const retailTier = p.pricing?.retail;
            const wholesaleTier = p.pricing?.wholesale;
            const wholesaleAvailable = Boolean(wholesaleTier?.configured && wholesaleTier.base > 0);
            const prefersWholesale = customerType === 'wholesale' && wholesaleAvailable;
            const activeTier = prefersWholesale ? wholesaleTier : retailTier ?? wholesaleTier;
            const activeTierName = prefersWholesale && activeTier ? 'wholesale' : 'retail';
            const basePrice = activeTier?.base ?? (prefersWholesale ? wholesaleTier?.base : retailTier?.base) ?? p.price?.retail ?? 0;
            const finalPrice = activeTier?.final ?? basePrice;
            const perUnitSavings = Math.max(0, activeTier?.discountAmount ?? 0);
            const hasActiveDiscount = Boolean(activeTier?.hasActiveDiscount && perUnitSavings > 0);
            const discountType = activeTier?.discountType ?? null;
            const discountValue = activeTier?.discountValue ?? null;
            const discountLabel = (() => {
              if (!hasActiveDiscount) return '';
              if (discountType === 'percentage' && discountValue != null) {
                return `-${discountValue}%`;
              }
              if (perUnitSavings > 0) {
                return `-${formatLKR(perUnitSavings)}`;
              }
              return 'Promo';
            })();

            return (
              <motion.button
                ref={(el) => { productRefs.current[index] = el; }}
                key={p._id}
                whileHover={{ scale: out ? 1 : 1.02 }}
                whileTap={{ scale: out ? 1 : 0.98 }}
                onClick={() => {
                  if (!out) {
                    addItem({
                      id: p._id,
                      name: p.name.en,
                      price: finalPrice,
                      basePrice,
                      barcode: p.barcode, // Include product's default barcode
                      discountAmount: perUnitSavings,
                      discountType: discountType ?? undefined,
                      discountValue: discountValue ?? undefined,
                      priceTier: activeTierName,
                    });
                  }
                }}
                disabled={out}
                className={`relative text-left rounded-2xl p-4 border-2 backdrop-blur-md transition-all duration-150 ${
                  isSelected 
                    ? 'border-yellow-400 bg-yellow-400/10 ring-2 ring-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.3)]' 
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                } ${out ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {/* Product image thumbnail */}
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2 bg-white flex items-center justify-center" style={{ minHeight: 110, maxHeight: 110 }}>
                  {(() => {
                    const thumb = p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url || '';
                    return thumb ? (
                        <img
                        src={proxyImage(thumb)}
                        alt={p.name.en}
                        loading="lazy"
                          className="w-full h-full aspect-square object-cover object-center block rounded-2xl"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.jpg'; }}
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center">
                        <img
                          src="/logo.jpg"
                          alt="No preview available"
                          loading="lazy"
                          className="w-[50px] h-[50px] object-contain opacity-70"
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
                  <span className="absolute top-2 right-2 z-10 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/90 text-black shadow-sm">Low</span>
                )}
                {hasActiveDiscount && (
                  <span className={`absolute ${low ? 'top-8' : 'top-2'} right-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/90 text-black shadow-sm`}>
                    {discountLabel}
                  </span>
                )}
                <div className="font-medium text-[#F8F8F8]" style={{ fontSize: '12px' }}>{p.name.en}</div>
                <div className="text-[10px] text-white/60 truncate">SKU: {p.sku}</div>
                <div className="text-sm opacity-80">
                  {hasActiveDiscount ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="line-through text-white/40 block text-xs">{formatLKR(basePrice)}</span>
                      </div>
                      <span className="text-emerald-300 font-semibold block">{formatLKR(finalPrice)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{formatLKR(basePrice)}</span>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
});

ProductGrid.displayName = 'ProductGrid';
