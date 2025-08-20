import { AppLayout } from '@/components/common/Layout/Layout';
import { ProductGrid } from '@/features/pos/ProductGrid';
import { Cart } from '@/features/pos/Cart';
import { PaymentModal } from '@/features/pos/PaymentModal';
import { ReceiptModal } from '@/features/pos/ReceiptModal';
import { BarcodeScanner } from '@/features/pos/BarcodeScanner';
import { useState } from 'react';
import { useCartStore } from '@/store/cart.store';

const POS = () => {
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ invoiceNo: string; items: { name: string; qty: number; price: number; total: number }[] } | null>(null);
  const clear = useCartStore((s) => s.clear);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const discount = useCartStore((s) => s.discount);
  const tax = useCartStore((s) => s.tax());
  const total = useCartStore((s) => s.total());
  const setHold = useCartStore((s) => s.setHold);
  return (
    <AppLayout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="mb-3 font-semibold">Products</div>
          <ProductGrid />
          <BarcodeScanner />
        </div>
        <div className="xl:col-span-1">
          <Cart onPay={() => setOpen(true)} />
          <div className="mt-3 flex gap-2">
            <button onClick={() => setOpen(true)} className="flex-1 py-2 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}>Checkout</button>
            <button onClick={clear} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">Clear</button>
            <button
              onClick={async () => {
                const payload = { items: items.map((i) => ({ product: i.id, quantity: i.qty, price: i.price })), discount };
                const { salesApi } = await import('@/lib/api/sales.api');
                const res = await salesApi.hold(payload);
                setHold(res.data.ticket);
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20"
            >
              Hold
            </button>
          </div>
        </div>
      </div>
      <PaymentModal
        open={open}
        onClose={() => setOpen(false)}
        onComplete={(sale) => {
          setReceipt({
            invoiceNo: sale.invoiceNo,
            items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, total: i.price * i.qty })),
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
        subtotal={subtotal}
        discount={discount}
        tax={tax}
        total={total}
        method="cash"
      />
    </AppLayout>
  );
};

export default POS;


