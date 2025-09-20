import React, { useState, useEffect } from 'react';
import { returnsApi } from '@/lib/api/returns.api';

interface AnalyticsData {
  totalReturns: number;
  totalAmount: number;
  avgReturnAmount: number;
  returnsByType: Array<{ type: string; amount: number }>;
  returnsByReason: Array<{ reasons: string[]; amount: number }>;
}

const ReturnAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  useEffect(() => {
    // Load analytics for last 30 days by default
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    setDateRange({
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    });
  }, []);

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchAnalytics();
    }
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await returnsApi.getAnalytics(dateRange.from, dateRange.to);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      alert('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'full_refund': return 'bg-red-500';
      case 'partial_refund': return 'bg-orange-500';
      case 'exchange': return 'bg-blue-500';
      case 'store_credit': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getReasonColor = (index: number) => {
    const colors = [
      'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400',
      'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Analytics Period</h3>
        
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-2 border rounded"
            />
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Update
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mt-2">
          Showing data from {formatDate(dateRange.from)} to {formatDate(dateRange.to)}
        </p>
      </div>

      {loading ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p>Loading analytics...</p>
        </div>
      ) : !analytics ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p>No data available</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Total Returns</h4>
              <p className="text-3xl font-bold text-blue-600">{analytics.totalReturns}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Total Amount</h4>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(analytics.totalAmount)}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Average Return</h4>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(analytics.avgReturnAmount)}
              </p>
            </div>
          </div>

          {/* Returns by Type */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Returns by Type</h3>
            
            {analytics.returnsByType.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No data available</p>
            ) : (
              <div className="space-y-4">
                {analytics.returnsByType.map((item) => {
                  const percentage = analytics.totalAmount > 0 
                    ? (item.amount / analytics.totalAmount * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <div key={item.type} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium">
                        {item.type.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{formatCurrency(item.amount)}</span>
                          <span className="text-sm text-gray-600">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${getTypeColor(item.type)}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Returns by Reason */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Returns by Reason</h3>
            
            {analytics.returnsByReason.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No data available</p>
            ) : (
              <div className="space-y-4">
                {analytics.returnsByReason.map((item, index) => {
                  const percentage = analytics.totalAmount > 0 
                    ? (item.amount / analytics.totalAmount * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium">
                        {item.reasons.join(', ').toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{formatCurrency(item.amount)}</span>
                          <span className="text-sm text-gray-600">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${getReasonColor(index)}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Key Insights */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Most Common Return Type</h4>
                <p className="text-sm text-gray-600">
                  {analytics.returnsByType.length > 0 
                    ? analytics.returnsByType.sort((a, b) => b.amount - a.amount)[0].type.replace('_', ' ').toUpperCase()
                    : 'No data'
                  }
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Return Rate Impact</h4>
                <p className="text-sm text-gray-600">
                  {analytics.totalReturns > 0 
                    ? `${formatCurrency(analytics.totalAmount)} in returns processed`
                    : 'No returns processed'
                  }
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReturnAnalytics;