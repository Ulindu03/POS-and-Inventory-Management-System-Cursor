import { AppLayout } from '@/components/common/Layout/Layout';
import { ProductGrid } from '@/features/pos/ProductGrid';
import { Cart } from '@/features/pos/Cart';
import { PaymentModal } from '@/features/pos/PaymentModal';
import { ReceiptModal } from '@/features/pos/ReceiptModal';
import { BarcodeScanner } from '@/features/pos/BarcodeScanner';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import QuickDamageModal from '@/features/damage/QuickDamageModal';
import { useCartStore } from '@/store/cart.store';
import { salesApi } from '@/lib/api/sales.api';
// Replaced lucide icons with custom FS.png from public

const POS = () => {
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<{
    invoiceNo: string;
    items: { name: string; qty: number; price: number; total: number }[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
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
  const [isFs, setIsFs] = useState<boolean>(Boolean(document.fullscreenElement));

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  return (
    <AppLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-0 h-[calc(100vh-3.5rem-1.5rem)] md:h-[calc(100vh-3.5rem-1.5rem)]">
        <div className="md:col-span-1 lg:col-span-2 space-y-4 min-h-0 overflow-auto">
          <div className="mb-3 font-semibold">Products</div>
          <ProductGrid fullscreen={{ isFs, toggle: toggleFullscreen }} />
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
  {/* Fullscreen FAB removed per request; header and toolbar toggles remain */}
      <QuickDamageModal open={openDamage} onClose={() => setOpenDamage(false)} />
      <PaymentModal
        open={open}
        onClose={() => setOpen(false)}
        onComplete={(sale) => {
          // Capture a snapshot of totals before clearing the cart so the receipt shows correct values
          const snapshot = {
            subtotal,
            discount,
            tax,
            total,
          };
          setReceipt({
            invoiceNo: sale.invoiceNo,
            items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, total: i.price * i.qty })),
            ...snapshot,
          });
          setOpen(false);
          clear();
        }}
      />
      <ReceiptModal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        invoiceNo={receipt?.invoiceNo || ''}
        items={receipt?.items || []}
        subtotal={receipt?.subtotal ?? 0}
        discount={receipt?.discount ?? 0}
        tax={receipt?.tax ?? 0}
        total={receipt?.total ?? 0}
        method="cash"
        cashierName={user?.firstName || user?.username}
        paperWidth={80}
      />
    </AppLayout>
  );
};

export default POS;


