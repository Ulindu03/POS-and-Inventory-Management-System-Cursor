import { useState, type ReactNode } from 'react';
import reportsApi from '@/lib/api/reports.api';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/common/Layout/Layout';
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  Truck,
  PieChart,
  Download,
  Calendar,
  Filter,
  FileText,
  ArrowLeft,
} from 'lucide-react';

type ReportType = 'sales' | 'inventory' | 'customers' | 'suppliers' | 'profitloss' | 'stock';

interface ReportCard {
  id: ReportType;
  title: string;
  description: string;
  icon: ReactNode;
  gradient: string;
}

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const reportCards: ReportCard[] = [
    {
      id: 'sales',
      title: 'Sales Report',
      description: 'Analyze sales performance, revenue trends, and product performance',
      icon: <BarChart3 className="w-8 h-8" />,
      gradient: 'from-purple-500 to-blue-600'
    },
    {
      id: 'inventory',
      title: 'Inventory Report',
      description: 'Track stock levels, inventory value, and identify low stock items',
      icon: <Package className="w-8 h-8" />,
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'customers',
      title: 'Customer Analytics',
      description: 'Customer behavior, loyalty trends, and purchase patterns',
      icon: <Users className="w-8 h-8" />,
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'suppliers',
      title: 'Supplier Performance',
      description: 'Supplier delivery performance, payment terms, and relationships',
      icon: <Truck className="w-8 h-8" />,
      gradient: 'from-orange-500 to-red-600'
    },
    {
      id: 'profitloss',
      title: 'Profit & Loss',
      description: 'Financial overview with profit margins and expense analysis',
      icon: <TrendingUp className="w-8 h-8" />,
      gradient: 'from-yellow-500 to-orange-600'
    },
    {
      id: 'stock',
      title: 'Stock Movements',
      description: 'Track all stock movements, adjustments, and transfer history',
      icon: <PieChart className="w-8 h-8" />,
      gradient: 'from-pink-500 to-purple-600'
    }
  ];

  const handleReportSelect = (reportType: ReportType) => {
    setSelectedReport(reportType);
    setReportData(null);
  };
  const formatSummaryValue = (key: string, value: any) => {
    if (typeof value !== 'number') return String(value);
    const k = key.toLowerCase();
    if (k.includes('revenue') || k.includes('profit') || k.includes('value') || k.includes('amount')) {
      return `LKR ${value.toLocaleString()}`;
    }
    if (k.includes('margin') || k.includes('rate')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const getBreakdownTitle = () => {
    if (!reportData) return '';
    if (reportData.categoryBreakdown) return 'Category Breakdown';
    if (reportData.typeBreakdown) return 'Movement Types';
    if (reportData.supplierPerformance) return 'Supplier Performance';
    return 'Breakdown';
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) return;
    setLoading(true);
    try {
      const params = { startDate: dateRange.startDate, endDate: dateRange.endDate } as any;
      let resp: any;
      switch (selectedReport) {
        case 'sales':
          resp = await reportsApi.sales({ ...params, period: 'monthly' });
          break;
        case 'inventory':
          resp = await reportsApi.inventory(params);
          break;
        case 'customers':
          resp = await reportsApi.customers(params);
          break;
        case 'suppliers':
          resp = await reportsApi.suppliers(params);
          break;
        case 'profitloss':
          resp = await reportsApi.profitLoss({ ...params, period: 'monthly' });
          break;
        case 'stock':
          resp = await reportsApi.stockMovements(params);
          break;
      }
      setReportData(resp?.data || {});
    } catch (err) {
      console.error('Error generating report', err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    if (!selectedReport) return;
    try {
      const blob: Blob = await reportsApi.export({
        type: selectedReport,
        format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      a.download = `${selectedReport}-report-${dateRange.startDate}_to_${dateRange.endDate}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export report', err);
      alert('Failed to export report');
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#F8F8F8]">Reports & Analytics</h1>
          <p className="text-[#F8F8F8]/70">Generate business insights between custom dates.</p>
        </div>

        {!selectedReport && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportCards.map((card) => (
              <motion.button
                key={card.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleReportSelect(card.id)}
                className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 text-left"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} text-white flex items-center justify-center mb-4`}>
                  {card.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#F8F8F8]">{card.title}</h3>
                <p className="text-sm text-[#F8F8F8]/70 mt-1">{card.description}</p>
              </motion.button>
            ))}
          </div>
        )}

        {selectedReport && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="space-y-6">
              {/* Top Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setSelectedReport(null); setReportData(null); }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#F8F8F8]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Reports
                  </button>
                  <h2 className="text-xl font-semibold text-[#F8F8F8] capitalize">{selectedReport.replace(/([A-Z])/g, ' $1')}</h2>
                </div>
              </div>

              {/* Filters */}
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Filter className="w-5 h-5 text-[#F8F8F8]/70" />
                  <h3 className="text-lg font-semibold text-[#F8F8F8]">Report Parameters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                      Start Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
                      <input
                        type="date"
                        id="startDate"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-[#F8F8F8] mb-2">
                      End Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
                      <input
                        type="date"
                        id="endDate"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateReport}
                      disabled={loading}
                      className="w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5" />
                          Generate Report
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Report Results */}
              {reportData && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {/* Additional Insights */}
                  <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[#F8F8F8]">Additional Insights</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={async () => {
                            const resp = await reportsApi.topProducts({ startDate: dateRange.startDate, endDate: dateRange.endDate, sort: 'best' });
                            setReportData((d: any) => ({ ...(d || {}), topProducts: resp.data }));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-[#F8F8F8] hover:bg-white/20"
                        >
                          Top Products
                        </button>
                        <button
                          onClick={async () => {
                            const resp = await reportsApi.staffPerformance({ startDate: dateRange.startDate, endDate: dateRange.endDate });
                            setReportData((d: any) => ({ ...(d || {}), staffPerformance: resp.data }));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-[#F8F8F8] hover:bg-white/20"
                        >
                          Staff Performance
                        </button>
                        <button
                          onClick={async () => {
                            const resp = await reportsApi.deliveryPerformance({ startDate: dateRange.startDate, endDate: dateRange.endDate });
                            setReportData((d: any) => ({ ...(d || {}), deliveryPerformance: resp.data }));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-[#F8F8F8] hover:bg-white/20"
                        >
                          Delivery Performance
                        </button>
                        <button
                          onClick={async () => {
                            const resp = await reportsApi.inventoryTurnover({ startDate: dateRange.startDate, endDate: dateRange.endDate });
                            setReportData((d: any) => ({ ...(d || {}), inventoryTurnover: resp.data }));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-[#F8F8F8] hover:bg-white/20"
                        >
                          Inventory Turnover
                        </button>
                        <button
                          onClick={async () => {
                            const resp = await reportsApi.damageCost({ from: dateRange.startDate, to: dateRange.endDate });
                            setReportData((d: any) => ({ ...(d || {}), damageAnalysis: resp.data }));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-[#F8F8F8] hover:bg-white/20"
                        >
                          Damage Analysis
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Export Actions */}
                  <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[#F8F8F8]">Export Options</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => exportReport('pdf')}
                          className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </button>
                        <button
                          onClick={() => exportReport('excel')}
                          className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Excel
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  {reportData.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Object.entries(reportData.summary).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                          <h4 className="text-sm font-medium text-[#F8F8F8]/70 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                          </h4>
                          <p className="text-2xl font-bold text-[#F8F8F8] mt-2">{formatSummaryValue(key, value)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Period Data */}
                  {reportData.periodData && (
                    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
                      <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Period Analysis</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[#F8F8F8]">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="text-left py-2">Period</th>
                              {reportData.periodData[0]?.sales !== undefined && <th className="text-right py-2">Sales</th>}
                              {reportData.periodData[0]?.revenue !== undefined && <th className="text-right py-2">Revenue</th>}
                              {reportData.periodData[0]?.profit !== undefined && <th className="text-right py-2">Profit</th>}
                              {reportData.periodData[0]?.grossProfit !== undefined && <th className="text-right py-2">Gross Profit</th>}
                              {reportData.periodData[0]?.cogs !== undefined && <th className="text-right py-2">COGS</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.periodData.map((period: any) => (
                              <tr key={period.period} className="border-b border-white/5">
                                <td className="py-2">{period.period}</td>
                                {period.sales !== undefined && <td className="text-right py-2">{period.sales}</td>}
                                {period.revenue !== undefined && <td className="text-right py-2">LKR {period.revenue?.toLocaleString()}</td>}
                                {period.profit !== undefined && <td className="text-right py-2">LKR {period.profit?.toLocaleString()}</td>}
                                {period.grossProfit !== undefined && <td className="text-right py-2">LKR {period.grossProfit?.toLocaleString()}</td>}
                                {period.cogs !== undefined && <td className="text-right py-2">LKR {period.cogs?.toLocaleString()}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Category/Type Breakdown */}
                  {(reportData.categoryBreakdown || reportData.typeBreakdown || reportData.supplierPerformance) && (
                    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
                      <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">{getBreakdownTitle()}</h3>
                      <div className="space-y-3">
                        {(reportData.categoryBreakdown || reportData.typeBreakdown || reportData.supplierPerformance)?.map((item: any) => {
                          const displayName = item.categoryName || item.supplier?.name || item._id || '';
                          let meta = '';
                          if (item.productCount) meta = `${item.productCount} products`;
                          else if (item.totalOrders) meta = `${item.totalOrders} orders`;
                          else if (item.count) meta = `${item.count} movements`;
                          else if (item.totalQuantity) meta = `${item.totalQuantity} quantity`;
                          if (item.onTimeDeliveryRate) meta += ` • ${item.onTimeDeliveryRate}% on-time`;

                          let amount = '';
                          if (item.totalValue) amount = `LKR ${item.totalValue?.toLocaleString()}`;
                          else if (item.totalAmount) amount = `LKR ${item.totalAmount?.toLocaleString()}`;
                          else if (item.totalQuantity) amount = `${item.totalQuantity}`;

                          const key = String(displayName);
                          return (
                            <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                              <div>
                                <h4 className="font-medium text-[#F8F8F8]">{displayName}</h4>
                                <p className="text-sm text-[#F8F8F8]/70">{meta}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-[#F8F8F8]">{amount}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Top Products List */}
                  {reportData.topProducts && (
                    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
                      <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Top Products</h3>
                      <div className="space-y-3">
                        {reportData.topProducts.map((p: any) => (
                          <div key={p._id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div>
                              <h4 className="font-medium text-[#F8F8F8]">{p.productName} ({p.sku})</h4>
                              <p className="text-sm text-[#F8F8F8]/70">Qty: {p.totalQuantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[#F8F8F8]">LKR {p.totalRevenue?.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff Performance */}
                  {reportData.staffPerformance && (
                    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
                      <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Staff Performance</h3>
                      {reportData.staffPerformance.summary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          {Object.entries(reportData.staffPerformance.summary).map(([k, v]: any) => (
                            <div key={k} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                              <h4 className="text-sm font-medium text-[#F8F8F8]/70 capitalize">{k}</h4>
                              <p className="text-2xl font-bold text-[#F8F8F8] mt-2">{typeof v === 'number' ? v.toLocaleString() : String(v)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-3">
                        {reportData.staffPerformance.performance?.map((s: any) => (
                          <div key={s.staffId} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div>
                              <h4 className="font-medium text-[#F8F8F8]">{s.name} ({s.username})</h4>
                              <p className="text-sm text-[#F8F8F8]/70">Orders: {s.totalSales} • Items: {s.itemsSold}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[#F8F8F8]">LKR {s.totalRevenue?.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Performance */}
                  {reportData.deliveryPerformance && (
                    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
                      <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Delivery Performance</h3>
                      {reportData.deliveryPerformance.summary && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          {Object.entries(reportData.deliveryPerformance.summary).map(([k, v]: any) => (
                            <div key={k} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                              <h4 className="text-sm font-medium text-[#F8F8F8]/70 capitalize">{k}</h4>
                              <p className="text-2xl font-bold text-[#F8F8F8] mt-2">
                                {(() => {
                                  if (typeof v !== 'number') return String(v);
                                  if (k.includes('Rate')) return `${v.toFixed(1)}%`;
                                  return v.toLocaleString();
                                })()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-3">
                        {reportData.deliveryPerformance.byRep?.map((r: any) => (
                          <div key={r.salesRepId} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div>
                              <h4 className="font-medium text-[#F8F8F8]">{r.name} ({r.username})</h4>
                              <p className="text-sm text-[#F8F8F8]/70">Trips: {r.totalTrips} • Completed: {r.completed} • {r.completionRate?.toFixed(1)}%</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[#F8F8F8]">Damaged: {r.totalDamaged?.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inventory Turnover */}
                  {reportData.inventoryTurnover && (
                    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
                      <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Inventory Turnover</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(reportData.inventoryTurnover.summary || {}).map(([k, v]: any) => (
                          <div key={k} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                            <h4 className="text-sm font-medium text-[#F8F8F8]/70 capitalize">{k}</h4>
                            <p className="text-2xl font-bold text-[#F8F8F8] mt-2">{typeof v === 'number' ? v.toLocaleString() : String(v)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Damage Analysis */}
                  {reportData.damageAnalysis && (
                    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
                      <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Damage Analysis</h3>
                      <div className="space-y-3">
                        {reportData.damageAnalysis.map((d: any) => (
                          <div key={String(d._id)} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div>
                              <h4 className="font-medium text-[#F8F8F8]">{typeof d._id === 'string' ? d._id : d._id?.name || 'Unknown'}</h4>
                              <p className="text-sm text-[#F8F8F8]/70">Qty: {d.totalQty}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[#F8F8F8]">LKR {d.totalCost?.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Customers */}
                  {reportData.topCustomers && (
                    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6">
                      <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Top Customers</h3>
                      <div className="space-y-3">
                        {reportData.topCustomers.map((customerData: any) => (
                          <div key={customerData.customer?.name || ''} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div>
                              <h4 className="font-medium text-[#F8F8F8]">{customerData.customer.name}</h4>
                              <p className="text-sm text-[#F8F8F8]/70">{customerData.totalPurchases} purchases</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[#F8F8F8]">LKR {customerData.totalSpent?.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  );
};

export default Reports;

