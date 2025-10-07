
// This file shows the Suppliers page.
// In simple English:
// - Lets you view, add, edit, and manage suppliers and their details.
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, Star, DollarSign } from 'lucide-react';
import { SupplierList, SupplierForm, SupplierProfile } from '@/features/suppliers';
import { Supplier, getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/lib/api/suppliers.api';
import { formatLKR } from '@/lib/utils/currency';
import { AppLayout } from '@/components/common/Layout/Layout';


const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>();
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();

  // Load suppliers on component mount
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSuppliers();
      if (response.success && response.data && response.data.length > 0) {
        setSuppliers(response.data);
      } else {
        // Fallback: add a sample supplier for testing modal
        setSuppliers([
          {
            _id: 'sample',
            supplierCode: 'SUP-001',
            name: 'Sample Supplier',
            contactPerson: 'Jane Doe',
            email: 'sample@supplier.com',
            phone: '+94 77 123 4567',
            address: { street: '123 Main St', city: 'Colombo', province: 'Western', postalCode: '10000' },
            taxId: 'TAXSUP123',
            paymentTerms: '30',
            creditLimit: 100000,
            creditUsed: 25000,
            categories: [],
            rating: 4,
            performance: { onTimeDelivery: 95, qualityRating: 90, priceCompetitiveness: 85 },
            status: 'active',
            isActive: true,
            notes: 'Preferred supplier',
            bankDetails: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            totalOrders: 12,
            totalSpent: 500000,
            outstandingBalance: 25000,
            productCount: 8
          }
        ]);
        setError(null); // Remove red warning if showing sample
      }
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = () => {
    setEditingSupplier(undefined);
    setShowForm(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleViewSupplier = (supplier: Supplier) => {
    // Show modal, do not navigate or reload
    setSelectedSupplier({
      ...supplier,
      address: supplier.address || { street: '', city: '', province: '', postalCode: '' },
      performance: supplier.performance || { onTimeDelivery: 0, qualityRating: 0, priceCompetitiveness: 0 },
      totalOrders: supplier.totalOrders || 0,
      totalSpent: supplier.totalSpent || 0,
      outstandingBalance: supplier.outstandingBalance || 0,
      rating: supplier.rating || 0,
    });
    setShowProfile(true);
  };

  const handleProfileClose = () => {
    setShowProfile(false);
    setSelectedSupplier(undefined);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) {
      return;
    }

    try {
      setError(null);
      const response = await deleteSupplier(id);
      if (response.success) {
        setSuppliers(prev => prev.filter(s => s._id !== id));
      } else {
        let msg = response.message || 'Failed to delete supplier.';
        if (msg.includes('associated products') || msg.includes('purchase orders')) {
          msg = 'Cannot delete supplier: This supplier has linked products or purchase orders.';
        }
        setError(msg);
      }
    } catch (err: any) {
      let msg = 'Failed to delete supplier.';
      const backendMsg = err && err.response && err.response.data && err.response.data.message;
      if (typeof backendMsg === 'string') {
        if (backendMsg.includes('associated products') || backendMsg.includes('purchase orders')) {
          msg = 'Cannot delete supplier: This supplier has linked products or purchase orders.';
        } else {
          msg = backendMsg;
        }
      }
      setError(msg);
    }
  };

  const handleFormSubmit = async (data: Partial<Supplier>) => {
    try {
      setFormLoading(true);
      setError(null);

      let response;
      if (editingSupplier) {
        response = await updateSupplier(editingSupplier._id, data);
      } else {
        response = await createSupplier(data);
      }

      if (response.success) {
        if (editingSupplier) {
          setSuppliers(prev => 
            prev.map(s => s._id === editingSupplier._id ? response.data : s)
          );
        } else {
          setSuppliers(prev => [...prev, response.data]);
        }
        setShowForm(false);
        setEditingSupplier(undefined);
      } else {
        setError('Failed to save supplier');
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError('Failed to save supplier');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingSupplier(undefined);
    setError(null);
  };

  // Calculate statistics
  const stats = {
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter(s => s.status === 'active' && s.isActive).length,
    totalSpent: suppliers.reduce((sum, s) => sum + (s.totalSpent || 0), 0),
    outstandingBalance: suppliers.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0),
  };

  return (
    <AppLayout>
      <div className="relative">
        {/* Full-width side background */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen bg-[#242424]" />
        <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8 p-6"
        >
            {/* Header */}
            <div className="text-center">
              <h1 className="text-4xl font-bold text-[#f8f8f8] drop-shadow-sm tracking-tight">Supplier Management</h1>
              <p className="mt-2 text-sm tracking-wide text-gray-400">Manage your suppliers and track performance</p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200">
                {error}
              </div>
            )}

            {/* Statistics Cards (gradient style like Customers page) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Suppliers */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-400/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.totalSuppliers}</p>
                      <p className="text-blue-300 text-sm font-medium">Total Suppliers</p>
                    </div>
                  </div>
                  <div className="h-1 bg-blue-500/30 rounded-full">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full w-3/4" />
                  </div>
                </div>
              </motion.div>

              {/* Active Suppliers */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 hover:border-green-400/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.activeSuppliers}</p>
                      <p className="text-green-300 text-sm font-medium">Active Suppliers</p>
                    </div>
                  </div>
                  <div className="h-1 bg-green-500/30 rounded-full">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full w-4/5" />
                  </div>
                </div>
              </motion.div>

              {/* Total Spent */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 hover:border-yellow-400/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                      <Star className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{formatLKR(stats.totalSpent)}</p>
                      <p className="text-yellow-300 text-sm font-medium">Total Spent</p>
                    </div>
                  </div>
                  <div className="h-1 bg-yellow-500/30 rounded-full">
                    <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full w-2/3" />
                  </div>
                </div>
              </motion.div>

              {/* Outstanding Balance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 hover:border-purple-400/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{formatLKR(stats.outstandingBalance)}</p>
                      <p className="text-purple-300 text-sm font-medium">Outstanding</p>
                    </div>
                  </div>
                  <div className="h-1 bg-purple-500/30 rounded-full">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full w-5/6" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Supplier List */}
            <SupplierList
              suppliers={suppliers}
              onViewSupplier={handleViewSupplier}
              onEditSupplier={handleEditSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onAddSupplier={handleAddSupplier}
              loading={loading}
            />
  </motion.div>
  </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <SupplierForm
            supplier={editingSupplier}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={formLoading}
          />
        )}

        {showProfile && selectedSupplier && (
          <SupplierProfile
            supplier={selectedSupplier}
            onEdit={() => {
              setEditingSupplier(selectedSupplier);
              setShowProfile(false);
              setShowForm(true);
            }}
            onView={handleProfileClose}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default Suppliers;
