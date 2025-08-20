import { useState, useEffect } from 'react';
import { Search, Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatLKR } from '@/lib/utils/currency';

interface StockItem {
  _id: string;
  product: {
    _id: string;
    sku: string;
    name: { en: string; si: string };
    category: string;
  };
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  lastUpdated: string;
  status: 'good' | 'low' | 'critical' | 'out';
}

export const StockList = () => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Simulate API call - replace with your actual inventory API
    const loadStock = async () => {
      setLoading(true);
      try {
        // Mock data - replace with actual API call
        const mockData: StockItem[] = [
          {
            _id: '1',
            product: {
              _id: '1',
              sku: 'ELK001',
              name: { en: 'Samsung Galaxy S24', si: 'සැම්සුන් ගැලැක්සි' },
              category: 'Electronics'
            },
            currentStock: 25,
            minimumStock: 10,
            reorderPoint: 15,
            lastUpdated: new Date().toISOString(),
            status: 'good'
          },
          {
            _id: '2',
            product: {
              _id: '2',
              sku: 'ELK002',
              name: { en: 'iPhone 15 Pro', si: 'අයිෆෝන් 15 ප්‍රෝ' },
              category: 'Electronics'
            },
            currentStock: 5,
            minimumStock: 10,
            reorderPoint: 15,
            lastUpdated: new Date().toISOString(),
            status: 'low'
          },
          {
            _id: '3',
            product: {
              _id: '3',
              sku: 'ELK003',
              name: { en: 'Dell XPS 13', si: 'ඩෙල් XPS 13' },
              category: 'Electronics'
            },
            currentStock: 0,
            minimumStock: 5,
            reorderPoint: 8,
            lastUpdated: new Date().toISOString(),
            status: 'out'
          }
        ];
        setItems(mockData);
      } catch (error) {
        console.error('Error loading stock:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStock();
  }, [searchTerm, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'low': return <TrendingDown className="w-4 h-4 text-yellow-400" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'out': return <Package className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'low': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'critical': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'out': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.product.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#F8F8F8]/50 w-4 h-4" />
            <input
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
          >
            <option value="all">All Status</option>
            <option value="good">Good Stock</option>
            <option value="low">Low Stock</option>
            <option value="critical">Critical</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
          <div className="flex items-center">
            <div className="p-3 bg-green-500/20 rounded-xl mr-3">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Good Stock</p>
              <p className="text-2xl font-bold text-green-400">127</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-500/20 rounded-xl mr-3">
              <TrendingDown className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-400">23</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
          <div className="flex items-center">
            <div className="p-3 bg-orange-500/20 rounded-xl mr-3">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Critical</p>
              <p className="text-2xl font-bold text-orange-400">8</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
          <div className="flex items-center">
            <div className="p-3 bg-red-500/20 rounded-xl mr-3">
              <Package className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Out of Stock</p>
              <p className="text-2xl font-bold text-red-400">12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Min Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-white/10 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-white/10 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-white/10 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-white/10 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-white/10 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 bg-white/10 rounded w-20"></div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredItems.map((item) => (
                  <tr key={item._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-[#F8F8F8]">
                          {item.product.name.en}
                        </div>
                        <div className="text-sm text-[#F8F8F8]/70">
                          {item.product.category}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#F8F8F8]">
                      {item.product.sku}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-semibold text-[#F8F8F8]">
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#F8F8F8]/70">
                      {item.minimumStock}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1 capitalize">{item.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 transition-colors">
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && !loading && (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-[#F8F8F8]/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#F8F8F8] mb-2">No Products Found</h3>
            <p className="text-[#F8F8F8]/70">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};