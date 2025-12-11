import { useState } from 'react';
import { toast } from 'sonner';
import { returnsApi, ExchangeSlip } from '@/lib/api/returns.api';
import { formatLKR } from '@/lib/utils/currency';

interface Props {
  open: boolean;
  onClose: () => void;
  onApplied: (slip: {
    slipNo: string;
    totalValue: number;
    expiryDate?: string;
    customerName?: string;
  }) => void;
  cartTotal: number;
}

const normalizeSlipNo = (value: string) => value.trim().toUpperCase();

export const ExchangeSlipModal = ({ open, onClose, onApplied, cartTotal }: Props) => {
  const [slipNo, setSlipNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [slip, setSlip] = useState<ExchangeSlip | null>(null);
  const [error, setError] = useState('');

  const handleClose = () => {
    setSlipNo('');
    setSlip(null);
    setError('');
    setLoading(false);
    onClose();
  };

  const lookupSlip = async () => {
    const trimmed = normalizeSlipNo(slipNo);
    if (!trimmed) {
      setError('Enter an exchange slip number');
      setSlip(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await returnsApi.exchangeSlip.getDetails(trimmed);
      const details = res?.data?.exchangeSlip;
      if (!details) {
        setError('Exchange slip not found');
        setSlip(null);
        return;
      }
      if (details.status !== 'active') {
        setError(`This slip is ${details.status}.`);
        setSlip(null);
        return;
      }
      if (details.expiryDate) {
        const expiry = new Date(details.expiryDate);
        if (!Number.isNaN(expiry.getTime()) && expiry < new Date()) {
          setError('This exchange slip has expired');
          setSlip(null);
          return;
        }
      }
      setSlip(details as ExchangeSlip);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load exchange slip';
      setError(message);
      setSlip(null);
    } finally {
      setLoading(false);
    }
  };

  const applySlip = () => {
    if (!slip) return;
    onApplied({
      slipNo: slip.slipNo,
      totalValue: slip.totalValue,
      expiryDate: slip.expiryDate,
      customerName: (slip as any)?.customer?.name ?? undefined,
    });
    toast.success('Exchange slip applied');
    handleClose();
  };

  if (!open) return null;

  const slipValue = slip?.totalValue ?? 0;
  const remaining = Math.max(cartTotal - slipValue, 0);
  const overage = Math.max(slipValue - cartTotal, 0);
  const expiryLabel = slip?.expiryDate && !Number.isNaN(Date.parse(slip.expiryDate))
    ? new Date(slip.expiryDate).toLocaleDateString()
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 text-[#F8F8F8]">
        <div className="text-lg font-semibold mb-4">Apply Exchange Slip</div>
        <label className="block text-xs uppercase tracking-wide opacity-70 mb-2" htmlFor="exchange-slip-number">
          Slip number
        </label>
        <div className="flex gap-2">
          <input
            id="exchange-slip-number"
            value={slipNo}
            onChange={(e) => {
              setSlipNo(e.target.value);
              setError('');
            }}
            className="flex-1 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-[#F8F8F8]"
            placeholder="EX12345"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') lookupSlip(); }}
          />
          <button
            type="button"
            onClick={lookupSlip}
            disabled={loading}
            className="rounded-lg px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Lookup'}
          </button>
        </div>
        <div className="h-5 text-xs text-yellow-200 mt-1">{error}</div>

        {slip && (
          <div className="mt-3 space-y-2 rounded-xl border border-sky-300/30 bg-sky-500/15 px-3 py-3 text-xs">
            <div className="flex justify-between text-sky-100/90">
              <span>Slip number</span>
              <span className="font-semibold">#{slip.slipNo}</span>
            </div>
            <div className="flex justify-between text-sky-100">
              <span>Value</span>
              <span>{formatLKR(slipValue)}</span>
            </div>
            {expiryLabel && (
              <div className="flex justify-between text-sky-100/80">
                <span>Expires</span>
                <span>{expiryLabel}</span>
              </div>
            )}
            {remaining > 0 && (
              <div className="flex justify-between rounded-lg bg-white/5 px-2 py-1 text-yellow-100">
                <span>Still due</span>
                <span>{formatLKR(remaining)}</span>
              </div>
            )}
            {overage > 0 && (
              <div className="flex justify-between rounded-lg bg-emerald-500/20 px-2 py-1 text-emerald-100">
                <span>Over value</span>
                <span>{formatLKR(overage)}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applySlip}
            disabled={!slip}
            className="px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
          >
            Apply to cart
          </button>
        </div>
      </div>
    </div>
  );
};
