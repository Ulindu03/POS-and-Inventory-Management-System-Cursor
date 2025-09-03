import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, Package } from 'lucide-react';
import { productsApi } from '@/lib/api/products.api';
import { toast } from 'sonner';

interface Product {
  _id: string;
  sku: string;
  name: { en: string; si: string };
  currentStock: number;
}

type AdjustmentType = 'increase' | 'decrease' | 'set';

export const StockAdjustment = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('increase');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const filteredProducts = useMemo(() => searchResults, [searchResults]);

  // Load product from sessionStorage handoff (Adjust button in list)
  useEffect(() => {
  const raw = sessionStorage.getItem('inventory.adjust.pending');
    if (raw) {
      try {
    const p = JSON.parse(raw);
    if (p?.
_id) setSelectedProduct(p);
      } catch {}
      sessionStorage.removeItem('inventory.adjust.pending');
    }
  }, []);

  // Simple search using products API list
  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await productsApi.list({ q: searchTerm, limit: 20 });
        const items = res?.data?.items || [];
        const mapped: Product[] = items.map((p: any) => ({
          _id: p._id,
          sku: p.sku,
          name: p.name,
          currentStock: Number(p?.stock?.current ?? 0),
        }));
        if (!ignore) setSearchResults(mapped);
      } catch (e) {
        console.error('Search failed', e);
        if (!ignore) setSearchResults([]);
      }
    };
    const h = setTimeout(run, 250);
    return () => { ignore = true; clearTimeout(h); };
  }, [searchTerm]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm('');
  };

  const calculateNewStock = () => {
    if (!selectedProduct || !quantity) return selectedProduct?.currentStock || 0;

    switch (adjustmentType) {
      case 'increase':
        return selectedProduct.currentStock + quantity;
      case 'decrease':
        return Math.max(0, selectedProduct.currentStock - quantity);
      case 'set':
        return quantity;
      default:
        return selectedProduct.currentStock;
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct) {
      toast.error('Select a product');
      return;
    }
    if (!reason) {
      toast.error('Select a reason');
      return;
    }
    if (adjustmentType !== 'set' && (!quantity || quantity <= 0)) {
      toast.error('Enter a positive quantity');
      return;
    }

    // Compute server payload
    let serverType: 'add' | 'remove';
    let serverQty = 0;
    if (adjustmentType === 'increase') {
      serverType = 'add';
      serverQty = quantity;
    } else if (adjustmentType === 'decrease') {
      serverType = 'remove';
      serverQty = quantity;
    } else {
      // set
      const target = Math.max(0, quantity);
      const diff = target - Number(selectedProduct.currentStock || 0);
      if (diff === 0) {
        toast.info('Stock already at desired quantity');
        return;
      }
  serverType = diff > 0 ? 'add' : 'remove';
      serverQty = Math.abs(diff);
    }

    setLoading(true);
    try {
      const res = await productsApi.adjustStock(selectedProduct._id, {
        quantity: serverQty,
        type: serverType,
        reason,
      });
      if (res?.success) {
        toast.success(res.message || 'Stock updated');
        // Update selectedProduct with new stock
        setSelectedProduct((prev) => prev ? { ...prev, currentStock: res.data.newStock } : prev);
        // Reset quantity and notes only
        setQuantity(0);
        setNotes('');
      } else {
        toast.error('Failed to update stock');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error updating stock';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <h2 className="text-xl font-semibold text-[#F8F8F8] mb-4">Select Product</h2>
        
        {!selectedProduct ? (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#F8F8F8]/50 w-4 h-4" />
              <input
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
              />
            </div>

            {searchTerm && (
              <div className="max-h-60 overflow-y-auto border border-white/10 rounded-xl bg-white/5">
                {filteredProducts.map((product) => (
                  <button
                    type="button"
                    key={product._id}
                    onClick={() => handleProductSelect(product)}
                    className="w-full text-left p-4 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-[#F8F8F8]">{product.name.en}</p>
                        <p className="text-sm text-[#F8F8F8]/70">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#F8F8F8]">Stock: {product.currentStock}</p>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="p-4 text-center text-[#F8F8F8]/70">
                    No products found
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-blue-400 mr-3" />
                <div>
                  <h3 className="font-semibold text-blue-400">{selectedProduct.name.en}</h3>
                  <p className="text-sm text-blue-400/80">SKU: {selectedProduct.sku}</p>
                  <p className="text-sm text-blue-400/80">Current Stock: {selectedProduct.currentStock}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 transition-colors"
              >
                Change
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedProduct && (
        <>
          {/* Adjustment Details */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
            <h2 className="text-xl font-semibold text-[#F8F8F8] mb-4">Adjustment Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
        <label htmlFor="adjustmentType" className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
                  Adjustment Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                    <input
                      type="radio"
          name="adjustmentType"
          id="adjustmentType-increase"
                      value="increase"
                      checked={adjustmentType === 'increase'}
                      onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                      className="text-green-500"
                    />
                    <div className="flex items-center">
                      <Plus className="w-4 h-4 text-green-400 mr-1" />
                      <span className="text-sm text-[#F8F8F8]">Increase</span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                    <input
                      type="radio"
          name="adjustmentType"
          id="adjustmentType-decrease"
                      value="decrease"
                      checked={adjustmentType === 'decrease'}
                      onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                      className="text-red-500"
                    />
                    <div className="flex items-center">
                      <Minus className="w-4 h-4 text-red-400 mr-1" />
                      <span className="text-sm text-[#F8F8F8]">Decrease</span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                    <input
                      type="radio"
          name="adjustmentType"
          id="adjustmentType-set"
                      value="set"
                      checked={adjustmentType === 'set'}
                      onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                      className="text-blue-500"
                    />
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-blue-400 mr-1" />
                      <span className="text-sm text-[#F8F8F8]">Set To</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
                  {adjustmentType === 'set' ? 'New Quantity' : 'Quantity'} *
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="Enter quantity"
                  id="quantity"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="reason" className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
                  Reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  id="reason"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                >
                  <option value="">Select reason</option>
                  <option value="stock_take">Stock Take</option>
                  <option value="damaged">Damaged Goods</option>
                  <option value="expired">Expired Items</option>
                  <option value="theft">Theft/Loss</option>
                  <option value="return">Customer Return</option>
                  <option value="supplier_return">Supplier Return</option>
                  <option value="correction">Data Correction</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Enter any additional notes..."
                  id="notes"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Stock Summary */}
          {quantity > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
              <h2 className="text-xl font-semibold text-[#F8F8F8] mb-4">Stock Summary</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
                  <p className="text-sm text-blue-400 font-medium">Current Stock</p>
                  <p className="text-2xl font-bold text-blue-400">{selectedProduct.currentStock}</p>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
                  <p className="text-sm text-purple-400 font-medium">
                    {adjustmentType === 'increase' && '+'}
                    {adjustmentType === 'decrease' && '-'}
                    {adjustmentType === 'set' && 'Set to '}
                    Adjustment
                  </p>
                  <p className="text-2xl font-bold text-purple-400">{quantity}</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                  <p className="text-sm text-green-400 font-medium">New Stock</p>
                  <p className="text-2xl font-bold text-green-400">{calculateNewStock()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !reason || !selectedProduct || (adjustmentType !== 'set' && quantity <= 0) || (adjustmentType === 'set' && quantity < 0)}
              className={`px-4 py-2 rounded-xl border transition-colors ${
                loading || !reason || !selectedProduct || (adjustmentType !== 'set' && quantity <= 0) || (adjustmentType === 'set' && quantity < 0)
                  ? 'bg-white/5 border-white/10 text-[#F8F8F8]/50 cursor-not-allowed'
                  : 'bg-white/20 border-white/20 text-[#F8F8F8] hover:bg-white/30'
              }`}
            >
              {loading ? 'Applying…' : 'Apply Adjustment'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedProduct(null);
                setQuantity(0);
                setReason('');
                setNotes('');
                setAdjustmentType('increase');
              }}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-[#F8F8F8]/80 hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
};