
// This file shows the Customers page.
// In simple English:
// - Lets you view, add, edit, and manage customers and their purchase history.
import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { CustomerList } from '@/features/customers/CustomerList';
import { CustomerForm } from '@/features/customers/CustomerForm';
import { CustomerProfile } from '@/features/customers/CustomerProfile';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, TrendingUp, Search, X } from 'lucide-react';
import { 
  getCustomers, 
  getCustomerStats, 
  createCustomer, 
  updateCustomer, 
  // deleteCustomer,
  redeemLoyaltyPoints,
  getCustomerById,
  type Customer,
  type Purchase
} from '@/lib/api/customers.api';
import { deleteCustomer } from '@/lib/api/customers.api';



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
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load customers and stats from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const customersResponse = await getCustomers({ limit: 50 });
        setCustomers((customersResponse as any).data || customersResponse || []);
      } catch (error) {
        console.error('Error loading customers list:', error);
        // Only use sample data if the list endpoint fails
        loadSampleData();
      }
      // Stats are admin-only now; fetch them opportunistically and ignore errors
      try {
        const statsResponse = await getCustomerStats();
        setStats((statsResponse as any).data || statsResponse || null);
      } catch (error) {
        setStats(null);
      }
      setIsLoading(false);
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

  // When a customer is selected, fetch full details including purchases
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (!selectedCustomer) return;
      try {
        const res = await getCustomerById(selectedCustomer._id);
        const details = res.data?.data ?? res.data;
        const recentPurchases: Purchase[] = res.purchases ?? res.data?.purchases ?? [];
        setSelectedCustomer(details);
        setPurchases(recentPurchases);
      } catch (e) {
        console.error('Failed to load customer details', e);
      }
    };
    load();
    return () => controller.abort();
  }, [selectedCustomer?._id]);

  // Listen for sales:created events to refresh purchase list when it belongs to selected customer
  useEffect(() => {
    async function refreshForCustomer(customerId: string) {
      try {
        const res = await getCustomerById(customerId);
        const recentPurchases: Purchase[] = res.purchases ?? res.data?.purchases ?? [];
        setPurchases(recentPurchases);
        const updated = res.data?.data ?? res.data;
        setSelectedCustomer(updated);
        setCustomers(prev => prev.map(c => c._id === updated._id ? { ...c, totalPurchases: updated.totalPurchases, totalSpent: updated.totalSpent, lastPurchase: updated.lastPurchase } : c));
      } catch (e) {
        console.error('Failed to refresh purchases', e);
      }
    }

    const handler = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      const cid = e.detail?.customerId as string | undefined;
      if (cid && selectedCustomer && cid === selectedCustomer._id) {
        refreshForCustomer(cid);
      }
    };
    window.addEventListener('sales:created', handler as EventListener);
    // BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    try {
      bc = new (window as any).BroadcastChannel ? new BroadcastChannel('sales') : null;
      if (bc) {
        bc.onmessage = (msg: MessageEvent<any>) => {
          const data = msg.data || {};
          if (data.type === 'created' && data.customerId && selectedCustomer && data.customerId === selectedCustomer._id) {
            refreshForCustomer(data.customerId);
          }
        };
      }
    } catch {}
    // storage event fallback
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sales:lastCreated' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.customerId && selectedCustomer && data.customerId === selectedCustomer._id) {
            refreshForCustomer(data.customerId);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('sales:created', handler as EventListener);
  }, [selectedCustomer?._id]);

  // Refresh customer list on create/update from POS
  useEffect(() => {
    const refreshCustomers = async () => {
      try {
        const resp = await getCustomers({ limit: 50 });
        setCustomers(resp.data || []);
      } catch (e) {
        console.error('Failed to refresh customers list', e);
      }
    };
    const onLocal = () => refreshCustomers();
    window.addEventListener('customers:changed', onLocal as EventListener);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new (window as any).BroadcastChannel ? new BroadcastChannel('customers') : null;
      if (bc) bc.onmessage = () => refreshCustomers();
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'customers:lastChanged' && e.newValue) refreshCustomers();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('customers:changed', onLocal as EventListener);
      window.removeEventListener('storage', onStorage);
      try { bc?.close(); } catch {}
    };
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
        alternatePhone: data.alternatePhone?.trim() ? data.alternatePhone : undefined,
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

const handleDeleteCustomer = async (customer: Customer) => {
  if (!customer || !customer._id) return;
  const ok = window.confirm(`Delete customer ${customer.name} (${customer.customerCode})?`);
  if (!ok) return;
  try {
    await deleteCustomer(customer._id);
    setCustomers(prev => prev.filter(c => c._id !== customer._id));
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || 'Failed to delete customer';
    alert(msg);
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
  const retailCount = customers.filter((c) => (c.type || '').toLowerCase() === 'retail').length;
  const wholesaleCount = customers.filter((c) => (c.type || '').toLowerCase() === 'wholesale').length;
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      // Type filter
      if (customerTypeFilter !== 'all' && (c.type || '').toLowerCase() !== customerTypeFilter) return false;
      // Search filter
      if (q) {
        const name = (c.name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.phone || '').replace(/\s+/g, '').toLowerCase();
        const code = (c.customerCode || '').toLowerCase();
        const queryNorm = q.replace(/\s+/g, '');
        if (!name.includes(q) && !email.includes(q) && !phone.includes(queryNorm) && !code.includes(q)) return false;
      }
      return true;
    });
  }, [customers, customerTypeFilter, searchQuery]);
  // Total credit card removed by request
  

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

            {/* Third summary card removed (Total Credit) */}
          </div>

          {/* Customer List Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8 shadow-2xl"
          >
            {/* Search Bar */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name, phone, email, or customer code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 transition-all text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
              <p className="text-gray-400 text-sm">{searchQuery ? `${filteredCustomers.length} result${filteredCustomers.length !== 1 ? 's' : ''} found` : ''}</p>
              <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1 text-sm font-semibold text-white">
                {([
                  { label: 'All', value: 'all', count: customers.length },
                  { label: 'Retail', value: 'retail', count: retailCount },
                  { label: 'Wholesale', value: 'wholesale', count: wholesaleCount }
                ] as const).map(({ label, value, count }) => {
                  const active = customerTypeFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCustomerTypeFilter(value)}
                      className={`px-4 py-2 rounded-2xl transition-colors flex items-center gap-2 ${
                        active
                          ? 'bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-black shadow-[0_8px_20px_rgba(255,225,0,0.25)]'
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="text-xs font-medium text-gray-800/70 bg-white/70 rounded-full px-2 py-0.5">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <CustomerList
              customers={filteredCustomers}
              onAddCustomer={handleAddCustomer}
              onEditCustomer={handleEditCustomer}
              onViewCustomer={handleViewCustomer}
              onDeleteCustomer={handleDeleteCustomer}
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
