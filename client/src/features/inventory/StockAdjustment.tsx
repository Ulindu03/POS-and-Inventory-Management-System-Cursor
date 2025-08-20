import { useState } from 'react';
import { Search, Plus, Minus, Package, Save, X } from 'lucide-react';

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

  // Mock products - replace with actual API call
  const products: Product[] = [
    {
      _id: '1',
      sku: 'ELK001',
      name: { en: 'Samsung Galaxy S24', si: 'සැම්සුන් ගැලැක්සි' },
      currentStock: 25
    },
    {
      _id: '2',
      sku: 'ELK002',
      name: { en: 'iPhone 15 Pro', si: 'අයිෆෝන් 15 ප්‍රෝ' },
      currentStock: 15
    },
    {
      _id: '3',
      sku: 'ELK003',
      name: { en: 'Dell XPS 13', si: 'ඩෙල් XPS 13' },
      currentStock: 8
    }
  ];

  const filteredProducts = products.filter(product =>
    product.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    if (!selectedProduct || !quantity || !reason) return;

    setLoading(true);
    try {
      // Replace with actual API call
      console.log('Stock adjustment:', {
        product: selectedProduct._id,
        adjustmentType,
        quantity,
        reason,
        notes
      });
      
      // Reset form
      setSelectedProduct(null);
      setQuantity(0);
      setReason('');
      setNotes('');
      setAdjustmentType('increase');
    } catch (error) {
      console.error('Error adjusting stock:', error);
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
                  <div
                    key={product._id}
                    onClick={() => handleProductSelect(product)}
                    className="p-4 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors"
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
                  </div>
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
                <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
                  Adjustment Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                    <input
                      type="radio"
                      name="adjustmentType"
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
                <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
                  {adjustmentType === 'set' ? 'New Quantity' : 'Quantity'} *
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="Enter quantity"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
                  Reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
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
                <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Enter any additional notes..."
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Stock Summary */}
          {adjustmentType && quantity && (
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
                  <p className="text-2xl font-bold text-purple-400">
                    {adjustmentType === 'set' ? quantity : quantity}
                  </p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                  <p className="text-sm text-green-400 font-medium">New Stock</p>
                  <p className="text-2xl font-bold text-green-400">{calculateNewStock()}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};