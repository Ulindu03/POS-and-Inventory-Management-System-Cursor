import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Package, 
  Tag, 
  DollarSign, 
  Hash, 
  User, 
  FileText,
  Save,
  Loader2
} from 'lucide-react';
import { productsApi, categoriesApi } from '@/lib/api/products.api';
import { deleteSupabasePublicImage } from '@/lib/supabase';
import { getSuppliers } from '@/lib/api/suppliers.api';

interface Product {
  _id?: string;
  sku: string;
  barcode?: string;
  name: {
    en: string;
    si: string;
  };
  description?: {
    en: string;
    si: string;
  };
  category: string;
  brand?: string;
  unit: string;
  price: {
    cost: number;
    retail: number;
  };
  stock: {
    current: number;
  };
  supplier?: string;
  tags?: string[];
  minimumStock?: number;
  reorderPoint?: number;
  specifications?: {
    weight?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
    material?: string;
    warranty?: {
      duration?: number;
      type?: string;
    };
  };
  warranty?: {
    enabled?: boolean;
    periodDays?: number;
    type?: string;
    requiresSerial?: boolean;
    coverage?: string[];
    exclusions?: string[];
  };
  images?: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
  }>;
}

interface Category {
  _id: string;
  name: {
    en: string;
    si: string;
  };
}

interface Supplier {
  _id: string;
  name: string;
  supplierCode: string;
}

interface ProductFormProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ 
  product, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageMsg, setImageMsg] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState<{ en: string; si: string; descEn?: string; descSi?: string }>({ en: '', si: '' });
  // Auto unit-barcode generation controls
  const [autoStickers, setAutoStickers] = useState<boolean>(true);
  const [stickersQty, setStickersQty] = useState<number>(0);
  // New state for SKU generation
  const [generatingSku, setGeneratingSku] = useState(false);
  const [formData, setFormData] = useState<Product>({
    sku: '',
    barcode: '',
    name: { en: '', si: '' },
    description: { en: '', si: '' },
    category: '',
    brand: '',
    unit: 'pcs',
    price: { cost: 0, retail: 0 },
    stock: { current: 0 },
    supplier: '',
    tags: [],
    minimumStock: 0,
    reorderPoint: 0,
    specifications: {
      weight: 0,
      dimensions: { length: 0, width: 0, height: 0 },
      material: '',
      warranty: { duration: 0, type: 'months' }
    },
    images: []
  ,
  warranty: { enabled: false, periodDays: 0, type: 'manufacturer', requiresSerial: false, coverage: [], exclusions: [] }
  });

  // Warranty UI state (store in days on formData; show as value + unit)
  type WarrantyUnit = 'days' | 'months' | 'years';
  const [warrantyUnit, setWarrantyUnit] = useState<WarrantyUnit>('days');
  const [warrantyValue, setWarrantyValue] = useState<number>(0);

  const calcDaysFromUnit = (value: number, unit: WarrantyUnit): number => {
    const v = Number(value) || 0;
    if (unit === 'years') return Math.max(0, Math.round(v * 365));
    if (unit === 'months') return Math.max(0, Math.round(v * 30));
    return Math.max(0, Math.round(v));
  };

  const setWarrantyPeriod = (value: number, unit: WarrantyUnit) => {
    setWarrantyValue(value);
    setWarrantyUnit(unit);
    const days = calcDaysFromUnit(value, unit);
    setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty || {}), periodDays: days } }));
  };

  // Load categories and suppliers
  useEffect(() => {
  const loadData = async () => {
      try {
        const [catRes, supRes] = await Promise.all([
          categoriesApi.list(),
          getSuppliers({ limit: 100 })
        ]);

        setCategories(catRes.data.items as unknown as Category[]);
        setSuppliers((supRes.data || []) as unknown as Supplier[]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Initialize form with product data
  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        description: product.description || { en: '', si: '' },
        tags: product.tags || [],
        minimumStock: product.minimumStock || 0,
        reorderPoint: product.reorderPoint || 0,
        specifications: product.specifications || {
          weight: 0,
          dimensions: { length: 0, width: 0, height: 0 },
          material: '',
          warranty: { duration: 0, type: 'months' }
        },
        images: product.images || []
  ,
  warranty: (product as any).warranty || { enabled: false, periodDays: 0, type: 'manufacturer', requiresSerial: false, coverage: [], exclusions: [] }
      });
  setAutoStickers(false); // editing existing product: default off
  setStickersQty(product.stock?.current || 0);
    } else {
      setFormData({
        sku: '',
        barcode: '',
        name: { en: '', si: '' },
        description: { en: '', si: '' },
        category: '',
        brand: '',
        unit: 'pcs',
        price: { cost: 0, retail: 0 },
        stock: { current: 0 },
        supplier: '',
        tags: [],
        minimumStock: 0,
        reorderPoint: 0,
        specifications: {
          weight: 0,
          dimensions: { length: 0, width: 0, height: 0 },
          material: '',
          warranty: { duration: 0, type: 'months' }
        },
        images: []
  ,
  warranty: { enabled: false, periodDays: 0, type: 'manufacturer', requiresSerial: false, coverage: [], exclusions: [] }
      });
  setAutoStickers(true);
  setStickersQty(0);
    }
  }, [product]);

  // Sync warranty UI from persisted days
  useEffect(() => {
    const d = formData.warranty?.periodDays || 0;
    if (!d) {
      setWarrantyUnit('days');
      setWarrantyValue(0);
      return;
    }
    if (d % 365 === 0) {
      setWarrantyUnit('years');
      setWarrantyValue(d / 365);
    } else if (d % 30 === 0) {
      setWarrantyUnit('months');
      setWarrantyValue(d / 30);
    } else {
      setWarrantyUnit('days');
      setWarrantyValue(d);
    }
  }, [formData.warranty?.periodDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.en || !formData.sku || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Persist to backend (create or update) with normalized warranty days
      const payload: any = { ...formData };
      payload.warranty = { ...(payload.warranty || {}), periodDays: calcDaysFromUnit(warrantyValue, warrantyUnit) };
      if (product?._id) {
        await productsApi.update(product._id, payload);
      } else {
        if (autoStickers && (stickersQty || formData.stock.current) > 0) {
          payload.generateStickers = {
            quantity: stickersQty > 0 ? stickersQty : formData.stock.current,
            mode: 'unique_per_unit' as const
          };
        }
        await productsApi.create(payload);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateMargin = () => {
    const { cost, retail } = formData.price;
    if (cost === 0) return 0;
    return ((retail - cost) / cost * 100).toFixed(1);
  };

  if (!isOpen) return null;

  const handleOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClose();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Compute submit button text without nested ternaries
  let submitText = 'Create Product';
  if (product) submitText = 'Update Product';
  if (loading) submitText = 'Saving...';

  // Removed standalone product barcode input/generator from Basic Information.

  const handleImagesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const newImages: Array<{ url: string; isPrimary?: boolean }> = [];
      const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '';
      const origin = apiBase ? apiBase.replace(/\/api$/, '') : '';
      for (const f of Array.from(files)) {
        try {
          const res = await productsApi.uploadImage(f);
          const url = (res as any)?.data?.url || (res as any)?.url;
          if (url) {
            const full = url.startsWith('http') ? url : `${origin}${url}`;
            newImages.push({ url: full });
          }
        } catch (err) {
          console.error('Upload failed for', f.name, err);
        }
      }
      if (newImages.length > 0) {
        setFormData(prev => {
          const images = [...(prev.images || []), ...newImages];
          // Ensure one primary
          if (!images.some(img => img.isPrimary) && images.length > 0) {
            images[0].isPrimary = true;
          }
          return { ...prev, images };
        });
        setImageMsg(`Uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''} successfully`);
      } else {
        setImageMsg('Failed to upload images');
      }
    } finally {
      setUploadingImages(false);
      setTimeout(() => setImageMsg(null), 2500);
    }
  };

  const setPrimaryImage = (index: number) => {
    setFormData(prev => {
      const images = (prev.images || []).map((img, i) => ({ ...img, isPrimary: i === index }));
      return { ...prev, images };
    });
  };

  const removeImage = (index: number) => {
    const url = formData.images?.[index]?.url;
    setFormData(prev => {
      const images = [...(prev.images || [])];
      images.splice(index, 1);
      // Ensure one primary remains if any images exist
      if (images.length > 0 && !images.some(i => i.isPrimary)) {
        images[0].isPrimary = true;
      }
      return { ...prev, images };
    });
    if (url) {
      deleteSupabasePublicImage(url).catch(() => {/* non-blocking */});
    }
  };

  const handleGenerateSku = async () => {
    if (!formData.name.en.trim()) {
      alert('Enter product name first');
      return;
    }
    setGeneratingSku(true);
    try {
      // Base acronym: take alphanumeric words, use first 3 letters of first two words or full if short
      const words = formData.name.en
        .toUpperCase()
        .replace(/[^A-Z0-9 ]+/g, ' ') // remove special chars
        .split(/\s+/)
        .filter(Boolean);
      let base = '';
      if (words.length === 1) {
        base = words[0].slice(0, 5); // up to 5 chars for single word
      } else {
        base = words.slice(0, 2).map(w => w.slice(0, 3)).join('-');
      }
      if (!base) base = 'ITEM';

      // Fetch existing SKUs that start with base
      // We'll paginate first few pages until no more or limit; backend list supports q filter
      const existing: string[] = [];
      for (let page = 1; page <= 3; page++) { // limit pages for performance
        try {
          const res: any = await productsApi.list({ q: base, page, limit: 100 });
          const items = res.data.items || [];
          if (!items.length) break;
          for (const it of items) existing.push(it.sku.toUpperCase());
          if (items.length < 100) break; // last page
        } catch {
          break; // fail silently
        }
      }
      // Determine next numeric suffix
      const pattern = new RegExp('^' + base.replace(/-/g, '-').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '-?(\\d+)$');
      let maxNum = 0;
      existing.forEach(sku => {
        if (sku === base) maxNum = Math.max(maxNum, 0);
        const m = pattern.exec(sku);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n)) maxNum = Math.max(maxNum, n);
        }
      });
      const next = maxNum + 1;
      const candidate = maxNum === 0 && !existing.includes(base) ? base : `${base}-${String(next).padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, sku: candidate }));
    } finally {
      setGeneratingSku(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close product form"
        onKeyDown={handleOverlayKeyDown as unknown as React.KeyboardEventHandler<HTMLButtonElement>}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
              <Package className="w-6 h-6 text-[#F8F8F8]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#F8F8F8]">
                {product ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-sm text-[#F8F8F8]/70">
                {product ? 'Update product information' : 'Create a new product in your inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-[#F8F8F8]/70" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name_en" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Product Name (English) *
                </label>
                <input
                  type="text"
                  required
                  id="name_en"
                  value={formData.name.en}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    name: { ...prev.name, en: e.target.value }
                  }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="Enter product name in English"
                />
              </div>

              <div>
                <label htmlFor="name_si" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Product Name (Sinhala)
                </label>
                <input
                  type="text"
                  id="name_si"
                  value={formData.name.si}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    name: { ...prev.name, si: e.target.value }
                  }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="නිෂ්පාදන නම සිංහලෙන්"
                />
              </div>

              <div>
                <label htmlFor="sku" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  SKU *
                </label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
                    <input
                      type="text"
                      required
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                      placeholder="LED-001"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    disabled={generatingSku}
                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Generate SKU from product name"
                  >
                    {generatingSku ? '...' : 'Generate'}
                  </button>
                </div>
              </div>

              {/* Barcode field removed per request; unit barcodes now generated under Inventory section. */}

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Category *
                </label>
                <div className="relative flex gap-2">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
                  <select
                    required
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.name.en}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] hover:bg-white/20"
                    title="Add category"
                  >
                    + New
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="Brand name"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="price_cost" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Cost Price *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  id="price_cost"
                  value={formData.price.cost}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    price: { ...prev.price, cost: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="price_retail" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Selling Price *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  id="price_retail"
                  value={formData.price.retail}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    price: { ...prev.price, retail: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="0.00"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Profit Margin
                </span>
                <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#F8F8F8] flex items-center justify-center">
                  <span className="font-semibold text-green-400">
                    {calculateMargin()}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Inventory
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="stock_current" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Current Stock
                </label>
                <input
                  type="number"
                  min="0"
                  id="stock_current"
                  value={formData.stock.current}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    stock: { ...prev.stock, current: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="minimum_stock" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Minimum Stock
                </label>
                <input
                  type="number"
                  min="0"
                  id="minimum_stock"
                  value={formData.minimumStock}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimumStock: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="reorder_point" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Reorder Point
                </label>
                <input
                  type="number"
                  min="0"
                  id="reorder_point"
                  value={formData.reorderPoint}
                  onChange={(e) => setFormData(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                  Unit
                </label>
                <select
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                >
                  <option value="pcs">Pieces</option>
                  <option value="kg">Kilograms</option>
                  <option value="m">Meters</option>
                  <option value="l">Liters</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                </select>
              </div>
            </div>

            {/* Auto-generate unit barcodes on save */}
            {!product && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <label className="flex items-center gap-3 text-[#F8F8F8]">
                  <input
                    type="checkbox"
                    checked={autoStickers}
                    onChange={(e) => setAutoStickers(e.target.checked)}
                  />
                  <span>Generate separate barcodes for these units when saving</span>
                </label>
                <div className="md:col-span-2 flex items-center gap-3">
                  <div className="flex-1">
                    <label htmlFor="stickers_qty" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                      Quantity to barcode
                    </label>
                    <input
                      type="number"
                      id="stickers_qty"
                      min={0}
                      value={stickersQty || formData.stock.current}
                      onChange={(e) => setStickersQty(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                      placeholder="e.g. 24"
                      disabled={!autoStickers}
                    />
                    <p className="text-xs text-[#F8F8F8]/60 mt-1">Default is current stock. Uses unique per-unit barcodes.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4 flex items-center gap-2">
              Product Images
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="product_images" className="block text-sm font-medium text-[#F8F8F8] mb-2">Upload Images</label>
                {imageMsg && <p className="text-xs text-emerald-300 mb-1">{imageMsg}</p>}
                <input
                  id="product_images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImagesSelected(e.target.files)}
                  className="block w-full text-sm text-[#F8F8F8] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-[#F8F8F8] hover:file:bg-white/20"
                />
                {uploadingImages && (
                  <p className="text-xs text-[#F8F8F8]/60 mt-1">Uploading...</p>
                )}
              </div>

              {(formData.images && formData.images.length > 0) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {formData.images.map((img, idx) => (
                    <div key={img.url || `img-${idx}`} className="relative rounded-xl overflow-hidden border border-white/10 bg-white/10">
                      <img src={img.url} alt={img.alt || `Image ${idx + 1}`} className="w-full h-28 object-cover" />
                      <div className="p-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(idx)}
                          className={`px-2 py-1 text-xs rounded-lg border ${img.isPrimary ? 'bg-yellow-400 text-black border-yellow-300' : 'bg-white/10 text-[#F8F8F8] border-white/10'}`}
                        >
                          {img.isPrimary ? 'Primary' : 'Make Primary'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="px-2 py-1 text-xs rounded-lg bg-red-500/20 text-red-200 border border-red-400/30"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#F8F8F8]/60">No images uploaded yet.</p>
              )}
            </div>
          </div>

          {/* Supplier */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Supplier
            </h3>
            
            <div>
              <label htmlFor="supplier" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                Supplier
              </label>
              <select
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name} ({supplier.supplierCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Warranty Configuration */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4 flex items-center gap-2">
              Warranty
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-[#F8F8F8]">
                <input
                  type="checkbox"
                  checked={Boolean(formData.warranty?.enabled)}
                  onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty||{}), enabled: e.target.checked } }))}
                />
                <span>Enable Warranty for this product</span>
              </label>
              {formData.warranty?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="warranty_value" className="block text-sm font-medium text-[#F8F8F8] mb-2">Period</label>
                    <div className="flex gap-2">
                      <input
                        id="warranty_value"
                        type="number"
                        min={0}
                        value={warrantyValue}
                        onChange={(e) => setWarrantyPeriod(parseInt(e.target.value)||0, warrantyUnit)}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                        placeholder="e.g. 12"
                      />
                      <select
                        id="warranty_unit"
                        value={warrantyUnit}
                        onChange={(e) => setWarrantyPeriod(warrantyValue, e.target.value as WarrantyUnit)}
                        className="px-3 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none"
                      >
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="warranty_type" className="block text-sm font-medium text-[#F8F8F8] mb-2">Warranty Type</label>
                    <select
                      id="warranty_type"
                      value={formData.warranty?.type || 'manufacturer'}
                      onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty||{}), type: e.target.value } }))}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                    >
                      <option value="manufacturer">Manufacturer</option>
                      <option value="extended">Extended</option>
                      <option value="lifetime">Lifetime</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div className="flex items-center mt-6 gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.warranty?.requiresSerial)}
                      onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty||{}), requiresSerial: e.target.checked } }))}
                    />
                    <span className="text-sm text-[#F8F8F8]">Requires Serial Activation</span>
                  </div>
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="warranty_coverage" className="block text-sm font-medium text-[#F8F8F8] mb-2">Coverage (comma separated)</label>
                      <input
                        id="warranty_coverage"
                        type="text"
                        value={(formData.warranty?.coverage||[]).join(', ')}
                        onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty||{}), coverage: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) } }))}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                        placeholder="Battery, Speaker"
                      />
                    </div>
                    <div>
                      <label htmlFor="warranty_exclusions" className="block text-sm font-medium text-[#F8F8F8] mb-2">Exclusions (comma separated)</label>
                      <input
                        id="warranty_exclusions"
                        type="text"
                        value={(formData.warranty?.exclusions||[]).join(', ')}
                        onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty||{}), exclusions: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) } }))}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                        placeholder="Physical damage, Liquid"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-medium bg-white/10 hover:bg-white/20 text-[#F8F8F8] border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {submitText}
            </button>
          </div>
        </form>
      </motion.div>

      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowCategoryModal(false)}
            aria-label="Close category modal"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5">
            <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Add Category</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="new-cat-en" className="block text-sm font-medium text-[#F8F8F8] mb-2">Name (English) *</label>
                <input
                  id="new-cat-en"
                  value={newCategory.en}
                  onChange={(e) => setNewCategory((p) => ({ ...p, en: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none"
                  placeholder="Category name"
                />
              </div>
              <div>
                <label htmlFor="new-cat-si" className="block text-sm font-medium text-[#F8F8F8] mb-2">Name (Sinhala) *</label>
                <input
                  id="new-cat-si"
                  value={newCategory.si}
                  onChange={(e) => setNewCategory((p) => ({ ...p, si: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none"
                  placeholder="වර්ග නාමය"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8]"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-yellow-300 text-black"
                  onClick={async () => {
                    if (!newCategory.en || !newCategory.si) return;
                    try {
                      const res = await categoriesApi.create({
                        name: { en: newCategory.en, si: newCategory.si },
                        description: { en: newCategory.descEn || '', si: newCategory.descSi || '' },
                      });
                      const cat = (res as any)?.data?.category;
                      // refresh categories and select the new one
                      const list = await categoriesApi.list();
                      setCategories(list.data.items as any);
                      if (cat?._id) {
                        setFormData((prev) => ({ ...prev, category: cat._id }));
                      }
                      setShowCategoryModal(false);
                    } catch (e) {
                      console.error('Create category failed', e);
                      alert('Failed to create category');
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
