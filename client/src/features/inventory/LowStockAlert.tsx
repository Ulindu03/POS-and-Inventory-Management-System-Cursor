import { useState, useEffect } from 'react';
import { AlertTriangle, Package, ShoppingCart, Eye } from 'lucide-react';
import { formatLKR } from '@/lib/utils/currency';

interface LowStockItem {
  _id: string;
  product: {
    _id: string;
    sku: string;
    name: { en: string; si: string };
    category: string;
    supplier: string;
  };
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  stockStatus: 'low' | 'critical' | 'out';
  daysUntilOut: number;
  suggestedReorder: number;
}

export const LowStockAlert = () => {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLowStockItems = async () => {
      setLoading(true);
      try {
        // Mock data - replace with actual API call
        const mockData: LowStockItem[] = [
          {
            _id: '1',
            product: {
              _id: '1',
              sku: 'ELK002',
              name: { en: 'iPhone 15 Pro', si: 'අයිෆෝන් 15 ප්‍රෝ' },
              category: 'Electronics',
              supplier: 'Tech Distributors Ltd'
            },
            currentStock: 5,
            minimumStock: 10,
            reorderPoint: 15,
            stockStatus: 'low',
            daysUntilOut: 12,
            suggestedReorder: 50
          },
          {
            _id: '2',
            product: {
              _id: '2',
              sku: 'ELK003',
              name: { en: 'Dell XPS 13', si: 'ඩෙල් XPS 13' },
              category: 'Electronics',
              supplier: 'Computer World'
            },
            currentStock: 2,
            minimumStock: 5,
            reorderPoint: 8,
            stockStatus: 'critical',
            daysUntilOut: 3,
            suggestedReorder: 25
          },
          {
            _id: '3',
            product: {
              _id: '3',
              sku: 'ELK004',
              name: { en: 'MacBook Air M3', si: 'මැක්බුක් එයාර් M3' },
              category: 'Electronics',
              supplier: 'Apple Store'
            },
            currentStock: 0,
            minimumStock: 3,
            reorderPoint: 5,
            stockStatus: 'out',
            daysUntilOut: 0,
            suggestedReorder: 15
          }
        ];
        setLowStockItems(mockData);
      } catch (error) {
        console.error('Error loading low stock items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLowStockItems();
  }, []);

  const getUrgencyColor = (status: string) => {
    switch (status) {
      case 'low': return 'border-l-yellow-500 bg-yellow-500/5';
      case 'critical': return 'border-l-orange-500 bg-orange-500/5';
      case 'out': return 'border-l-red-500 bg-red-500/5';
      default: return 'border-l-gray-500 bg-gray-500/5';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'low': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'critical': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      case 'out': return <Package className="w-5 h-5 text-red-400" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-[#F8F8F8]">Low Stock Alerts</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            View All
          </button>
          <button 
            className="px-4 py-2 rounded-xl font-semibold transition-colors flex items-center"
            style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 border-l-4 border-l-yellow-500">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-400">15</p>
              <p className="text-xs text-[#F8F8F8]/50">Items below minimum</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-orange-400 mr-3" />
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Critical</p>
              <p className="text-2xl font-bold text-orange-400">8</p>
              <p className="text-xs text-[#F8F8F8]/50">Need immediate action</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 border-l-4 border-l-red-500">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-red-400 mr-3" />
            <div>
              <p className="text-sm text-[#F8F8F8]/70">Out of Stock</p>
              <p className="text-2xl font-bold text-red-400">3</p>
              <p className="text-xs text-[#F8F8F8]/50">Zero inventory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Items */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className="w-12 h-12 bg-white/10 rounded-xl mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-white/10 rounded mb-2 w-48"></div>
                    <div className="h-3 bg-white/10 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-8 bg-white/10 rounded w-24"></div>
              </div>
            </div>
          ))
        ) : (
          lowStockItems.map((item) => (
            <div
              key={item._id}
              className={`rounded-2xl border border-white/10 backdrop-blur-md p-6 border-l-4 ${getUrgencyColor(item.stockStatus)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className="p-3 bg-white/10 rounded-xl mr-4">
                    {getStatusIcon(item.stockStatus)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="font-semibold text-[#F8F8F8] mr-2">
                        {item.product.name.en}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.stockStatus === 'low' ? 'bg-yellow-500/20 text-yellow-400' :
                        item.stockStatus === 'critical' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {item.stockStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-[#F8F8F8]/70 space-x-4">
                      <span>SKU: {item.product.sku}</span>
                      <span>Category: {item.product.category}</span>
                      <span>Supplier: {item.product.supplier}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right mr-6">
                  <div className="text-sm text-[#F8F8F8]/70 mb-1">Current / Min Stock</div>
                  <div className="text-lg font-semibold">
                    <span className={item.currentStock === 0 ? 'text-red-400' : 'text-[#F8F8F8]'}>
                      {item.currentStock}
                    </span>
                    <span className="text-[#F8F8F8]/50 mx-1">/</span>
                    <span className="text-[#F8F8F8]/70">{item.minimumStock}</span>
                  </div>
                  {item.daysUntilOut > 0 && (
                    <div className="text-xs text-orange-400">
                      ~{item.daysUntilOut} days until out
                    </div>
                  )}
                </div>

                <div className="text-right mr-6">
                  <div className="text-sm text-[#F8F8F8]/70 mb-1">Suggested Reorder</div>
                  <div className="text-lg font-semibold text-green-400">
                    {item.suggestedReorder}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 transition-colors">
                    Adjust Stock
                  </button>
                  <button 
                    className="px-3 py-1 text-sm rounded-lg font-medium transition-colors"
                    style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
                  >
                    Reorder
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {lowStockItems.length === 0 && !loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-12 text-center">
          <Package className="w-16 h-16 text-[#F8F8F8]/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#F8F8F8] mb-2">All Stock Levels Good!</h3>
          <p className="text-[#F8F8F8]/70">No products currently require restocking.</p>
        </div>
      )}
    </div>
  );
};