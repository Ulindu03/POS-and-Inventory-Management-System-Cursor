import { formatLKR } from '@/lib/utils/currency';

interface Item { name: string; qty: number; price: number; total: number }
interface Props {
  open: boolean;
  onClose: () => void;
  invoiceNo: string;
  items: Item[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  method?: 'cash' | 'card' | 'digital';
}

export const ReceiptModal = ({ open, onClose, invoiceNo, items, subtotal, discount, tax, total, method }: Props) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 no-print" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 text-[#F8F8F8]">
        <div className="flex items-center justify-between mb-3 no-print">
          <div className="text-lg font-semibold">Receipt Preview</div>
          <div className="opacity-80">{invoiceNo}</div>
        </div>
        <div className="print-area">
          <div className="receipt">
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <img src="/logo.jpg" alt="Company Logo" style={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto' }} />
              <h1 style={{ marginTop: 6 }}>VoltZone</h1>
              <div style={{ fontSize: 12 }}>"Glow Smart, Live Bright."</div>
            </div>
            <div className="row"><span>Invoice:</span><span>{invoiceNo}</span></div>
            <div className="row"><span>Date:</span><span>{new Date().toLocaleDateString()}</span></div>
            <div className="row"><span>Time:</span><span>{new Date().toLocaleTimeString()}</span></div>
            <div className="row"><span>Payment:</span><span>{(method || 'cash').toUpperCase()}</span></div>
            <hr />
            <table>
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx}><td>{i.name}</td><td>{i.qty}</td><td>{formatLKR(i.price)}</td><td>{formatLKR(i.total)}</td></tr>
                ))}
              </tbody>
            </table>
            <hr />
            <div className="row"><span>Subtotal</span><span>{formatLKR(subtotal)}</span></div>
            <div className="row"><span>Discount</span><span>-{formatLKR(discount)}</span></div>
            <div className="row"><span>Tax</span><span>{formatLKR(tax)}</span></div>
            <div className="row"><strong>Total</strong><strong>{formatLKR(total)}</strong></div>
            <hr />
            <div style={{ textAlign: 'center', fontSize: 12, marginTop: 8 }}>
              Items sold are not returnable after 3 days.
              <br />
              Thank you for your visit
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4 no-print">
          <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20">Print</button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}>Close</button>
        </div>
      </div>
    </div>
  );
};


