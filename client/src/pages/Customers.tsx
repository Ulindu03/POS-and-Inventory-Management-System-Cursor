import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { CustomerList } from '@/features/customers/CustomerList';
import { CustomerForm } from '@/features/customers/CustomerForm';
import { CustomerProfile } from '@/features/customers/CustomerProfile';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, TrendingUp, Star, CreditCard } from 'lucide-react';
import { 
  getCustomers, 
  getCustomerStats, 
  createCustomer, 
  updateCustomer, 
  // deleteCustomer,
  redeemLoyaltyPoints,
  type Customer,
  type Purchase
} from '@/lib/api/customers.api';



const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load customers and stats from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [customersResponse, statsResponse] = await Promise.all([
          getCustomers({ limit: 50 }),
          getCustomerStats()
        ]);
        
        setCustomers(customersResponse.data || []);
        setStats(statsResponse.data);
      } catch (error) {
        console.error('Error loading customers:', error);
        // Fallback to sample data if API fails
        loadSampleData();
      } finally {
        setIsLoading(false);
      }
    };

    const loadSampleData = () => {
      const sampleCustomers: Customer[] = [
        {
          _id: '1',
          customerCode: 'CUST-001',
          name: 'John Doe',
          email: 'john.doe@email.com',
          phone: '+94 71 234 5678',
          alternatePhone: '+94 11 234 5678',
          type: 'retail',
          creditLimit: 50000,
          creditUsed: 15000,
          loyaltyPoints: 1250,
          address: {
            street: '123 Main Street',
            city: 'Colombo',
            province: 'Western',
            postalCode: '10000'
          },
          taxId: 'TAX123456',
          birthday: '1990-05-15',
          notes: 'Regular customer, prefers LED products',
          totalPurchases: 45,
          totalSpent: 125000,
          lastPurchase: new Date(Date.now() - 86400000 * 3).toISOString(),
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 365).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: '2',
          customerCode: 'CUST-002',
          name: 'ABC Electronics Ltd',
          email: 'orders@abcelectronics.lk',
          phone: '+94 11 345 6789',
          type: 'corporate',
          creditLimit: 500000,
          creditUsed: 125000,
          loyaltyPoints: 8500,
          address: {
            street: '456 Business Avenue',
            city: 'Colombo',
            province: 'Western',
            postalCode: '10001'
          },
          taxId: 'TAX654321',
          birthday: '1985-10-20',
          notes: 'Bulk buyer, prefers monthly invoicing',
          totalPurchases: 120,
          totalSpent: 2500000,
          lastPurchase: new Date(Date.now() - 86400000 * 10).toISOString(),
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 365).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setCustomers(sampleCustomers);
    };

    loadData();
  }, []);

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowProfile(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      // Sanitize payload: remove empty strings and convert date fields
      const payload = {
        ...data,
        birthday: data.birthday ? new Date(data.birthday).toISOString() : undefined,
        alternatePhone: data.alternatePhone?.trim() ? data.alternatePhone : undefined,
        taxId: data.taxId?.trim() ? data.taxId : undefined,
        notes: data.notes?.trim() ? data.notes : undefined,
      };
      
      if (editingCustomer) {
        // Update existing customer
        const response = await updateCustomer(editingCustomer._id, payload);
        const updated = response.data?.data ?? response.data; // support both shapes
        setCustomers(prev => prev.map(c => 
          c._id === editingCustomer._id 
            ? { ...c, ...updated }
            : c
        ));
      } else {
        // Add new customer
        const response = await createCustomer(payload);
        const created = response.data?.data ?? response.data;
        setCustomers(prev => [...prev, created]);
      }
        // removed unused totalCreditUsed
      setShowForm(false);
      setEditingCustomer(null);
    } catch (error: any) {
      console.error('Error saving customer:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to save customer. Please try again.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleProfileClose = () => {
    setShowProfile(false);
    setSelectedCustomer(null);
  };

  const handleProfileEdit = () => {
  if (selectedCustomer) {
    setEditingCustomer(selectedCustomer);
    setShowProfile(false);
    setShowForm(true);
  }
};

// Handler for Add Customer button
const handleAddCustomer = () => {
  setEditingCustomer(null);
  setShowForm(true);
};

// Handler for Edit Customer action
const handleEditCustomer = (customer: Customer) => {
  setEditingCustomer(customer);
  setShowForm(true);
};

  const handleRedeemPoints = async (data: any) => {
    if (!selectedCustomer) return;
    try {
      setIsSubmitting(true);
      await redeemLoyaltyPoints(selectedCustomer._id, data);
      setCustomers(prev => prev.map(c => 
        c._id === selectedCustomer._id 
          ? { ...c, loyaltyPoints: c.loyaltyPoints - data.points }
          : c
      ));
      
      // Update selected customer
      setSelectedCustomer(prev => prev ? { ...prev, loyaltyPoints: prev.loyaltyPoints - data.points } : null);
      
      alert('Points redeemed successfully!');
    } catch (error) {
      console.error('Error redeeming points:', error);
      alert('Failed to redeem points. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use stats from API or calculate from customers
  const totalCustomers = stats?.totalCustomers || customers.length;
  const activeCustomers = stats?.activeCustomers || customers.filter(c => c.isActive).length;
  const totalLoyaltyPoints = stats?.totalLoyaltyPoints || customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
  const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
  

  return (
    <div className="w-full min-h-screen bg-[#242424]">
      <AppLayout className="bg-[#242424]">
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">
              Customer Management
            </h1>
            <p className="text-gray-400 text-lg">Build lasting relationships with your customers</p>
          </div>

          {/* Enhanced Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-400/30 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{totalCustomers}</p>
                    <p className="text-blue-300 text-sm font-medium">Total Customers</p>
                  </div>
                </div>
                <div className="h-1 bg-blue-500/30 rounded-full">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full w-3/4"></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 hover:border-green-400/30 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{activeCustomers}</p>
                    <p className="text-green-300 text-sm font-medium">Active Customers</p>
                  </div>
                </div>
                <div className="h-1 bg-green-500/30 rounded-full">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full w-4/5"></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 hover:border-yellow-400/30 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{totalLoyaltyPoints.toLocaleString()}</p>
                    <p className="text-yellow-300 text-sm font-medium">Loyalty Points</p>
                  </div>
                </div>
                <div className="h-1 bg-yellow-500/30 rounded-full">
                  <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full w-2/3"></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 hover:border-purple-400/30 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{formatLKR(totalCreditLimit)}</p>
                    <p className="text-purple-300 text-sm font-medium">Total Credit</p>
                  </div>
                </div>
                <div className="h-1 bg-purple-500/30 rounded-full">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full w-5/6"></div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Customer List Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8 shadow-2xl"
          >
            <CustomerList
              customers={customers}
              onAddCustomer={handleAddCustomer}
              onEditCustomer={handleEditCustomer}
              onViewCustomer={handleViewCustomer}
              isLoading={isLoading}
              tableView={false} // Use card view for better design
            />
          </motion.div>
        </div>
      </AppLayout>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <CustomerForm
            customer={editingCustomer || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isLoading={isSubmitting}
          />
        )}

        {showProfile && selectedCustomer && (
          <CustomerProfile
            customer={selectedCustomer}
            purchases={purchases}
            onEdit={handleProfileEdit}
            onClose={handleProfileClose}
            onRedeemPoints={handleRedeemPoints}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

// Helper function for currency formatting
const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default Customers;
