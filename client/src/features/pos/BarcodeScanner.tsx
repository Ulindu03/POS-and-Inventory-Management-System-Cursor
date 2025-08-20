import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { productsApi } from '@/lib/api/products.api';
import { useCartStore } from '@/store/cart.store';

export const BarcodeScanner = () => {
  const divId = useRef(`scanner-${Math.random().toString(36).slice(2)}`);
  const [active, setActive] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    if (!active) return;
    const start = async () => {
      scanner = new Html5Qrcode(divId.current);
      try {
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, async (text) => {
          try {
            const res = await productsApi.getByBarcode(text.trim());
            addItem({ id: (res.data.product as any)._id || (res.data.product as any).id, name: res.data.product.name.en, price: res.data.product.price.retail });
            // vibrate lightly to confirm
            if (navigator.vibrate) navigator.vibrate(60);
          } catch {
            // ignore not found
          }
        });
      } catch (e) {
        console.error(e);
      }
    };
    start();
    return () => {
      if (scanner) scanner.stop().catch(() => undefined);
    };
  }, [active, addItem]);

  return (
    <div className="rounded-2xl border border-white/10 p-3 bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Barcode Scanner</div>
        <button onClick={() => setActive((v) => !v)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">
          {active ? 'Stop' : 'Start'}
        </button>
      </div>
      <div id={divId.current} style={{ width: '100%', minHeight: 280 }} />
    </div>
  );
};


