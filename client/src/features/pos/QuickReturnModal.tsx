import React, { useState } from 'react';
import FormModal from '@/components/ui/FormModal';
import SaleLookup from '@/components/returns/SaleLookup';
import ReturnProcessor from '@/components/returns/ReturnProcessor';

interface QuickReturnModalProps {
  open: boolean;
  onClose: () => void;
}

// Lightweight wrapper to perform sale lookup and then process a return inside POS.
const QuickReturnModal: React.FC<QuickReturnModalProps> = ({ open, onClose }) => {
  const [step, setStep] = useState<'lookup' | 'process'>('lookup');
  const [sale, setSale] = useState<any | null>(null);

  const handleSaleSelected = (s: any) => {
    setSale(s);
    setStep('process');
  };

  const handleComplete = () => {
    // Broadcast events for POS to refresh related data
    try {
      window.dispatchEvent(new Event('returns:processed'));
      window.dispatchEvent(new Event('inventory:refresh'));
      window.dispatchEvent(new Event('sales:updated'));
    } catch {}
    setStep('lookup');
    setSale(null);
    onClose();
  };

  return (
    <FormModal
      isOpen={open}
      onClose={() => { setStep('lookup'); setSale(null); onClose(); }}
      title={step === 'lookup' ? 'Quick Return Lookup' : `Process Return — ${sale?.invoiceNo || ''}`}
      widthClass="max-w-5xl"
      footer={null}
    >
  <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 vz-scroll-gutter pr-fallback scrollbar-hide">
        {step === 'lookup' && (
          <div>
            <SaleLookup onSaleSelected={handleSaleSelected} />
            <p className="mt-4 text-xs text-gray-400">Search by invoice number or customer info to start a quick return.</p>
          </div>
        )}
        {step === 'process' && sale && (
          <div className="space-y-4">
            <button
              onClick={() => { setStep('lookup'); setSale(null); }}
              className="text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition"
            >← Back to lookup</button>
            <ReturnProcessor sale={sale} onComplete={handleComplete} />
          </div>
        )}
      </div>
    </FormModal>
  );
};

export default QuickReturnModal;
