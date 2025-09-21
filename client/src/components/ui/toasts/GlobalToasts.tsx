import React from 'react';
import { useToastStore } from './toastService';

const kindStyles: Record<string, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  error: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-100'
};

export const GlobalToasts: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="fixed top-5 right-5 z-[2000] flex flex-col gap-3 w-80 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} role="alert" className={`pointer-events-auto relative overflow-hidden rounded-2xl p-4 border backdrop-blur shadow-lg group transition-all duration-300 ${kindStyles[t.type]}`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-xs">
              {t.type==='success' && '✅'}
              {t.type==='error' && '⛔'}
              {t.type==='warning' && '⚠️'}
              {t.type==='info' && 'ℹ️'}
            </div>
            <div className="flex-1 min-w-0">
              {t.title && <p className="text-sm font-semibold tracking-wide mb-0.5">{t.title}</p>}
              <p className="text-xs leading-snug opacity-90 break-words">{t.message}</p>
            </div>
            <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-white text-xs font-semibold px-1 -mr-1 rounded transition" aria-label="Dismiss">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GlobalToasts;
