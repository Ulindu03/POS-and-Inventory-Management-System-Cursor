import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { CustomerList } from '@/features/customers/CustomerList';
import { CustomerForm } from '@/features/customers/CustomerForm';
import { CustomerProfile } from '@/features/customers/CustomerProfile';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, Star, CreditCard } from 'lucide-react';
import { GlassCard } from '@/components/common/Card';
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
  const [purchases, setPurchases] = useState<Purchase[]>([]);
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
          taxId: 'CORP789012',
          totalPurchases: 156,
          totalSpent: 2500000,
          lastPurchase: new Date(Date.now() - 86400000 * 1).toISOString(),
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 730).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const samplePurchases: Purchase[] = [
        {
          _id: 'p1',
          invoiceNo: 'INV-001',
          total: 4500,
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          items: [
            { product: 'LED Bulb 9W', quantity: 5, price: 900 }
          ]
        },
        {
          _id: 'p2',
          invoiceNo: 'INV-002',
          total: 12000,
          status: 'completed',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          items: [
            { product: 'Extension Cord 5m', quantity: 2, price: 6000 }
          ]
        }
      ];

      setCustomers(sampleCustomers);
      setPurchases(samplePurchases);
      setStats({
        totalCustomers: sampleCustomers.length,
        activeCustomers: sampleCustomers.length,
        totalLoyaltyPoints: sampleCustomers.reduce((sum, c) => sum + c.loyaltyPoints, 0),
        typeDistribution: [
          { _id: 'retail', count: 1 },
          { _id: 'corporate', count: 1 }
        ],
        recentCustomers: sampleCustomers.slice(0, 3)
      });
    };

    loadData();
  }, []);

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

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
    <AppLayout>
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8 p-6"
        >
            {/* Header */}
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Customer Management
              </h1>
              <p className="text-gray-300 mt-2">Manage your customer database, loyalty programs, and relationships</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassCard className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl text-white mx-auto mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">{totalCustomers}</h3>
                <p className="text-gray-600">Total Customers</p>
              </GlassCard>

              <GlassCard className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white mx-auto mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">{activeCustomers}</h3>
                <p className="text-gray-600">Active Customers</p>
              </GlassCard>

              <GlassCard className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl text-white mx-auto mb-4">
                  <Star className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">{totalLoyaltyPoints.toLocaleString()}</h3>
                <p className="text-gray-600">Total Loyalty Points</p>
              </GlassCard>

              <GlassCard className="p-6 text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl text-white mx-auto mb-4">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">{formatLKR(totalCreditLimit)}</h3>
                <p className="text-gray-600">Total Credit Limit</p>
              </GlassCard>
            </div>

            {/* Customer List */}
            <CustomerList
              customers={customers}
              onAddCustomer={handleAddCustomer}
              onEditCustomer={handleEditCustomer}
              onViewCustomer={handleViewCustomer}
              isLoading={isLoading}
            />
        </motion.div>
      </div>

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
    </AppLayout>
  );
};

// Helper function for currency formatting
const formatLKR = (amount: number): string => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default Customers;
