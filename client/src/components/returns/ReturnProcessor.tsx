import React, { useState, useEffect } from 'react';
import { returnsApi, ReturnRequest, ReturnItem, ReturnValidation } from '@/lib/api/returns.api';
import { settingsApi } from '@/lib/api/settings.api';
import { toast } from '@/components/ui/toasts/toastService';

interface ReturnProcessorProps {
  sale: any;
  onComplete: (result?: { returnTransaction?: any; exchangeSlip?: any; overpayment?: any }) => void;
}

const RETURN_REASONS = [
  { value: 'defective', label: 'Defective' },
  { value: 'expired', label: 'Expired' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'unwanted', label: 'Unwanted' },
  { value: 'size_issue', label: 'Size Issue' },
  { value: 'color_issue', label: 'Color Issue' },
  { value: 'other', label: 'Other' }
];

const RETURN_CONDITIONS = [
  { value: 'new', label: 'New/Unopened' },
  { value: 'opened', label: 'Opened' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'defective', label: 'Defective' }
];

const DISPOSITIONS = [
  { value: 'restock', label: 'Restock' },
  { value: 'damage', label: 'Mark as Damaged' },
  { value: 'write_off', label: 'Write Off' },
  { value: 'return_to_supplier', label: 'Return to Supplier' }
];

const RETURN_TYPES = [
  { value: 'partial_refund', label: 'Partial Refund' },
  { value: 'full_refund', label: 'Full Refund' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'store_credit', label: 'Store Credit' }
];

const REFUND_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'digital', label: 'Digital Payment' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'exchange_slip', label: 'Exchange Slip' },
  { value: 'overpayment', label: 'Customer Credit' }
];

const panelClass = "relative rounded-3xl p-8 bg-[#1E1E1E] border border-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] overflow-hidden";
const panelBgOverlay = "absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-br from-white/5 via-blue-500/5 to-purple-500/5";

const ReturnProcessor: React.FC<ReturnProcessorProps> = ({ sale, onComplete }) => {
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnType, setReturnType] = useState<'partial_refund' | 'full_refund' | 'exchange' | 'store_credit'>('partial_refund');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'digital' | 'store_credit' | 'exchange_slip' | 'overpayment'>('cash');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [validation, setValidation] = useState<ReturnValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [storeProfile, setStoreProfile] = useState({
    name: 'VoltZone',
    address: '',
    phone: '',
    email: ''
  });
  // Using global toast service now

  useEffect(() => {
    // Initialize return items from sale items
    if (sale?.items) {
      const initialItems: ReturnItem[] = sale.items.map((item: any) => ({
        product: item.product?._id || item.product,
        quantity: 0,
        returnAmount: 0,
        reason: 'other' as const,
        condition: 'new' as const,
        disposition: 'restock' as const
      }));
      setReturnItems(initialItems);
    }
  }, [sale]);

  useEffect(() => {
    let active = true;
    settingsApi.get()
      .then((res) => {
        if (!active) return;
        const payload = res?.data?.data || res?.data || {};
        setStoreProfile({
          name: payload?.branding?.storeName || 'VoltZone',
          address: payload?.branding?.address || '',
          phone: payload?.branding?.phone || '',
          email: payload?.branding?.email || ''
        });
      })
      .catch(() => {
        /* ignore missing settings */
      });
    return () => {
      active = false;
    };
  }, []);

  const formatCurrency = (amount: number) => {
    const numeric = Number.isFinite(amount) ? amount : 0;
    return `LKR ${numeric.toLocaleString()}`;
  };

  const normalizeId = (value: any) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return value._id || value.id || value.toString?.() || '';
    }
    return String(value);
  };

  const getCustomerDisplayName = (customer: any) => {
    if (!customer) return 'Walk-in Customer';
    if (typeof customer === 'string') return customer;
    if (typeof customer === 'object') {
      if (typeof customer.name === 'object') {
        return customer.name.en || customer.name.si || customer._id || 'Customer';
      }
      if (customer.firstName || customer.lastName) {
        return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';
      }
      return customer.name || customer.email || customer.phone || customer._id || 'Customer';
    }
    return String(customer);
  };

  const mapSlipItems = (slipItems: any[] = []) => {
    if (!Array.isArray(slipItems)) return [];
    return slipItems.map((item) => {
      const match = sale?.items?.find((saleItem: any) => normalizeId(saleItem.product) === normalizeId(item.product));
      const label =
        (typeof match?.product?.name === 'string' && match?.product?.name) ||
        match?.product?.name?.en ||
        match?.product?.name?.si ||
        match?.productName ||
        'Product';
      return {
        name: label,
        sku: match?.product?.sku,
        qty: item.quantity,
        value: item.exchangeValue
      };
    });
  };

  const formatDateValue = (value?: string | number | Date) => {
    if (!value) return new Date().toLocaleDateString();
    return new Date(value).toLocaleDateString();
  };

  const formatDateTimeValue = (value?: string | number | Date) => {
    if (!value) return new Date().toLocaleString();
    return new Date(value).toLocaleString();
  };

  const openExchangeSlipPreview = (slipData: any) => {
    if (typeof window === 'undefined') return;
    const slipWindow = window.open('', '_blank', 'width=520,height=720');
    if (!slipWindow) {
      toast.info('Exchange slip generated. Please allow pop-ups to view it.', 'Exchange Slip');
      return;
    }

    const lineItems = mapSlipItems(slipData?.items || []);
    const invoiceRef = sale?.invoiceNo || sale?.saleNo || sale?._id || 'N/A';
    const customerName = getCustomerDisplayName(sale?.customer);
    const issueDate = formatDateTimeValue(slipData?.createdAt || new Date());
    const expiryDate = formatDateValue(slipData?.expiryDate);
    const storeLines = [storeProfile.address, [storeProfile.phone, storeProfile.email].filter(Boolean).join(' • ')].filter(Boolean);
    const itemsHtml = lineItems.length
      ? lineItems
          .map(
            (item) => `
            <tr>
              <td>
                <div class="item-name">${item.name}</div>
                ${item.sku ? `<div class="sku">${item.sku}</div>` : ''}
              </td>
              <td class="qty">${item.qty}</td>
              <td class="val">${formatCurrency(item.value)}</td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="3">Item details unavailable</td></tr>';

    const doc = slipWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Exchange Slip ${slipData?.slipNo || ''}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, sans-serif; background:#0f172a; margin:0; padding:32px; color:#0f172a; }
      .slip { max-width:520px; margin:0 auto; background:#fff; border-radius:18px; padding:32px 36px; box-shadow:0 30px 70px rgba(15,23,42,0.45); }
      .badge { display:inline-flex; padding:4px 12px; border-radius:999px; font-size:11px; letter-spacing:0.1em; background:#dbeafe; color:#1e3a8a; font-weight:600; }
      .store { font-size:24px; font-weight:700; letter-spacing:0.04em; margin-top:16px; }
      .contact { font-size:13px; color:#475569; margin-top:4px; line-height:1.4; }
      .meta { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin:24px 0 12px; font-size:13px; color:#475569; }
      .meta span { display:block; color:#0f172a; font-weight:600; font-size:14px; margin-top:4px; }
      table { width:100%; border-collapse:collapse; margin-top:20px; font-size:13px; }
      th { text-align:left; font-size:11px; letter-spacing:0.08em; color:#94a3b8; padding-bottom:6px; }
      td { padding:10px 0; border-top:1px solid #e2e8f0; vertical-align:top; }
      .item-name { font-weight:600; color:#0f172a; }
      .sku { font-size:11px; color:#94a3b8; }
      .qty, .val { text-align:right; font-weight:600; color:#0f172a; }
      .total-card { margin-top:24px; border-radius:16px; background:linear-gradient(135deg,#1d4ed8,#3b82f6); color:#fff; padding:18px 20px; display:flex; justify-content:space-between; align-items:center; }
      .total-card span { font-size:13px; letter-spacing:0.08em; text-transform:uppercase; opacity:0.8; }
      .total-card strong { font-size:24px; }
      .notes { margin-top:20px; font-size:12px; color:#475569; line-height:1.5; }
      .signature { margin-top:32px; display:flex; justify-content:space-between; font-size:12px; color:#475569; }
      .signature div { width:45%; text-align:center; border-top:1px solid #cbd5f5; padding-top:8px; }
      .print-btn { margin-top:28px; width:100%; padding:12px 16px; border:none; border-radius:12px; background:#0f172a; color:#fff; font-weight:600; cursor:pointer; }
      @media print { body { background:#fff; padding:0; } .slip { box-shadow:none; border-radius:0; } .print-btn { display:none; } }
    </style>
  </head>
  <body>
    <div class="slip">
      <div class="badge">EXCHANGE SLIP</div>
      <div class="store">${storeProfile.name || 'VoltZone'}</div>
      ${storeLines.length ? `<div class="contact">${storeLines.map((line) => `<div>${line}</div>`).join('')}</div>` : ''}
      <div class="meta">
        <div>Slip No.<span>${slipData?.slipNo || 'N/A'}</span></div>
        <div>Invoice Ref.<span>${invoiceRef}</span></div>
        <div>Issued On<span>${issueDate}</span></div>
        <div>Expires On<span>${expiryDate}</span></div>
        <div>Customer<span>${customerName}</span></div>
        <div>Status<span>${(slipData?.status || 'active').toUpperCase()}</span></div>
      </div>
      <table>
        <thead>
          <tr><th>ITEM</th><th class="qty">QTY</th><th class="val">VALUE</th></tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div class="total-card">
        <span>Total Value</span>
        <strong>${formatCurrency(slipData?.totalValue || 0)}</strong>
      </div>
      <div class="notes">
        Present this slip with the original invoice before the expiry date. Store credit is valid only at ${storeProfile.name || 'our store'} and is non-transferable.
      </div>
      <div class="signature">
        <div>Issued By</div>
        <div>Customer</div>
      </div>
      <button class="print-btn" onclick="window.print()">Print Slip</button>
    </div>
  </body>
</html>`);
    doc.close();
    slipWindow.focus();
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    if (!sale?.items?.[index]) return;
    const updatedItems = [...returnItems];
    const saleItem = sale.items[index];
    const maxQuantity = (saleItem.quantity || 0) - (saleItem.returnedQuantity || 0);

    updatedItems[index].quantity = Math.min(Math.max(0, quantity), maxQuantity);
    updatedItems[index].returnAmount = updatedItems[index].quantity * (saleItem.price || 0);

    setReturnItems(updatedItems);
  };

  const handleItemAmountChange = (index: number, amount: number) => {
    if (!sale?.items?.[index]) return;
    const updatedItems = [...returnItems];
    const saleItem = sale.items[index];
    const maxAmount = (saleItem.quantity || 0) * (saleItem.price || 0);

    updatedItems[index].returnAmount = Math.min(Math.max(0, amount), maxAmount);
    setReturnItems(updatedItems);
  };

  const handleItemFieldChange = (index: number, field: keyof ReturnItem, value: any) => {
    const updatedItems = [...returnItems];
    (updatedItems[index] as any)[field] = value;
    setReturnItems(updatedItems);
  };

  const validateReturn = async () => {
    const itemsToReturn = returnItems.filter(item => item.quantity > 0);
    
    if (itemsToReturn.length === 0) {
  toast.warning('Please select at least one item to return.', 'Nothing Selected');
      return;
    }

    const returnRequest: ReturnRequest = {
      saleId: sale._id,
      items: itemsToReturn,
      returnType,
      refundMethod,
      discount,
      notes
    };

    setIsValidating(true);
    try {
      const apiRes = await returnsApi.validateReturn(returnRequest);
      setValidation(apiRes.data);
      const { valid, errors, warnings } = apiRes.data;
      if (valid) toast.success('All checks succeeded. You can process the return now.', 'Validation Passed');
      else toast.error(errors[0] || 'One or more validation errors occurred.', 'Validation Failed');
      if (warnings?.length) toast.warning(warnings[0], 'Warnings');
    } catch (error: any) {
      console.error('Validation error:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to validate return';
  toast.error(message, 'Validation Error');
    } finally {
      setIsValidating(false);
    }
  };

  const processReturn = async () => {
    if (!validation?.valid) {
  toast.warning('Please run validation before processing.', 'Validation Required');
      return;
    }

    const itemsToReturn = returnItems.filter(item => item.quantity > 0);
    const returnRequest: ReturnRequest = {
      saleId: sale._id,
      items: itemsToReturn,
      returnType,
      refundMethod,
      discount,
      notes
    };

    setIsProcessing(true);
    try {
      const apiRes = await returnsApi.processReturn(returnRequest);
      const resultPayload = apiRes.data;
      if (returnType === 'exchange' && refundMethod === 'exchange_slip' && resultPayload?.exchangeSlip) {
        openExchangeSlipPreview(resultPayload.exchangeSlip);
      }
  toast.success('Return processed successfully.', 'Return Processed');
      onComplete(resultPayload); // pass result object
    } catch (error: any) {
      console.error('Process return error:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to process return';
  toast.error(message, 'Process Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotalReturnAmount = () => {
    return returnItems.reduce((total, item) => total + item.returnAmount, 0) - discount;
  };

  return (
    <div className="space-y-10">
      {/* Items Panel */}
      <div className={panelClass}>
        <div className={panelBgOverlay} />
        <div className="relative">
          <h3 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2">Select Items to Return</h3>
          <p className="text-sm text-gray-400 mb-6">Choose the items and quantities you want to return from this sale.</p>
          <div className="space-y-5">
            {(sale?.items || []).map((saleItem:any,index:number)=>{ const ri=returnItems[index]; const max=(saleItem?.quantity||0)-((saleItem?.returnedQuantity)||0); const selected=ri?.quantity>0; const key=saleItem?.product?._id||saleItem?.product||index; return (
              <div key={key} className={`group relative border rounded-2xl p-6 transition overflow-hidden backdrop-blur-sm ${selected? 'border-blue-500/60 bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent':'border-white/10 bg-white/5 hover:border-blue-400/40'} `}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold tracking-wide text-white/90">{(typeof saleItem.product?.name === 'string' && saleItem.product?.name) || saleItem.product?.name?.en || saleItem.product?.name?.si || 'Unknown Product'}</h4>
                    <p className="text-xs text-gray-400 mt-1">SKU: {saleItem.product?.sku} <span className="mx-1">|</span> Price: {formatCurrency(saleItem.price)}</p>
                    <p className="text-xs text-gray-500 mt-1">Sold: {saleItem.quantity} <span className="mx-1">|</span> Available: {max}</p>
                  </div>
                  <span className={`px-2 py-1 text-[10px] rounded-full font-medium tracking-wide ${selected? 'bg-blue-500/20 text-blue-200':'bg-gray-600/30 text-gray-300'}`}>{selected? 'Selected':'Not Selected'}</span>
                </div>
                {max>0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <label htmlFor={`qty_${key}`} className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400">Quantity</label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={()=>handleItemQuantityChange(index,(ri?.quantity||0)-1)} disabled={!ri||ri.quantity<=0} className="px-2 py-1 rounded-lg bg-[#27272A] border border-white/10 hover:bg-white/10 disabled:opacity-40">-</button>
                        <input id={`qty_${key}`} type="number" min={0} max={max} value={ri?.quantity||0} onChange={(e)=>handleItemQuantityChange(index,parseInt(e.target.value)||0)} className="w-20 px-2 py-1 rounded-lg bg-[#27272A] border border-white/10 text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none" />
                        <button type="button" onClick={()=>handleItemQuantityChange(index,(ri?.quantity||0)+1)} disabled={!ri||ri.quantity>=max} className="px-2 py-1 rounded-lg bg-[#27272A] border border-white/10 hover:bg-white/10 disabled:opacity-40">+</button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`amt_${key}`} className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400">Return Amount</label>
                      <input id={`amt_${key}`} type="number" min={0} max={saleItem.quantity*saleItem.price} step="0.01" value={ri?.returnAmount||0} onChange={(e)=>handleItemAmountChange(index,parseFloat(e.target.value)||0)} className="w-full px-3 py-2 rounded-lg bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none" />
                    </div>
                    <div>
                      <label htmlFor={`reason_${key}`} className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400">Reason</label>
                      <select id={`reason_${key}`} value={ri?.reason||'other'} onChange={(e)=>handleItemFieldChange(index,'reason',e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none">
                        {RETURN_REASONS.map(r=> <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`cond_${key}`} className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400">Condition</label>
                      <select id={`cond_${key}`} value={ri?.condition||'new'} onChange={(e)=>handleItemFieldChange(index,'condition',e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none">
                        {RETURN_CONDITIONS.map(c=> <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`disp_${key}`} className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400">Disposition</label>
                      <select id={`disp_${key}`} value={ri?.disposition||'restock'} onChange={(e)=>handleItemFieldChange(index,'disposition',e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none">
                        {DISPOSITIONS.map(d=> <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-xs text-yellow-200">This item has already been fully returned or is not available for return.</p>
                  </div>
                )}
              </div>
            );})}
            {!(sale?.items?.length) && (
              <div className="p-10 text-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-gray-400 text-sm">No sale items found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className={panelClass}>
        <div className={panelBgOverlay} />
        <div className="relative">
          <h3 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-6">Return Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="return_type" className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400">Return Type</label>
              <select id="return_type" value={returnType} onChange={(e)=>setReturnType(e.target.value as any)} className="w-full px-4 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none">
                {RETURN_TYPES.map(t=> <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="refund_method" className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400">Refund Method</label>
              <select id="refund_method" value={refundMethod} onChange={(e)=>setRefundMethod(e.target.value as any)} className="w-full px-4 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none">
                {REFUND_METHODS.map(m=> <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="discount" className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400">Discount (Optional)</label>
              <input id="discount" type="number" min={0} step="0.01" value={discount} onChange={(e)=>setDiscount(parseFloat(e.target.value)||0)} placeholder="0.00" className="w-full px-4 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none" />
            </div>
            <div>
              <span className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400" aria-hidden>Total Return Amount</span>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 text-transparent bg-clip-text py-2">{formatCurrency(calculateTotalReturnAmount())}</div>
            </div>
          </div>
          <div>
            <label htmlFor="return_notes" className="block text-xs font-medium mb-1 uppercase tracking-wide text-gray-400">Notes (Optional)</label>
            <textarea id="return_notes" value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} placeholder="Add any additional notes about this return..." className="w-full px-4 py-2.5 rounded-xl bg-[#27272A] border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 outline-none" />
          </div>
        </div>
      </div>

      {/* Validation Panel */}
      {validation && (
        <div className={panelClass}>
          <div className={panelBgOverlay} />
          <div className="relative">
            <h3 className={`text-xl font-semibold mb-6 tracking-wide ${validation.valid? 'text-emerald-300':'text-red-300'}`}>Validation Results</h3>
            {validation.errors.length>0 && (
              <div className="mb-5 p-4 rounded-2xl border border-red-500/30 bg-red-500/10">
                <strong className="block text-sm text-red-200 mb-1">Errors</strong>
                <ul className="space-y-1 text-xs text-red-300 list-disc list-inside">{validation.errors.map((e,i)=><li key={`${e}-${i}`}>{e}</li>)}</ul>
              </div>
            )}
            {validation.warnings.length>0 && (
              <div className="mb-5 p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10">
                <strong className="block text-sm text-yellow-200 mb-1">Warnings</strong>
                <ul className="space-y-1 text-xs text-yellow-200/90 list-disc list-inside">{validation.warnings.map((w,i)=><li key={`${w}-${i}`}>{w}</li>)}</ul>
              </div>
            )}
            {validation.requiresApproval && (
              <div className="mb-5 p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10">
                <p className="text-sm text-blue-200">This return requires manager approval due to policy requirements.</p>
              </div>
            )}
            {validation.valid && (
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                <p className="text-sm text-emerald-200">All validation checks passed. This return can be processed.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={validateReturn} disabled={isValidating || calculateTotalReturnAmount() <= 0} className="relative px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition">{isValidating? 'Validating...':'Validate Return'}</button>
        <button onClick={processReturn} disabled={!validation?.valid || isProcessing} className="relative px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_-4px_rgba(59,130,246,0.6)] transition">{isProcessing? 'Processing...':'Process Return'}</button>
      </div>
    </div>
  );
};

export default ReturnProcessor;