
// This file shows the Purchase Orders page.
// In simple English:
// - Lets you view, create, and manage purchase orders and see related stats.
import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, FileText, Truck, CheckCircle, Mail } from 'lucide-react';
import { PurchaseOrder, getPurchaseOrders, getPurchaseOrderStats, updatePurchaseOrderStatus } from '@/lib/api/purchaseOrders.api';

const PurchaseOrders: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    loadPurchaseOrders();
    loadStats();
  }, []);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPurchaseOrders();
      if (response.success) {
        setPurchaseOrders(response.data);
      } else {
        setError('Failed to load purchase orders');
      }
    } catch (err) {
      console.error('Error loading purchase orders:', err);
      setError('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getPurchaseOrderStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleMarkCompleted = async (id: string) => {
    try {
      setCompletingId(id);
      const res = await updatePurchaseOrderStatus(id, 'completed');
      if (res.success) {
        // Update the row locally
        setPurchaseOrders((prev) => prev.map((p) => (p._id === id ? { ...p, status: 'completed' } as any : p)));
        // Refresh stats to reflect counts
        loadStats();
      } else {
        alert('Failed to mark as completed');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to mark as completed');
    } finally {
      setCompletingId(null);
    }
  };

  const handleMarkReceived = async (id: string) => {
    try {
      setReceivingId(id);
      const res = await updatePurchaseOrderStatus(id, 'received');
      if (res.success) {
        setPurchaseOrders((prev) => prev.map((p) => (p._id === id ? { ...p, status: 'received', actualDelivery: new Date().toISOString() } as any : p)));
        loadStats();
      } else {
        alert('Failed to mark as received');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to mark as received');
    } finally {
      setReceivingId(null);
    }
  };

  const handleMarkSent = async (id: string) => {
    try {
      setSendingId(id);
      const res = await updatePurchaseOrderStatus(id, 'sent');
      if (res.success) {
        setPurchaseOrders((prev) => prev.map((p) => (p._id === id ? { ...p, status: 'sent' } as any : p)));
        loadStats();
      } else {
        alert('Failed to mark as sent');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to mark as sent');
    } finally {
      setSendingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-white/10 text-gray-200';
      case 'sent': return 'bg-blue-500/20 text-blue-300';
      case 'confirmed': return 'bg-yellow-500/20 text-yellow-300';
      case 'received': return 'bg-green-500/20 text-green-300';
      case 'cancelled': return 'bg-red-500/20 text-red-300';
      case 'completed': return 'bg-purple-500/20 text-purple-300';
      default: return 'bg-white/10 text-gray-200';
    }
  };

  // Payment column removed per request

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/10 border-l-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[#F8F8F8]">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => window.history.back()}
                className="mr-4 p-2 rounded-lg text-[#F8F8F8]/60 hover:text-[#F8F8F8] bg-white/5 hover:bg-white/10 border border-white/10"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[#F8F8F8]">Purchase Orders</h1>
                <p className="text-sm text-[#F8F8F8]/60">Manage purchase orders and track payments</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
              <div className="flex items-center">
                <div className="p-2 bg-white/10 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#F8F8F8]/70">Total Orders</p>
                  <p className="text-2xl font-bold text-[#F8F8F8]">{stats.totalOrders}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
              <div className="flex items-center">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Truck className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#F8F8F8]/70">Pending Orders</p>
                  <p className="text-2xl font-bold text-[#F8F8F8]">{stats.pendingOrders}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
              <div className="flex items-center">
                <div className="p-2 bg-white/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#F8F8F8]/70">Completed Orders</p>
                  <p className="text-2xl font-bold text-[#F8F8F8]">{stats.completedOrders ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="rounded-lg p-4 border border-red-500/30 bg-red-500/10">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-300 mr-2" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Orders List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-[#F8F8F8]">Purchase Orders</h2>
            <p className="text-sm text-[#F8F8F8]/60 mt-1">
              {purchaseOrders.length === 0 ? 'No purchase orders found.' : `${purchaseOrders.length} purchase orders`}
            </p>
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-[#F8F8F8]/60 mb-4">No purchase orders found</p>
              <button
                onClick={() => alert('Purchase Order creation coming soon!')}
                className="font-medium px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[#F8F8F8]"
              >
                Create your first purchase order
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">PO Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">Order Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">Emailed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/70 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {purchaseOrders.map((po) => (
                    <tr key={po._id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#F8F8F8]">{(po as any).poNumber || (po as any).orderNo || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#F8F8F8]">
                          {(() => {
                            const items: any[] = (po as any).items || [];
                            const first = items[0];
                            const prod: any = first?.product;
                            const name = typeof prod === 'string'
                              ? prod
                              : (prod?.name?.en || prod?.name || prod?.sku || '—');
                            const more = items.length > 1 ? ` +${items.length - 1} more` : '';
                            return name + more;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#F8F8F8]">{typeof (po as any).supplier === 'string' ? (po as any).supplier : (po as any).supplier?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#F8F8F8]">{po.orderDate ? new Date(po.orderDate as any).toLocaleDateString() : '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(((po as any).status || 'draft'))}`}>
                          {(((po as any).status || 'draft') === 'draft') ? 'pending' : ((po as any).status || 'draft')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(po as any).emailSent ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">Yes</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-300">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap space-x-2">
                        {(po as any).status === 'draft' && (
                          <button
                            onClick={() => handleMarkSent(po._id)}
                            disabled={sendingId === po._id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-amber-400 to-yellow-500 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-400/40 hover:-translate-y-0.5 transition border border-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-300/40 disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Mark this order as sent"
                          >
                            <Mail className="w-3.5 h-3.5 opacity-90" />
                            {sendingId === po._id ? 'Sending…' : 'Mark Sent'}
                          </button>
                        )}
                        {((po as any).status === 'sent' || (po as any).status === 'confirmed') && (
                          <button
                            onClick={() => handleMarkReceived(po._id)}
                            disabled={receivingId === po._id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-500 shadow-lg shadow-blue-500/20 hover:shadow-blue-400/40 hover:-translate-y-0.5 transition border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-300/40 disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Mark this order as received"
                          >
                            <CheckCircle className="w-3.5 h-3.5 opacity-90" />
                            {receivingId === po._id ? 'Receiving…' : 'Mark Received'}
                          </button>
                        )}
                        {((po as any).status === 'received') && (
                          <button
                            onClick={() => handleMarkCompleted(po._id)}
                            disabled={completingId === po._id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/40 hover:-translate-y-0.5 transition border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Mark this order as completed"
                          >
                            <CheckCircle className="w-3.5 h-3.5 opacity-90" />
                            {completingId === po._id ? 'Completing…' : 'Mark Completed'}
                          </button>
                        )}
                        {/* Placeholder removed: no dash shown when no actions available */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrders;
