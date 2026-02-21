import React, { useState, useRef, useEffect } from 'react';
import { returnsApi, SaleLookupOptions } from '@/lib/api/returns.api';
import { format, isValid, parseISO } from 'date-fns';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ScanBarcode, X, Camera } from '@/lib/safe-lucide-react';
import { toast } from 'sonner';

interface SaleLookupProps {
  onSaleSelected: (sale: any) => void;
}

const SaleLookup: React.FC<SaleLookupProps> = ({ onSaleSelected }) => {
  const [searchOptions, setSearchOptions] = useState<SaleLookupOptions>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const scannerDivId = useRef(`return-scanner-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const startScanner = async () => {
    setShowScanner(true);
    // Wait for DOM to render the scanner div
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      scannerRef.current = new Html5Qrcode(scannerDivId.current, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
      });
      
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 100 } },
        async (decodedText) => {
          // Stop scanner after successful scan
          await stopScanner();
          // Set the barcode and trigger search
          setSearchOptions(prev => ({ ...prev, barcode: decodedText.trim() }));
          toast.success(`Barcode scanned: ${decodedText}`);
          // Auto-search after scan
          setTimeout(() => handleBarcodeSearch(decodedText.trim()), 200);
        },
        () => {} // Ignore scan errors
      );
    } catch (err) {
      console.error('Scanner start error:', err);
      toast.error('Could not start camera. Please enter barcode manually.');
      setShowScanner(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode) return;
    setIsLoading(true);
    try {
      const response = await returnsApi.lookupSales({ barcode });
      setSearchResults(response.data.sales);
      if (response.data.count === 0) {
        toast.error('No sales found for this barcode');
      } else {
        toast.success(`Found ${response.data.count} sale(s)`);
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      toast.error('Failed to search by barcode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchOptions.invoiceNo &&
        !searchOptions.customerName &&
        !searchOptions.customerPhone &&
        !searchOptions.barcode) {
      alert('Please provide at least one search criteria');
      return;
    }

    setIsLoading(true);
    try {
      const response = await returnsApi.lookupSales(searchOptions);
      setSearchResults(response.data.sales);
      if (response.data.count === 0) {
        alert('No sales found matching your criteria');
      }
    } catch (error) {
      console.error('Sale lookup error:', error);
      alert('Failed to search for sales');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof SaleLookupOptions, value: string | number) => {
    setSearchOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaleSelect = (sale: any) => {
    setSelectedSaleId(sale._id);
    onSaleSelected(sale);
  };

  const getReturnStatus = (sale: any) => {
    if (!sale.returns || sale.returns.length === 0) {
      return { status: 'none', label: 'No Returns', color: 'default' };
    }
    
    const totalReturned = sale.returnSummary?.totalReturned || 0;
    const saleTotal = sale.total;
    
    if (totalReturned >= saleTotal) {
      return { status: 'full', label: 'Fully Returned', color: 'destructive' };
    } else if (totalReturned > 0) {
      return { status: 'partial', label: 'Partial Returns', color: 'warning' };
    }
    
    return { status: 'none', label: 'No Returns', color: 'default' };
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const getCustomerDisplayName = (customer: any) => {
    if (!customer) return 'Walk-in Customer';
    if (typeof customer === 'string') return customer;
    if (typeof customer === 'object') {
      if (typeof customer.name === 'object') {
        return customer.name.en || customer.name.si || customer._id || 'Customer';
      }
      if (customer.firstName || customer.lastName) {
        return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';
      }
      return customer.name || customer.email || customer.phone || customer._id || 'Customer';
    }
    return String(customer);
  };

  const getItemName = (item: any) => {
    if (!item) return 'Item';
    const product = item.product || item.productDetails || item;
    const nameSource = product.productName || product.name || item.productName || item.name;
    if (typeof nameSource === 'object') {
      return nameSource.en || nameSource.si || product.sku || product._id || 'Item';
    }
    return nameSource || product.sku || product._id || 'Item';
  };

  const getItemSummary = (items: any[] = []) => {
    if (!items.length) return 'No items recorded';
    const labels = items.map(getItemName);
    const previewCount = Math.min(labels.length, 2);
    const preview = labels.slice(0, previewCount).join(', ');
    const remaining = labels.length - previewCount;
    return remaining > 0 ? `${preview} +${remaining} more` : preview;
  };

  const formatDate = (value: any) => {
    if (!value) return '-';
    let date: Date;
    try {
      date = typeof value === 'string' ? parseISO(value) : new Date(value);
    } catch (e) {
      return '-';
    }
    if (!isValid(date)) return '-';
    return format(date, 'MMM dd, yyyy HH:mm');
  };

  return (
    <div className="space-y-8">
      {/* Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative bg-[#1E1E1E] rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
            <button
              onClick={stopScanner}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/10 transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-400" />
              Scan Product Barcode
            </h4>
            <div id={scannerDivId.current} className="w-full rounded-xl overflow-hidden bg-black" style={{ minHeight: 200 }} />
            <p className="text-xs text-gray-400 mt-3 text-center">Point camera at barcode to scan</p>
          </div>
        </div>
      )}

      {/* Lookup Card */}
      <div className="relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br from-white/5 via-blue-500/5 to-purple-500/5" />
        <div className="relative">
          <h3 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">Sale Lookup</h3>
          <p className="text-sm text-gray-400 mb-6">Provide any criteria (at least one) to search for a sale.</p>
        </div>

        {/* Barcode Scanner Section */}
        <div className="relative mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 uppercase tracking-wide text-emerald-300" htmlFor="barcode">
                <ScanBarcode className="w-4 h-4 inline mr-1" />
                Product Barcode
              </label>
              <div className="flex gap-2">
                <input 
                  id="barcode" 
                  className="flex-1 px-3 py-2 rounded-xl bg-[#27272A] border border-emerald-500/30 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 outline-none text-sm" 
                  value={searchOptions.barcode || ''} 
                  onChange={e => handleInputChange('barcode', e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && searchOptions.barcode) handleBarcodeSearch(searchOptions.barcode); }}
                  placeholder="Scan or enter barcode"
                />
                <button 
                  onClick={startScanner}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
                >
                  <Camera className="w-4 h-4" />
                  Scan
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-emerald-400/70 mt-2">Quick lookup: Scan product barcode to find the original sale</p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400" htmlFor="invoiceNo">Invoice Number</label>
            <input id="invoiceNo" className="w-full px-3 py-2 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm" value={searchOptions.invoiceNo || ''} onChange={e=>handleInputChange('invoiceNo', e.target.value)} placeholder="INV001234" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400" htmlFor="customerName">Customer Name</label>
            <input id="customerName" className="w-full px-3 py-2 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm" value={searchOptions.customerName || ''} onChange={e=>handleInputChange('customerName', e.target.value)} placeholder="Name" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400" htmlFor="customerPhone">Customer Phone</label>
            <input id="customerPhone" className="w-full px-3 py-2 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none text-sm" value={searchOptions.customerPhone || ''} onChange={e=>handleInputChange('customerPhone', e.target.value)} placeholder="+94" />
          </div>
        </div>
        <div className="flex justify-end mt-8">
          <button onClick={handleSearch} disabled={isLoading} className="relative px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_-4px_rgba(59,130,246,0.6)] transition">
            <span>{isLoading ? 'Searching...' : 'Search Sales'}</span>
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="relative rounded-3xl p-6 bg-[#1E1E1E] border border-white/10 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
          <h4 className="text-lg font-semibold mb-4 text-white/90 tracking-wide">Search Results ({searchResults.length})</h4>
          <div className="space-y-4">
            {searchResults.map((sale) => {
              const returnStatus = getReturnStatus(sale);
              const isSelected = selectedSaleId === sale._id;
              return (
                <div
                  key={sale._id}
                  className={`group relative p-5 rounded-2xl border cursor-pointer transition overflow-hidden backdrop-blur-sm ${
                    isSelected
                      ? 'border-blue-500/60 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent'
                      : 'border-white/10 bg-white/5 hover:border-blue-400/40'
                  }`}
                  onClick={() => handleSaleSelect(sale)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-semibold tracking-wide text-white/90">{sale.invoiceNo}</div>
                    <div className="text-xs">
                      <span className={`px-2 py-1 rounded-full font-medium tracking-wide ${
                        returnStatus.status==='full'
                          ? 'bg-red-500/20 text-red-300'
                          : returnStatus.status==='partial'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-gray-500/20 text-gray-300'
                      }`}>{returnStatus.label}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                    <div>
                      <span className="text-gray-500">Date:</span> {formatDate(sale.createdAt)}
                    </div>
                    <div>
                      <span className="text-gray-500">Customer:</span> {getCustomerDisplayName(sale.customer)}
                    </div>
                    <div>
                      <span className="text-gray-500">Items:</span> {sale.items?.length || 0}
                      {sale.items?.length ? (
                        <p className="mt-1 text-xs text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
                          {/* Show product names summary */}
                          {(() => {
                            const items = sale.items || [];
                            const names = items.map((item: any) => {
                              if (item.productDetails?.name) {
                                if (typeof item.productDetails.name === 'string') return item.productDetails.name;
                                return item.productDetails.name.en || item.productDetails.name.si || item.productDetails.sku || item.productDetails._id || 'Item';
                              }
                              if (item.productName && typeof item.productName === 'string') return item.productName;
                              if (item.name) return item.name;
                              return item.product?._id || item.product || 'Item';
                            });
                            const previewCount = Math.min(names.length, 2);
                            const preview = names.slice(0, previewCount).join(', ');
                            const remaining = names.length - previewCount;
                            return remaining > 0 ? `${preview} +${remaining} more` : preview;
                          })()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {sale.returnSummary?.totalReturned > 0 && (
                    <div className="mt-3 text-sm space-y-1">
                      <div className="flex justify-between text-gray-400"><span>Previously Returned:</span><span className="text-red-400">-{formatCurrency(sale.returnSummary.totalReturned)}</span></div>
                      <div className="flex justify-between text-gray-300"><span>Remaining Amount:</span><span className="font-semibold text-white">{formatCurrency(sale.total - sale.returnSummary.totalReturned)}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {searchResults.length === 0 && !isLoading && (
        <div className="p-10 text-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-gray-400">
          <p>No results yet. Enter criteria and search.</p>
        </div>
      )}
    </div>
  );
};

export default SaleLookup;