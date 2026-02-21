/**
 * POS Keyboard Shortcuts Help Overlay
 * 
 * Floating help panel showing all available keyboard shortcuts.
 * Triggered by pressing '?' key or clicking the help button.
 */
import { X, Keyboard } from '@/lib/safe-lucide-react';
import { POS_SHORTCUTS } from '@/hooks/usePOSShortcuts';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
}

const KeyBadge = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex items-center justify-center min-w-[50px] px-2 py-1 text-xs font-mono font-semibold bg-black/60 border border-white/20 rounded-md text-yellow-300 shadow-[0_2px_0_0_rgba(255,255,255,0.1)]">
    {children}
  </kbd>
);

const ShortcutRow = ({ shortcut }: { shortcut: { key: string; action: string } }) => (
  <div className="grid grid-cols-[1fr_auto] items-center gap-4 py-1.5 border-b border-white/5 last:border-0">
    <span className="text-white/80 text-sm">{shortcut.action}</span>
    <KeyBadge>{shortcut.key}</KeyBadge>
  </div>
);

const ShortcutSection = ({ title, shortcuts }: { title: string; shortcuts: { key: string; action: string }[] }) => (
  <div className="space-y-2">
    <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400/80">{title}</h3>
    <div className="space-y-0">
      {shortcuts.map((s, i) => (
        <ShortcutRow key={i} shortcut={s} />
      ))}
    </div>
  </div>
);

export const ShortcutHelpOverlay = ({ open, onClose }: Props) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Panel */}
          {/* Panel Container - centered with flex */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-[850px] max-h-[85vh] bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-400/20">
                  <Keyboard className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
                  <p className="text-xs text-white/50">Press any shortcut to close this panel</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-[750px] mx-auto">
                {/* Left Column */}
                <div className="space-y-6">
                  <ShortcutSection title="🔑 Global Shortcuts" shortcuts={POS_SHORTCUTS.global} />
                  <ShortcutSection title="🛒 Product Navigation" shortcuts={POS_SHORTCUTS.products} />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <ShortcutSection title="🛍️ Cart Controls" shortcuts={POS_SHORTCUTS.cart} />
                  <ShortcutSection title="💳 Payment & Actions" shortcuts={POS_SHORTCUTS.payment} />
                </div>
              </div>

              {/* Tips */}
              <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <h4 className="text-sm font-semibold text-emerald-400 mb-2">💡 Pro Tips</h4>
                <ul className="text-xs text-white/70 space-y-1.5">
                  <li>• <strong className="text-yellow-300">F1</strong> instantly focuses search - start typing product name</li>
                  <li>• Navigate products with <strong className="text-yellow-300">arrows</strong>, press <strong className="text-yellow-300">Enter</strong> to add</li>
                  <li>• Use <strong className="text-yellow-300">+</strong> / <strong className="text-yellow-300">-</strong> in cart for ultra-fast quantity changes</li>
                  <li>• <strong className="text-yellow-300">F9</strong> opens payment - <strong className="text-yellow-300">Enter</strong> confirms</li>
                  <li>• Barcode scanners work automatically - just scan!</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 shrink-0 bg-black/30">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Press <KeyBadge>?</KeyBadge> anytime to toggle this help</span>
                <span>Press <KeyBadge>Esc</KeyBadge> to close</span>
              </div>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
