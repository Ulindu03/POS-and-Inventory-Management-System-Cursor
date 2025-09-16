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
import { useCartStore } from '@/store/cart.store';
import { salesApi } from '@/lib/api/sales.api';
// Replaced lucide icons with custom FS.png from public

const POS = () => {
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<{
    invoiceNo: string;
  saleId: string;
    items: { name: string; qty: number; price: number; total: number }[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  warranties?: Array<{ warrantyNo: string; status: string; periodDays: number; endDate?: string; requiresActivation?: boolean }>;
  } | null>(null);
  const [openDamage, setOpenDamage] = useState(false);
  const clear = useCartStore((s) => s.clear);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const discount = useCartStore((s) => s.discount);
  const tax = useCartStore((s) => s.tax());
  const total = useCartStore((s) => s.total());
  const setHold = useCartStore((s) => s.setHold);
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  return (
    <AppLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-0 h-[calc(100vh-3.5rem-1.5rem)] md:h-[calc(100vh-3.5rem-1.5rem)]">
        <div className="md:col-span-1 lg:col-span-2 space-y-4 min-h-0 overflow-auto">
          <div className="mb-3 font-semibold flex items-center justify-between gap-2">
            <span>{t('pos.productsHeader')}</span>
            <div className="flex items-center gap-2 text-xs">
              <Link to="/warranty" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-[#F8F8F8] transition" title={t('pos.warrantyTooltip')}>
                <img src="/warranty.png" alt="Warranty" className="w-4 h-4" />
                <span className="hidden sm:inline">{t('pos.warrantyButton')}</span>
              </Link>
            </div>
          </div>
          <ProductGrid />
          <BarcodeScanner />
        </div>
        <div className="md:col-span-1 lg:col-span-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <Cart
              onPay={() => setOpen(true)}
              onClear={clear}
              onDamage={() => setOpenDamage(true)}
              onHold={async () => {
                const payload = { items: items.map((i) => ({ product: i.id, quantity: i.qty, price: i.price })), discount };
                const res = await salesApi.hold(payload);
                setHold(res.data.ticket);
              }}
            />
          </div>
        </div>
      </div>
  {/* Fullscreen UI removed per request */}
      <QuickDamageModal open={openDamage} onClose={() => setOpenDamage(false)} />
      <PaymentModal
        open={open}
        onClose={() => setOpen(false)}
        onComplete={async (sale) => {
          // Capture a snapshot of totals before clearing the cart so the receipt shows correct values
          const snapshot = {
            subtotal,
            discount,
            tax,
            total,
          };
          // Attempt to fetch warranties issued for this sale
          let warranties: any[] = [];
          try {
            const token = (await import('@/lib/api/token')).getAccessToken();
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
            // Cross-tab broadcast via BroadcastChannel and storage event
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


