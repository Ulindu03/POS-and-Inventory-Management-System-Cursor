import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type FormModalProps = Readonly<{
  isOpen: boolean;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string; // e.g. max-w-4xl
}>;

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  widthClass = 'max-w-2xl',
}) => {
  if (!isOpen) return null;

  const handleOverlayKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog"
        onKeyDown={handleOverlayKeyDown}
      />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative w-full ${widthClass} max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {icon ? (
                  <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
                    {icon}
                  </div>
                ) : null}
                <div>
                  <h2 className="text-xl font-semibold text-[#F8F8F8]">{title}</h2>
                  {subtitle ? (
                    <p className="text-sm text-[#F8F8F8]/70">{subtitle}</p>
                  ) : null}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-[#F8F8F8]/70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6">{children}</div>

            {/* Footer */}
            {footer ? <div className="pt-6">{footer}</div> : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FormModal;
