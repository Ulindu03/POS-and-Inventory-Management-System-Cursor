import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { productsApi } from '@/lib/api/products.api';
import { useCartStore } from '@/store/cart.store';
import { usePosStore } from '@/store/pos.store';
import { toast } from 'sonner';

export const BarcodeScanner = () => {
  const divId = useRef(`scanner-${Math.random().toString(36).slice(2)}`);
  const [active, setActive] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const customerType = usePosStore((s) => s.customerType);
  const customerTypeRef = useRef(customerType);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    customerTypeRef.current = customerType;
  }, [customerType]);

  const processBarcode = async (trimmed: string, isManual = false) => {
    try {
      const res = await productsApi.getByBarcode(trimmed);
      const product: any = res.data.product;
      const pricing = product.pricing as any;
      const retailTier = pricing?.retail;
      const wholesaleTier = pricing?.wholesale;
      const wholesaleAvailable = Boolean(wholesaleTier?.configured && wholesaleTier.base > 0);
      const prefersWholesale = customerTypeRef.current === 'wholesale' && wholesaleAvailable;
      const activeTier = prefersWholesale ? wholesaleTier : retailTier ?? wholesaleTier;
      const priceTier: 'retail' | 'wholesale' = prefersWholesale && activeTier ? 'wholesale' : 'retail';
      const basePrice = activeTier?.base ?? (priceTier === 'wholesale' ? wholesaleTier?.base : retailTier?.base) ?? product.price?.retail ?? 0;
      const finalPrice = activeTier?.final ?? basePrice;
      const discountAmount = Math.max(0, activeTier?.discountAmount ?? 0);
      const discountType = activeTier?.discountType ?? null;
      const discountValue = activeTier?.discountValue ?? null;

      addItem({
        id: product._id || product.id,
        name: product.name.en,
        price: finalPrice,
        basePrice,
        barcode: trimmed,
        discountAmount,
        discountType: discountType ?? undefined,
        discountValue: discountValue ?? undefined,
        priceTier,
      });
      
      setLastScanned(trimmed);
      setScanCount((c) => c + 1);
      toast.success('Product added', { description: product.name.en });
      if (navigator.vibrate) navigator.vibrate(60);
      return true;
    } catch (error: any) {
      const errorCode = error?.response?.data?.code;
      
      if (errorCode === 'BARCODE_ALREADY_SOLD') {
        toast.error('Barcode Already Sold', { 
          description: `This item (${trimmed}) has already been sold`,
          duration: 4000
        });
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else if (errorCode === 'BARCODE_RETURNED') {
        toast.error('Barcode Returned', { 
          description: 'This item was returned and cannot be sold again',
          duration: 4000
        });
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else if (errorCode === 'BARCODE_DAMAGED') {
        toast.error('Barcode Damaged', { 
          description: 'This item is marked as damaged',
          duration: 4000
        });
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else if (errorCode === 'BARCODE_WRITTEN_OFF') {
        toast.error('Barcode Written Off', { 
          description: 'This item has been written off from inventory',
          duration: 4000
        });
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else if (isManual) {
        toast.error('Product not found', { description: `Barcode: ${trimmed}` });
      }
      return false;
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim() || loading) return;
    
    setLoading(true);
    const success = await processBarcode(manualBarcode.trim(), true);
    setLoading(false);
    
    if (success) {
      setManualBarcode('');
      setShowManualInput(false);
    } else {
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    if (!active) return;
    
    const start = async () => {
      scanner = new Html5Qrcode(divId.current);
      try {
        // Enhanced scanner configuration for better accuracy
        await scanner.start(
          { facingMode: 'environment' },
          { 
            fps: 15, // Higher FPS for faster scanning
            qrbox: { width: 280, height: 150 }, // Wider box for barcodes
            aspectRatio: 1.777778, // 16:9 aspect ratio
            disableFlip: false,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.CODABAR,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.QR_CODE,
            ]
          },
          async (text) => {
            const trimmed = text.trim();
            const now = Date.now();
            
            // Prevent duplicate scans of same barcode within 2 seconds
            if (lastScannedRef.current === trimmed && now - lastScanTimeRef.current < 2000) {
              return;
            }
            lastScannedRef.current = trimmed;
            lastScanTimeRef.current = now;
            
            await processBarcode(trimmed);
          },
          () => { /* ignore decode errors */ }
        );
      } catch (e) {
        console.error('Scanner error:', e);
        toast.error('Camera access failed', { description: 'Please allow camera permission' });
      }
    };
    start();
    
    return () => {
      if (scanner) scanner.stop().catch(() => undefined);
    };
  }, [active, addItem]);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/scanning.png" alt="Scanner" className="w-5 h-5" />
            <span className="font-semibold text-[#F8F8F8]">Barcode Scanner</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Manual Entry Button */}
            <button 
              onClick={() => {
                setShowManualInput((v) => !v);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={`p-2 rounded-lg transition-all ${
                showManualInput 
                  ? 'bg-[#FFE100] text-black' 
                  : 'bg-white/10 hover:bg-white/20 text-[#F8F8F8]'
              }`}
              title="Enter barcode manually"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            {/* Start/Stop Button */}
            <button 
              onClick={() => setActive((v) => !v)} 
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                active 
                  ? 'bg-red-500/90 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' 
                  : 'bg-gradient-to-r from-[#FFE100] to-[#FFD100] hover:from-[#FFD100] hover:to-[#FFC000] text-black shadow-lg shadow-yellow-500/20'
              }`}
            >
              {active ? '⏹ Stop' : '▶ Start'}
            </button>
          </div>
        </div>
        
        {/* Scan Stats */}
        {scanCount > 0 && (
          <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {scanCount} scanned
            </span>
            {lastScanned && (
              <span className="truncate">Last: <code className="text-emerald-300">{lastScanned}</code></span>
            )}
          </div>
        )}
      </div>
      
      {/* Manual Input Section */}
      {showManualInput && (
        <div className="p-3 border-b border-white/10 bg-[#FFE100]/10">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <img 
                src="/scanning.png" 
                alt="" 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" 
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type or paste barcode..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                disabled={loading}
                autoFocus
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-[#F8F8F8] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FFE100]/50 focus:border-[#FFE100]/50 disabled:opacity-50 text-sm font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !manualBarcode.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFE100] to-[#FFD100] hover:from-[#FFD100] hover:to-[#FFC000] disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm text-black transition-all shadow-lg shadow-yellow-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </span>
              ) : 'Add'}
            </button>
          </form>
        </div>
      )}
      
      {/* Scanner View */}
      <div className="relative">
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 p-4">
            <img src="/scanning.png" alt="Scanner" className="w-12 h-12 mb-3 opacity-60" />
            <p className="text-white/70 text-sm text-center mb-2">Camera scanner inactive</p>
            <p className="text-white/40 text-xs text-center">Click "Start" to scan with camera or use manual entry</p>
          </div>
        )}
        
        {active && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Scanning overlay frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-[280px] h-[150px]">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#FFE100]" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#FFE100]" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#FFE100]" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#FFE100]" />
                {/* Scanning line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#FFE100] to-transparent animate-pulse" style={{ top: '50%' }} />
              </div>
            </div>
            {/* Status indicator */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 text-xs text-white/80">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Scanning...
              </span>
            </div>
          </div>
        )}
        
        <div 
          id={divId.current} 
          className="bg-black/40"
          style={{ width: '100%', minHeight: 200 }} 
        />
      </div>
      
      {/* Footer hint */}
      <div className="p-2 bg-white/5 text-center">
        <p className="text-[10px] text-white/40">
          Supports EAN-13, EAN-8, UPC, Code128, Code39, QR codes
        </p>
      </div>
    </div>
  );
};


