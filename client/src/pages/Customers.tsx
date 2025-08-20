import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { CustomerList } from '@/features/customers/CustomerList';
import { CustomerForm } from '@/features/customers/CustomerForm';
import { CustomerProfile } from '@/features/customers/CustomerProfile';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, TrendingUp, Star, CreditCard } from 'lucide-react';
import { GlassCard } from '@/components/common/Card';

interface Customer {
  _id: string;
  customerCode: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  type: 'retail' | 'wholesale' | 'corporate';
  creditLimit: number;
  creditUsed: number;
  loyaltyPoints: number;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  taxId?: string;
  birthday?: string;
  notes?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchase: string;
  isActive: boolean;
  createdAt: string;
}

interface Purchase {
  _id: string;
  invoiceNo: string;
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  items: Array<{
    product: string;
    quantity: number;
    price: number;
  }>;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Sample data - in real app, this would come from API
  useEffect(() => {
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
          createdAt: new Date(Date.now() - 86400000 * 365).toISOString()
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
          createdAt: new Date(Date.now() - 86400000 * 730).toISOString()
        },
        {
          _id: '3',
          customerCode: 'CUST-003',
          name: 'Sarah Wilson',
          email: 'sarah.wilson@email.com',
          phone: '+94 72 456 7890',
          type: 'retail',
          creditLimit: 0,
          creditUsed: 0,
          loyaltyPoints: 450,
          address: {
            street: '789 Residential Road',
            city: 'Kandy',
            province: 'Central',
            postalCode: '20000'
          },
          birthday: '1985-12-20',
          totalPurchases: 23,
          totalSpent: 45000,
          lastPurchase: new Date(Date.now() - 86400000 * 7).toISOString(),
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 180).toISOString()
        },
        {
          _id: '4',
          customerCode: 'CUST-004',
          name: 'XYZ Wholesale',
          email: 'info@xyzwholesale.lk',
          phone: '+94 11 567 8901',
          type: 'wholesale',
          creditLimit: 1000000,
          creditUsed: 750000,
          loyaltyPoints: 15000,
          address: {
            street: '321 Industrial Zone',
            city: 'Gampaha',
            province: 'Western',
            postalCode: '11000'
          },
          taxId: 'WHOL345678',
          totalPurchases: 89,
          totalSpent: 1800000,
          lastPurchase: new Date(Date.now() - 86400000 * 2).toISOString(),
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 1095).toISOString()
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
        },
        {
          _id: 'p3',
          invoiceNo: 'INV-003',
          total: 8500,
          status: 'pending',
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          items: [
            { product: 'Switch 2-Gang', quantity: 3, price: 2833 }
          ]
        }
      ];

      setCustomers(sampleCustomers);
      setPurchases(samplePurchases);
      setIsLoading(false);
    };

    // Simulate API delay
    setTimeout(loadSampleData, 1000);
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

  const handleFormSubmit = (data: any) => {
    if (editingCustomer) {
      // Update existing customer
      setCustomers(prev => prev.map(c => 
        c._id === editingCustomer._id 
          ? { ...c, ...data, _id: c._id, customerCode: c.customerCode, createdAt: c.createdAt }
          : c
      ));
    } else {
      // Add new customer
      const newCustomer: Customer = {
        ...data,
        _id: Date.now().toString(),
        customerCode: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
        creditUsed: 0,
        totalPurchases: 0,
        totalSpent: 0,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      setCustomers(prev => [...prev, newCustomer]);
    }
    setShowForm(false);
    setEditingCustomer(null);
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

  // Calculate statistics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.isActive).length;
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
  const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
  const totalCreditUsed = customers.reduce((sum, c) => sum + c.creditUsed, 0);

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* Content */}
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
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <CustomerForm
            customer={editingCustomer || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        )}

        {showProfile && selectedCustomer && (
          <CustomerProfile
            customer={selectedCustomer}
            purchases={purchases}
            onEdit={handleProfileEdit}
            onClose={handleProfileClose}
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
