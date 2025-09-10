import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  Tag,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { formatLKR } from '@/lib/utils/currency';
import { productsApi, categoriesApi } from '@/lib/api/products.api';

interface Product {
  _id: string;
  sku: string;
  barcode?: string;
  name: {
    en: string;
    si: string;
  };
  images?: { url: string; alt?: string; isPrimary?: boolean }[];
  category: {
    _id: string;
    name: {
      en: string;
      si: string;
    };
  };
  price: {
    cost: number;
    retail: number;
  };
  stock: {
    current: number;
  };
  supplier?: {
    name: string;
    supplierCode: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  warranty?: { enabled?: boolean; periodDays?: number; type?: string; requiresSerial?: boolean };
}

interface ProductListProps {
  onEdit: (product: Product) => void;
  onCreate: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onEdit, onCreate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    lowStock: 0,
    outOfStock: 0
  });

  // Load products (backend)
  useEffect(() => {
    let cancelled = false;
  const loadProducts = async () => {
      setLoading(true);
      try {
        const res = await productsApi.list({ q: searchTerm || undefined, category: categoryFilter || undefined, page: 1, limit: 100 });
        const items = (res as any)?.data?.items || [];
        if (!cancelled) {
          setProducts(items as unknown as Product[]);
          setStats({
            total: items.length,
            active: items.filter((p: any) => p.isActive !== false).length,
            lowStock: items.filter((p: any) => (p.stock?.current ?? 0) <= 10 && (p.stock?.current ?? 0) > 0).length,
            outOfStock: items.filter((p: any) => (p.stock?.current ?? 0) === 0).length
          });
        }
      } catch (error) {
        console.error('Error loading products:', error);
        if (!cancelled) {
          setProducts([]);
          setStats({ total: 0, active: 0, lowStock: 0, outOfStock: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
  loadProducts();
  const handler = () => loadProducts();
  window.addEventListener('vz-products-refresh', handler);
  return () => { cancelled = true; window.removeEventListener('vz-products-refresh', handler); };
  }, [searchTerm, categoryFilter]);

  // Load categories (backend)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoriesApi.list();
        const items = (res as any)?.data?.items || [];
        setCategories(items);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name.si.toLowerCase().includes(searchTerm.toLowerCase()) ||
  product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
  product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || product.category._id === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { status: 'out', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: <Package className="w-4 h-4" /> };
    if (stock <= 10) return { status: 'low', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: <AlertTriangle className="w-4 h-4" /> };
    return { status: 'good', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: <TrendingUp className="w-4 h-4" /> };
  };

  const handleDelete = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await productsApi.delete(productId);
        setProducts(prev => prev.filter(p => p._id !== productId));
        setStats(prev => ({
          ...prev,
          total: Math.max(prev.total - 1, 0)
        }));
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
          <div className="flex items-center">
            <div className="p-3 bg-blue-500/20 rounded-xl mr-3">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Total Products</p>
              <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
          <div className="flex items-center">
            <div className="p-3 bg-green-500/20 rounded-xl mr-3">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Active Products</p>
              <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-500/20 rounded-xl mr-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.lowStock}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
          <div className="flex items-center">
            <div className="p-3 bg-red-500/20 rounded-xl mr-3">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Out of Stock</p>
              <p className="text-2xl font-bold text-red-400">{stats.outOfStock}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by name, SKU, or barcode..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Warranty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                ['s1','s2','s3','s4','s5'].map((key) => (
                  <tr key={key} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg"></div>
                        <div>
                          <div className="w-32 h-4 bg-white/20 rounded mb-1"></div>
                          <div className="w-24 h-3 bg-white/20 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-4 bg-white/20 rounded"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-16 h-4 bg-white/20 rounded"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-12 h-4 bg-white/20 rounded"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 h-4 bg-white/20 rounded"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <div className="w-8 h-8 bg-white/20 rounded"></div>
                        <div className="w-8 h-8 bg-white/20 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredProducts.map((product) => {
                  const thumbUrl = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url || '';
                  const stockInfo = getStockStatus(product.stock.current);
                  return (
                    <motion.tr
                      key={product._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                            {thumbUrl && (
                              <img
                                src={thumbUrl}
                                alt={product.name.en}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                              />
                            )}
                            <Package className="w-5 h-5 text-[#F8F8F8]/70" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#F8F8F8]">
                              {product.name.en}
                            </div>
                            <div className="text-xs text-[#F8F8F8]/50">
                              SKU: {product.sku} {product.barcode && `• ${product.barcode}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <Tag className="w-3 h-3 mr-1" />
                          {product.category.name.en}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[#F8F8F8]">
                          <div className="font-medium">{formatLKR(product.price.retail)}</div>
                          <div className="text-xs text-[#F8F8F8]/50">
                            Cost: {formatLKR(product.price.cost)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${stockInfo.color} ${stockInfo.bgColor} border-current`}>
                          {stockInfo.icon}
                          <span className="ml-1">{product.stock.current}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {product.supplier ? (
                          <div className="text-sm">
                            <div className="text-[#F8F8F8]">{product.supplier.name}</div>
                            <div className="text-xs text-[#F8F8F8]/50">{product.supplier.supplierCode}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-[#F8F8F8]/50">No supplier</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {product.warranty?.enabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                            {(product.warranty.periodDays||0)}d{product.warranty.requiresSerial ? ' • Serial' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-[#F8F8F8]/30">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEdit(product)}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4 text-[#F8F8F8]/70" />
                          </button>
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent('vz-stickers-open', { detail: { product } }))}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title="Generate Stickers"
                          >
                            <img src="/bar.png" alt="Stickers" className="w-4 h-4 object-contain" />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
                            className="p-2 rounded-lg bg-white/10 hover:bg-red-500/20 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-[#F8F8F8]/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#F8F8F8] mb-2">No Products Found</h3>
            <p className="text-[#F8F8F8]/70 mb-4">
              {searchTerm || categoryFilter
                ? 'Try adjusting your search or filter criteria.'
                : 'Start by adding your first product to the inventory.'}
            </p>
            <button
              onClick={onCreate}
              className="px-4 py-2 rounded-xl font-semibold transition-all duration-200"
              style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
            >
              Add First Product
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
