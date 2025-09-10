import { AppLayout } from '@/components/common/Layout/Layout';
import { useState, useEffect, useRef, useMemo } from 'react';
import { getAccessToken } from '@/lib/api/token';
import { toast } from 'sonner';
import {
  Search,
  RefreshCcw,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  Tag,
  X
} from '@/lib/safe-lucide-react';

interface WarrantyItem {
  _id: string;
  warrantyNo: string;
  status: string;
  periodDays?: number;
  endDate?: string;
  productSnapshot?: any;
  customerSnapshot?: any;
  saleSnapshot?: any;
  product?: any;
  customer?: any;
}

// A more elegant & user‑friendly Warranty Management UI
const WarrantyPage = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<WarrantyItem[]>([]);
  const [activating, setActivating] = useState<Record<string, string>>({}); // warrantyId -> serial
  const [error, setError] = useState<string | null>(null);
  const [creatingClaim, setCreatingClaim] = useState<string | null>(null);
  const [claimDesc, setClaimDesc] = useState('');
  const [claimCategory, setClaimCategory] = useState('mechanical');
  const [filters, setFilters] = useState({ invoiceNo:'', phone:'', nic:'' });
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Derived groupings memoized for performance & readability
  const pending = useMemo(()=>items.filter(w=>w.status==='pending_activation'),[items]);
  const active  = useMemo(()=>items.filter(w=>w.status==='active'),[items]);
  const soonExpiring = useMemo(()=>{
    const now = Date.now();
    const in7 = now + 7*24*3600*1000;
    return active.filter(w=> w.endDate && new Date(w.endDate).getTime() < in7 );
  },[active]);
  const stats = useMemo(()=>({
    total: items.length,
    pending: pending.length,
    active: active.length,
    expiringSoon: soonExpiring.length
  }),[items, pending, active, soonExpiring]);
  const activateWarranty = async (id: string, serial: string) => {
    try {
      const r = await fetch(`/api/warranty/${id}/activate`,{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ serialNumber: serial, userId: 'system' })
      });
      const j = await r.json();
      if(j.success){
        toast.success('Warranty activated');
        setItems(prev=>prev.map(x=>x._id===id?j.data:x));
        window.dispatchEvent(new Event('warranty:updated'));
      } else toast.error(j.message||'Activation failed');
    } catch { toast.error('Activation error'); }
  };
  const loadingRef = useRef(false);

  const devFallback = async () => {
    try {
      const d = await fetch('/api/warranty/__dev/diag');
      const dj = await d.json();
      if(dj?.success && dj.data?.recent?.length){
        setItems(dj.data.recent.map((r:any)=>({
          _id:r._id||r.id||r.warrantyNo,
          warrantyNo:r.warrantyNo,
          status:r.status,
          periodDays:r.periodDays,
          productSnapshot:r.productSnapshot||{},
          customerSnapshot:r.customerSnapshot||{},
          saleSnapshot:r.saleSnapshot||{},
          endDate:r.endDate
        })));
      }
    } catch {/* ignore */}
  };

  const fetchWarranties = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: '1', pageSize: '100' });
    if (filters.invoiceNo) params.append('invoiceNo', filters.invoiceNo.trim());
    if (filters.phone) params.append('phone', filters.phone.trim());
    if (filters.nic) params.append('nic', filters.nic.trim());
    const token = getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 8000);
    try {
      const res = await fetch(`/api/warranty?${params.toString()}`, { headers: token? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal });
      const json = await res.json();
      if(json?.success) {
        setItems(json.data.items || []);
        if((!json.data.items || json.data.items.length===0) && !filters.invoiceNo && !filters.phone && !filters.nic){ await devFallback(); }
      } else {
        setError(json?.message || 'Failed to load');
      }
    } catch(e:any) {
      if(e?.name==='AbortError') setError('Request timed out'); else setError('Network error');
    } finally { clearTimeout(timeout); setLoading(false); loadingRef.current = false; }
  };

  const reload = () => fetchWarranties();
  useEffect(() => { fetchWarranties(); /* eslint-disable-next-line */ }, []);
  useEffect(()=>{ const h=()=>fetchWarranties(); window.addEventListener('warranty:updated',h); const i=setInterval(h,30000); return ()=>{ window.removeEventListener('warranty:updated',h); clearInterval(i);} },[]);

  const statusChip = (status:string) => {
    const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide';
    const map: Record<string,string> = {
      pending_activation: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30',
      active: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30',
      expired: 'bg-zinc-600/20 text-zinc-300 ring-1 ring-zinc-500/30',
      claimed: 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30'
    };
    return <span className={base+ ' ' + (map[status]||'bg-zinc-700/40 text-zinc-300')}>{status.replace('_',' ')}</span>;
  };

  // Skeleton moved outside component

  return (
    <AppLayout>
      <div className="h-full overflow-auto space-y-6 pb-10">
        {/* Page Header & Filters */}
        <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/60 border-b border-white/5 pl-1 pr-2 py-3 flex flex-col gap-3 rounded-b-xl">
          <div className="flex items-center gap-3 justify-between">
            <h1 className="text-lg font-semibold tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4 text-yellow-300" /> Warranties
            </h1>
            <button onClick={reload} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 transition-colors">
              <RefreshCcw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-end text-xs">
            <div className="flex flex-col">
              <label htmlFor="flt-invoice" className="mb-1 opacity-60">Invoice</label>
              <input id="flt-invoice" placeholder="Invoice #" value={filters.invoiceNo} onChange={e=>setFilters(f=>({...f,invoiceNo:e.target.value}))} className="bg-white/10 border border-white/10 rounded px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-yellow-300/40" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="flt-phone" className="mb-1 opacity-60">Phone</label>
              <input id="flt-phone" placeholder="Customer" value={filters.phone} onChange={e=>setFilters(f=>({...f,phone:e.target.value}))} className="bg-white/10 border border-white/10 rounded px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-yellow-300/40" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="flt-nic" className="mb-1 opacity-60">NIC</label>
              <input id="flt-nic" placeholder="NIC" value={filters.nic} onChange={e=>setFilters(f=>({...f,nic:e.target.value}))} className="bg-white/10 border border-white/10 rounded px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-yellow-300/40" />
            </div>
            <button onClick={reload} className="ml-1 h-8 mt-5 inline-flex items-center gap-1 px-3 rounded bg-yellow-300 text-black font-medium text-xs shadow hover:shadow-md transition-shadow">
              <Search className="w-3.5 h-3.5" /> Find
            </button>
            {(filters.invoiceNo||filters.phone||filters.nic) && (
              <button onClick={()=>{setFilters({invoiceNo:'',phone:'',nic:''}); reload();}} className="h-8 mt-5 text-xs px-2 rounded bg-white/5 hover:bg-white/15 border border-white/10 inline-flex items-center gap-1">
                <X className="w-3.5 h-3.5"/> Clear
              </button>
            )}
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total" value={stats.total} icon={<Tag className='w-4 h-4' />} />
            <StatCard label="Pending" value={stats.pending} icon={<Clock className='w-4 h-4' />} tone="amber" />
            <StatCard label="Active" value={stats.active} icon={<CheckCircle className='w-4 h-4' />} tone="emerald" />
            <StatCard label="Expiring Soon" value={stats.expiringSoon} icon={<AlertCircle className='w-4 h-4' />} tone="rose" />
          </div>
        </div>

        {/* Body */}
        {error && (
          <div className="mx-1 sm:mx-2 md:mx-0 text-red-400 text-sm flex items-center gap-2 bg-red-500/10 border border-red-400/20 px-4 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <button onClick={reload} className="ml-auto underline text-xs">Retry</button>
          </div>
        )}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 px-1 sm:px-2 md:px-0">
            <Panel title="Pending Activation" subtitle="Newly issued warranties awaiting serial number">
              <Skeleton rows={3} />
            </Panel>
            <Panel title="Active" subtitle="Currently in coverage window">
              <Skeleton rows={3} />
            </Panel>
            <Panel title="All Warranties" subtitle="Full list (latest first)">
              <Skeleton rows={4} />
            </Panel>
          </div>
        )}
        {!loading && !error && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 px-1 sm:px-2 md:px-0">
            <Panel title="Pending Activation" subtitle="New warranties awaiting serial" emptyLabel="No pending" count={pending.length}>
              <div className="space-y-3 max-h-80 overflow-auto pr-1 custom-scroll">
                {pending.map(w => (
                  <div key={w._id} className="group border border-white/10 hover:border-yellow-300/40 transition-colors rounded-lg p-3 space-y-2 bg-white/[0.02] hover:bg-white/[0.04]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-[11px] tracking-wide flex items-center gap-2">
                          {statusChip(w.status)}
                          <span className="text-xs font-mono">{w.warrantyNo}</span>
                        </div>
                        <div className="opacity-60 text-[11px] mt-1">{w.productSnapshot?.name || w.product?.name || 'Product'} · {w.periodDays}d</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        placeholder="Serial number"
                        value={activating[w._id]||''}
                        onChange={(e)=>setActivating(p=>({...p,[w._id]:e.target.value}))}
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                      />
                      <button
                        onClick={() => {
                          const serial = activating[w._id];
                          if(!serial) { return; }
                          activateWarranty(w._id, serial);
                        }}
                        className="px-3 py-1 rounded bg-amber-400 text-black text-xs font-medium shadow hover:shadow-md disabled:opacity-40"
                        disabled={!activating[w._id]}
                      >Activate</button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Active" subtitle="In coverage window" emptyLabel="None active" count={active.length}>
              <div className="space-y-3 max-h-80 overflow-auto pr-1 custom-scroll">
                {active.map(w => (
                  <div key={w._id} className="border border-white/10 rounded-lg p-3 bg-white/[0.02] hover:bg-white/[0.05] transition-colors relative group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-medium text-[11px] tracking-wide flex items-center gap-2">
                          {statusChip(w.status)}
                          <span className="text-xs font-mono">{w.warrantyNo}</span>
                        </div>
                        <div className="opacity-60 text-[11px]">Period: {w.periodDays}d</div>
                        <div className="opacity-60 text-[11px]">Ends: {w.endDate?new Date(w.endDate).toLocaleDateString(): '-'}</div>
                      </div>
                      <button onClick={()=>{setCreatingClaim(w._id); setClaimDesc('');}} className="text-[10px] underline opacity-70 hover:opacity-100">Claim</button>
                    </div>
                    {w.endDate && (()=>{ const daysLeft = Math.ceil((new Date(w.endDate).getTime()-Date.now())/86400000); return daysLeft<=7 ? <div className="absolute top-1 right-1 text-[10px] text-amber-300">{daysLeft>0?daysLeft+'d left':'expiring'}</div> : null; })()}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="All Warranties" subtitle="Most recent first" emptyLabel="No records" count={items.length}>
              <div className="space-y-2 max-h-80 overflow-auto pr-1 custom-scroll">
                {items.slice().sort((a,b)=> (b.endDate?new Date(b.endDate).getTime():0) - (a.endDate?new Date(a.endDate).getTime():0)).map(w => (
                  <div key={w._id} className="flex items-center gap-3 border border-white/10 rounded-lg px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono truncate">{w.warrantyNo}</span>
                        {statusChip(w.status)}
                      </div>
                      <div className="opacity-50 text-[10px] mt-1">Ends {w.endDate?new Date(w.endDate).toLocaleDateString():'—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
        {creatingClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button className="absolute inset-0 bg-black/70" onClick={()=>!submittingClaim && setCreatingClaim(null)} />
            <div className="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl p-5 text-sm space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-base">New Claim</h3>
                <button onClick={()=>!submittingClaim && setCreatingClaim(null)} className="p-1 rounded hover:bg-white/10"><X className="w-4 h-4"/></button>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="claim-category" className="text-xs uppercase tracking-wide opacity-70">Issue Category</label>
                  <select id="claim-category" value={claimCategory} onChange={(e)=>setClaimCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300/40">
                    <option value="mechanical">Mechanical</option>
                    <option value="electrical">Electrical</option>
                    <option value="software">Software</option>
                    <option value="cosmetic">Cosmetic</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="claim-desc" className="text-xs uppercase tracking-wide opacity-70">Description</label>
                  <textarea id="claim-desc" value={claimDesc} onChange={(e)=>setClaimDesc(e.target.value)} rows={4} className="w-full resize-none bg-white/5 border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300/40" placeholder="Describe the issue in detail" />
                  <div className="text-[10px] opacity-50 text-right">{claimDesc.length}/500</div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button disabled={submittingClaim} onClick={()=>setCreatingClaim(null)} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs disabled:opacity-40">Cancel</button>
                  <button
                    disabled={submittingClaim || claimDesc.trim().length<4}
                    onClick={async ()=>{
                      try {
                        setSubmittingClaim(true);
                        const w = items.find(i=>i._id===creatingClaim);
                        if(!w){ setCreatingClaim(null); return; }
                        const payload = { warrantyId: w._id, customerId: String(w.customer), productId: String(w.product), issueCategory: claimCategory, issueDescription: claimDesc.trim(), reportedBy: 'system' };
                        const r = await fetch('/api/warranty-claims', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
                        const j = await r.json();
                        if(j.success){ toast.success('Claim created'); setCreatingClaim(null); }
                        else toast.error(j.message||'Failed');
                      } catch { toast.error('Error'); } finally { setSubmittingClaim(false); }
                    }}
                    className="px-5 py-1.5 rounded bg-yellow-300 text-black font-medium text-xs inline-flex items-center gap-2 disabled:opacity-40"
                  >{submittingClaim && <Loader2 className="w-3.5 h-3.5 animate-spin"/>} Submit</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

// Simple stat card component
const StatCard = ({ label, value, icon, tone }: { label:string; value:number; icon:React.ReactNode; tone?:'amber'|'emerald'|'rose'; }) => {
  const palette: Record<string,string> = {
    amber: 'from-amber-400/30 via-amber-400/10 to-transparent border-amber-400/30',
    emerald:'from-emerald-400/30 via-emerald-400/10 to-transparent border-emerald-400/30',
    rose:  'from-rose-400/30 via-rose-400/10 to-transparent border-rose-400/30'
  };
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${tone?palette[tone]:''} p-3 flex flex-col gap-1`}> 
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-70">
        <span>{label}</span>
        <span className="opacity-80">{icon}</span>
      </div>
      <div className="text-lg font-semibold leading-none">{value}</div>
    </div>
  );
};

// Panel wrapper used for sections
const Panel = ({ title, subtitle, children, emptyLabel, count }: { title:string; subtitle?:string; children:React.ReactNode; emptyLabel?:string; count?:number; }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-sm p-4 flex flex-col min-h-[300px]">
    <div className="mb-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm tracking-wide flex items-center gap-2">{title}{typeof count==='number' && <span className="text-[10px] font-normal opacity-60">{count}</span>}</h2>
      </div>
      {subtitle && <p className="text-[11px] opacity-50 mt-0.5 leading-snug">{subtitle}</p>}
    </div>
    <div className="flex-1 relative">
      {count===0 && emptyLabel ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs opacity-40 select-none">{emptyLabel}</div>
      ) : children}
    </div>
  </div>
);

export default WarrantyPage;

// Lightweight skeleton list used during loading states
const Skeleton = ({ rows=3 }:{rows?:number}) => {
  const arr = Array.from({length:rows});
  return (
    <div className="animate-pulse space-y-3">
      {arr.map((_,idx)=>(
        <div key={`sk-${rows}-${idx}`} className="h-14 rounded-lg bg-white/5 border border-white/5" />
      ))}
    </div>
  );
};