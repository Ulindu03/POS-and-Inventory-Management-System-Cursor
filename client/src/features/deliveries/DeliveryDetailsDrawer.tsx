import { useEffect, useState } from 'react';
import { deliveriesApi } from '@/lib/api/deliveries.api';

type Props = Readonly<{ id: string | null; onClose: () => void }>;

export default function DeliveryDetailsDrawer({ id, onClose }: Props) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    deliveriesApi.get(id).then((res) => setData(res.data.data || res.data)).finally(() => setLoading(false));
  }, [id]);

  if (!id) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-black/80 backdrop-blur-xl border-l border-white/10 z-50">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <h2 className="text-lg font-semibold">Delivery Details</h2>
        <button onClick={onClose} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">Close</button>
      </div>
      <div className="p-4 space-y-4 text-sm">
        {loading && <div>Loading…</div>}
        {!loading && data && (
          <>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="opacity-60">Delivery No</div><div>{data.deliveryNo}</div></div>
                <div><div className="opacity-60">Status</div><div className="capitalize">{data.status?.replace('_',' ')}</div></div>
                <div><div className="opacity-60">Vehicle</div><div>{data.lorryDetails?.vehicleNo}</div></div>
                <div><div className="opacity-60">Driver</div><div>{data.lorryDetails?.driverName}</div></div>
              </div>
              <div>
                <div className="mb-2 font-medium">Stops</div>
                <div className="space-y-2">
                  {data.shops?.length ? data.shops.map((s: any) => (
                    <div key={s._id || (s.customer && s.customer._id) || JSON.stringify(s)} className="rounded border border-white/10 p-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{(s.customer && (s.customer.name || s.customer.customerCode)) || 'Customer'}</div>
                          <div className="opacity-70 text-xs">{s.items?.length || 0} items • {s.status}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs px-2 py-1 rounded bg-white/10 cursor-pointer">
              {uploading === s._id ? 'Uploading…' : 'Upload POD'}
                            <input type="file" className="hidden" disabled={!!uploading} onChange={async (e) => {
                              if (!e.target.files?.[0]) return;
                              try {
                                setUploading(s._id);
                await deliveriesApi.uploadProof(data._id, s._id, e.target.files[0]);
                setNotice('Proof uploaded successfully');
                                // reload details
                                const res = await deliveriesApi.get(data._id);
                                setData(res.data.data || res.data);
                              } finally {
                                setUploading(null);
                setTimeout(() => setNotice(null), 2000);
                              }
                            }} />
                          </label>
                          <label className="text-xs px-2 py-1 rounded bg-white/10 cursor-pointer">
                            {uploading === `${s._id}-sig` ? 'Uploading…' : 'Upload Signature'}
                            <input type="file" className="hidden" disabled={!!uploading} onChange={async (e) => {
                              if (!e.target.files?.[0]) return;
                              try {
                                setUploading(`${s._id}-sig`);
                await deliveriesApi.uploadSignature(data._id, s._id, e.target.files[0]);
                setNotice('Signature uploaded successfully');
                                const res = await deliveriesApi.get(data._id);
                                setData(res.data.data || res.data);
                              } finally {
                                setUploading(null);
                setTimeout(() => setNotice(null), 2000);
                              }
                            }} />
                          </label>
                        </div>
                      </div>
            {notice && <div className="text-[11px] text-emerald-300 mt-1">{notice}</div>}
                      {Boolean(s.items?.length) && (
                        <ul className="mt-2 list-disc ml-5 opacity-80">
                          {s.items.map((it: any) => (
                            <li key={it._id || (it.product && it.product._id) || `${(it.product && it.product.sku) || 'item'}-${it.quantity}`}>{(it.product && (it.product.name?.en || it.product.sku)) || 'Item'} × {it.quantity}</li>
                          ))}
                        </ul>
                      )}
                      {(s.proofOfDelivery || s.signature) && (
                        <div className="mt-2 flex gap-2">
                          {s.proofOfDelivery && <a href={s.proofOfDelivery} target="_blank" rel="noreferrer" className="text-xs underline">View POD</a>}
                          {s.signature && <a href={s.signature} target="_blank" rel="noreferrer" className="text-xs underline">View Signature</a>}
                        </div>
                      )}
                    </div>
                  )) : <div className="opacity-70">No stops added.</div>}
                </div>
              </div>
          </>
        )}
        {!loading && !data && <div>Not found.</div>}
      </div>
    </div>
  );
}
