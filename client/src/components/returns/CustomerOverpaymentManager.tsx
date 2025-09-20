import React, { useState, useEffect } from 'react';
import { returnsApi, CustomerOverpayment } from '@/lib/api/returns.api';

interface CustomerOverpaymentManagerProps {
  customerId: string;
  onApplyCredit?: (amount: number) => void;
}

const CustomerOverpaymentManager: React.FC<CustomerOverpaymentManagerProps> = ({
  customerId,
  onApplyCredit
}) => {
  const [overpayments, setOverpayments] = useState<CustomerOverpayment[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [applyAmount, setApplyAmount] = useState(0);

  useEffect(() => {
    if (customerId) {
      fetchOverpayments();
    }
  }, [customerId]);

  const fetchOverpayments = async () => {
    setLoading(true);
    try {
      const response = await returnsApi.overpayment.getCustomerOverpayments(customerId);
      setOverpayments(response.data.overpayments);
      setTotalBalance(response.data.totalBalance);
    } catch (error) {
      console.error('Failed to fetch overpayments:', error);
      alert('Failed to load customer credit');
    } finally {
      setLoading(false);
    }
  };

  const applyCredit = async () => {
    if (applyAmount <= 0 || applyAmount > totalBalance) return;

    try {
      await returnsApi.overpayment.use(customerId, applyAmount, 'current-sale');
      alert(`Applied ${formatCurrency(applyAmount)} from customer credit`);
      
      if (onApplyCredit) {
        onApplyCredit(applyAmount);
      }
      
      fetchOverpayments();
      setApplyAmount(0);
    } catch (error) {
      console.error('Failed to apply credit:', error);
      alert('Failed to apply customer credit');
    }
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'fully_used': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p>Loading customer credit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Credit Balance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Customer Credit Balance</h3>
        
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-600">Total Available Credit</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Active Credits</p>
            <p className="text-xl font-semibold">
              {overpayments.filter(op => op.status === 'active').length}
            </p>
          </div>
        </div>

        {totalBalance > 0 && onApplyCredit && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Apply Credit to Current Sale</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Amount to Apply</label>
                <input
                  type="number"
                  min="0"
                  max={totalBalance}
                  step="0.01"
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder={`Max: ${formatCurrency(totalBalance)}`}
                />
              </div>
              <button
                onClick={applyCredit}
                disabled={applyAmount <= 0 || applyAmount > totalBalance}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Apply Credit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Credit Details */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Credit History</h3>
        
        {overpayments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No customer credits found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {overpayments.map((overpayment) => (
              <div
                key={overpayment._id}
                className="p-4 border rounded-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium">Credit from {overpayment.source}</p>
                    <p className="text-sm text-gray-600">
                      Created: {formatDate(overpayment.createdAt)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(overpayment.status)}`}>
                    {overpayment.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Original Amount:</span>
                    <p className="font-semibold">{formatCurrency(overpayment.amount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Remaining Balance:</span>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(overpayment.balance)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Used:</span>
                    <p className="font-medium">
                      {formatCurrency(overpayment.amount - overpayment.balance)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Usage Progress</span>
                    <span>
                      {((overpayment.amount - overpayment.balance) / overpayment.amount * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: `${(overpayment.amount - overpayment.balance) / overpayment.amount * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {totalBalance > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setApplyAmount(Math.min(totalBalance, 100))}
              className="p-3 border border-gray-300 rounded hover:bg-gray-50"
            >
              Apply {formatCurrency(Math.min(totalBalance, 100))}
            </button>
            <button
              onClick={() => setApplyAmount(Math.min(totalBalance, 500))}
              className="p-3 border border-gray-300 rounded hover:bg-gray-50"
            >
              Apply {formatCurrency(Math.min(totalBalance, 500))}
            </button>
            <button
              onClick={() => setApplyAmount(totalBalance)}
              className="p-3 border border-gray-300 rounded hover:bg-gray-50"
            >
              Apply All ({formatCurrency(totalBalance)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOverpaymentManager;