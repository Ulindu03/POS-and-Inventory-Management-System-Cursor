import React, { useState } from "react";
import { Plus, Barcode, Tag, DollarSign, Save } from "lucide-react";

const categories = ["Smartphones", "Laptops", "Accessories", "Other"];

export const ProductForm: React.FC<{ onSave?: (product: any) => void; initial?: any; }> = ({ onSave, initial }) => {
  const [name, setName] = useState(initial?.name || "");
  const [sku, setSku] = useState(initial?.sku || "");
  const [price, setPrice] = useState(initial?.price || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [barcode, setBarcode] = useState(initial?.barcode || "");
  const [showBarcode, setShowBarcode] = useState(false);

  const generateBarcode = () => {
    // Simple random barcode generator
    setBarcode("BC" + Math.floor(Math.random() * 1000000000));
    setShowBarcode(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) onSave({ name, sku, price, category, barcode });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-[#F8F8F8] mb-4">{initial ? "Edit Product" : "Add New Product"}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">Product Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Enter product name" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">SKU *</label>
          <input value={sku} onChange={e => setSku(e.target.value)} required placeholder="Enter SKU" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">Price *</label>
          <div className="flex items-center">
            <DollarSign className="w-4 h-4 text-green-400 mr-2" />
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} required placeholder="Enter price" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">Category *</label>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-400 mr-2" />
            <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30">
              <option value="">Select category</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">Barcode</label>
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-purple-400" />
            <input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Auto or manual barcode" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30" />
            <button type="button" onClick={generateBarcode} className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg font-medium hover:bg-purple-500/30 transition-colors">Generate</button>
          </div>
          {showBarcode && barcode && (
            <div className="mt-2 text-xs text-purple-400">Generated: {barcode}</div>
          )}
        </div>
      </div>
      <button type="submit" className="w-full mt-6 py-3 rounded-xl bg-green-500/80 hover:bg-green-500 text-white font-bold flex items-center justify-center gap-2 transition-all">
        <Save className="w-5 h-5" /> {initial ? "Save Changes" : "Add Product"}
      </button>
    </form>
  );
};
