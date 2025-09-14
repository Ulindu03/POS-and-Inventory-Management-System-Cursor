import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;
  const confirmClasses = tone === 'danger'
    ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 focus:ring-rose-400'
    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 focus:ring-indigo-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 210, damping: 24 }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(20,20,20,0.85)] backdrop-blur-xl shadow-2xl p-6 text-[#F8F8F8]"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-400/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path d="M12 9v4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9Z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold tracking-wide mb-1">{title}</h3>
                <p className="text-sm text-[#F8F8F8]/70 leading-relaxed">{description}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onConfirm}
                className={`px-5 py-2 rounded-xl text-sm font-semibold shadow-lg hover:shadow-rose-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[rgba(20,20,20,0.85)] transition-all disabled:opacity-60 ${confirmClasses}`}
              >
                {loading ? 'Working...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConfirmDialog;