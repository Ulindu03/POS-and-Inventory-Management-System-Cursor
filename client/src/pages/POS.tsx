// Point of Sale (POS) page for processing customer transactions.
// In simple English:
// - Left side: choose products (grid + barcode scanner).
// - Right side: cart with items and checkout.
// - When payment completes: we build a receipt snapshot and try to fetch any warranties created for this sale.
// - We also broadcast events so other tabs/pages can refresh (e.g., Warranty page, Customer history).
import { AppLayout } from '@/components/common/Layout/Layout';
import { ProductGrid } from '@/features/pos/ProductGrid';
import { Cart } from '@/features/pos/Cart';
import { PaymentModal } from '@/features/pos/PaymentModal';
import { ReceiptModal } from '@/features/pos/ReceiptModal';
import { BarcodeScanner } from '@/features/pos/BarcodeScanner';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import QuickDamageModal from '@/features/damage/QuickDamageModal';
import QuickReturnModal from '@/features/pos/QuickReturnModal';
import { useCartStore } from '@/store/cart.store';
import { usePosStore } from '@/store/pos.store';
import { salesApi } from '@/lib/api/sales.api';
import { getAccessToken } from '@/lib/api/token';
// Replaced lucide icons with custom FS.png from public

const POS = () => {
  // State for payment modal visibility
  const [open, setOpen] = useState(false);
  // State for receipt data after successful payment
  const [receipt, setReceipt] = useState<{
    invoiceNo: string;
    saleId: string;
    items: { name: string; qty: number; price: number; total: number }[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    warranties?: Array<{
      warrantyNo: string;
      status: string;
      periodDays: number;
      endDate?: string;
      requiresActivation?: boolean;
    }>;
  } | null>(null);
  // State for damage reporting modal
  const [openDamage, setOpenDamage] = useState(false);
  // State for return and refund modal
  const [openReturn, setOpenReturn] = useState(false);
  
  // Get cart state and actions from store
  const clear = useCartStore((s) => s.clear);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const manualDiscount = useCartStore((s) => s.discount);
  const totalDiscount = useCartStore((s) => s.totalDiscount());
  const tax = useCartStore((s) => s.tax());
  const total = useCartStore((s) => s.total());
  const setHold = useCartStore((s) => s.setHold);
  const customerType = usePosStore((s) => s.customerType);
  const setCustomerType = usePosStore((s) => s.setCustomerType);
  
  // Get current user info for receipt
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  return (
    <AppLayout>
      {/* Main POS layout with product grid and cart */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-0 h-[calc(100vh-3.5rem-1.5rem)] md:h-[calc(100vh-3.5rem-1.5rem)]">
        {/* Left side: Product selection area */}
        <div className="md:col-span-1 lg:col-span-2 space-y-4 min-h-0 overflow-auto">
          <div className="mb-3 font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span>{t('pos.productsHeader')}</span>
              <div className="inline-flex rounded-full bg-black/60 border border-white/10 p-0.5 shadow-inner text-xs">
                {(['retail', 'wholesale'] as const).map((type) => {
                  const active = customerType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCustomerType(type)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                        active
                          ? 'bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-400 text-black shadow-[0_4px_12px_rgba(255,225,0,0.35)]'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {type === 'retail' ? 'Retail' : 'Wholesale'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {/* Quick access to warranty management */}
              <Link
                to="/warranty"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-[#F8F8F8] transition"
                title={t('pos.warrantyTooltip')}
              >
                <img src="/warranty.png" alt="Warranty" className="w-4 h-4" />
                <span className="hidden sm:inline">{t('pos.warrantyButton')}</span>
              </Link>
              {/* Quick Return / Refund button */}
              <button
                type="button"
                onClick={() => setOpenReturn(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-[#F8F8F8] transition"
                title="Quick Return / Refund"
              >
                <img src="/returns.png" alt="Return" className="w-4 h-4" />
                <span className="hidden sm:inline">Return</span>
              </button>
            </div>
          </div>
          {/* Product grid for selecting items */}
          <ProductGrid />
          {/* Barcode scanner for quick product lookup */}
          <BarcodeScanner />
        </div>
        {/* Right side: Shopping cart and checkout */}
        <div className="md:col-span-1 lg:col-span-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <Cart
              onPay={() => setOpen(true)}
              onClear={clear}
              onDamage={() => setOpenDamage(true)}
              onHold={async () => {
                // Save current cart as a "hold" ticket for later retrieval (park the sale)
                const payload = { items: items.map((i) => ({ product: i.id, quantity: i.qty, price: i.price })), discount: manualDiscount };
                const res = await salesApi.hold(payload);
                setHold(res.data.ticket);
              }}
            />
          </div>
        </div>
      </div>
      {/* Fullscreen UI removed per request */}
      
      {/* Damage reporting modal */}
      <QuickDamageModal open={openDamage} onClose={() => setOpenDamage(false)} />
      
      {/* Return and refund modal */}
      <QuickReturnModal open={openReturn} onClose={() => setOpenReturn(false)} />
      
      {/* Payment processing modal */}
      <PaymentModal
        open={open}
        onClose={() => setOpen(false)}
        onComplete={async (sale) => {
          // Capture totals now (before clearing cart) so the receipt shows correct values
          const snapshot = {
            subtotal,
            discount: totalDiscount,
            tax,
            total,
          };
          // Attempt to fetch warranties issued for this sale (if any)
          let warranties: any[] = [];
          try {
            const token = getAccessToken();
            const res = await fetch(`/api/warranty?saleId=${encodeURIComponent(sale.id)}&page=1&pageSize=100`, { headers: token? { Authorization: `Bearer ${token}` } : {} });
            const json = await res.json();
            if (json?.success) warranties = json.data.items || [];
          } catch {}
          setReceipt({
            invoiceNo: sale.invoiceNo,
            saleId: sale.id,
            items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, total: i.price * i.qty })),
            ...snapshot,
            warranties: warranties.map(w => ({ warrantyNo: w.warrantyNo, status: w.status, periodDays: w.periodDays, endDate: w.endDate, requiresActivation: w.status === 'pending_activation' }))
          });
          // Notify other tabs/components (like Warranty page) to refresh
          try {
            if (warranties.length) window.dispatchEvent(new Event('warranty:updated'));
            // Broadcast sale created with optional customer id to refresh customer purchase history
            const detail: any = { saleId: sale.id, invoiceNo: sale.invoiceNo, customerId: sale.customerId };
            window.dispatchEvent(new CustomEvent('sales:created', { detail }));
            // Cross-tab broadcast via BroadcastChannel and storage event (so other tabs update too)
            try {
              const bc = new (window as any).BroadcastChannel ? new BroadcastChannel('sales') : null;
              if (bc) {
                bc.postMessage({ type: 'created', ...detail, ts: Date.now() });
                bc.close();
              }
            } catch {}
            try {
              localStorage.setItem('sales:lastCreated', JSON.stringify({ ...detail, ts: Date.now() }));
              // clear shortly after to avoid buildup
              setTimeout(() => { try { localStorage.removeItem('sales:lastCreated'); } catch {} }, 250);
            } catch {}
          } catch {}
          setOpen(false);
          clear();
        }}
      />
      
      {/* Receipt printing modal */}
      <ReceiptModal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        invoiceNo={receipt?.invoiceNo || ''}
        warranties={receipt?.warranties || []}
        items={receipt?.items || []}
        subtotal={receipt?.subtotal ?? 0}
        discount={receipt?.discount ?? 0}
        tax={receipt?.tax ?? 0}
        total={receipt?.total ?? 0}
        // method prop passes an internal payment method key; display components should localize label via something like t('pos.paymentMethod.cash')
        method="cash"
        cashierName={user?.firstName || user?.username}
        paperWidth={80}
      />
    </AppLayout>
  );
};

export default POS;


