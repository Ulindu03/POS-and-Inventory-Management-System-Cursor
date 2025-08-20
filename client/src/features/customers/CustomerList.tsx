import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/common/Card';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Eye, 
  Star, 
  Phone, 
  Mail, 
  MapPin,
  CreditCard,
  Users,
  Building,
  ShoppingBag
} from 'lucide-react';
import { formatLKR } from '@/lib/utils/currency';

interface Customer {
  _id: string;
  customerCode: string;
  name: string;
  email: string;
  phone: string;
  type: 'retail' | 'wholesale' | 'corporate';
  creditLimit: number;
  creditUsed: number;
  loyaltyPoints: number;
  address: {
    city: string;
    province: string;
  };
  totalPurchases: number;
  lastPurchase: string;
  isActive: boolean;
}

interface CustomerListProps {
  customers: Customer[];
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onViewCustomer: (customer: Customer) => void;
  isLoading?: boolean;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onAddCustomer,
  onEditCustomer,
  onViewCustomer,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.phone.includes(searchTerm) ||
                          customer.customerCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || customer.type === filterType;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof Customer];
      let bValue: any = b[sortBy as keyof Customer];
      
      if (sortBy === 'name') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'retail': return <Users className="w-4 h-4" />;
      case 'wholesale': return <Building className="w-4 h-4" />;
      case 'corporate': return <ShoppingBag className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'retail': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'wholesale': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'corporate': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCreditStatus = (used: number, limit: number) => {
    if (limit === 0) return { color: 'text-gray-500', text: 'No Credit' };
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return { color: 'text-red-600', text: 'Critical' };
    if (percentage >= 75) return { color: 'text-orange-600', text: 'High' };
    if (percentage >= 50) return { color: 'text-yellow-600', text: 'Medium' };
    return { color: 'text-green-600', text: 'Good' };
  };

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Customers</h2>
          <p className="text-gray-600">Manage your customer database</p>
        </div>
        <button
          onClick={onAddCustomer}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name, email, phone, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        </div>
        
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="all">All Types</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
            <option value="corporate">Corporate</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="name">Sort by Name</option>
            <option value="loyaltyPoints">Sort by Loyalty Points</option>
            <option value="totalPurchases">Sort by Total Purchases</option>
            <option value="lastPurchase">Sort by Last Purchase</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Customer Count */}
      <div className="mb-4">
        <p className="text-gray-600">
          Showing {filteredCustomers.length} of {customers.length} customers
        </p>
      </div>

      {/* Customer Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredCustomers.map((customer, index) => (
              <motion.div
                key={customer._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                {/* Customer Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {customer.name}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">
                        {customer.customerCode}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${getTypeColor(customer.type)}`}>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(customer.type)}
                        {customer.type}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {customer.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {customer.phone}
                    </div>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {customer.address.city}, {customer.address.province}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {customer.loyaltyPoints.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                        <Star className="w-3 h-3" />
                        Points
                      </div>
                    </div>
                    
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {customer.totalPurchases}
                      </div>
                      <div className="text-xs text-gray-500">Purchases</div>
                    </div>
                  </div>

                  {/* Credit Status */}
                  {customer.creditLimit > 0 && (
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Credit:</span>
                        <span className="font-semibold">
                          {formatLKR(customer.creditUsed)} / {formatLKR(customer.creditLimit)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((customer.creditUsed / customer.creditLimit) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-right mt-1">
                        <span className={getCreditStatus(customer.creditUsed, customer.creditLimit).color}>
                          {getCreditStatus(customer.creditUsed, customer.creditLimit).text}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Last Purchase */}
                  {customer.lastPurchase && (
                    <div className="text-xs text-gray-500 text-center">
                      Last purchase: {new Date(customer.lastPurchase).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onViewCustomer(customer)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => onEditCustomer(customer)}
                      className="flex-1 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first customer'
            }
          </p>
          {!searchTerm && filterType === 'all' && (
            <button
              onClick={onAddCustomer}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Add First Customer
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
};
