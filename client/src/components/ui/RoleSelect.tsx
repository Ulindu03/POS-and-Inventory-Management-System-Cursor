import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, HandCoins, BarChart3, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Role = 'store_owner' | 'admin' | 'cashier' | 'sales_rep';

type Props = {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
};

export const RoleSelect: React.FC<Props> = ({ value, onChange, disabled }) => {
  const { t } = useTranslation();

  const options = useMemo(
    () => [
      {
        key: 'store_owner' as const,
        icon: <Crown className="w-4 h-4 text-yellow-300" />,
        label: t('users.role_store_owner') || 'Store Owner',
        desc: t('users.role_store_owner_desc') || 'Full access to all settings and data',
      },
      {
        key: 'cashier' as const,
        icon: <HandCoins className="w-4 h-4 text-emerald-300" />,
        label: t('users.role_cashier') || 'Cashier',
        desc: t('users.role_cashier_desc') || 'Perform sales and discounts with limited access',
      },
      {
        key: 'sales_rep' as const,
        icon: <BarChart3 className="w-4 h-4 text-sky-300" />,
        label: t('users.role_sales_rep') || 'Sales Rep',
        desc: t('users.role_sales_rep_desc') || 'Customer interactions and sales; no settings access',
      },
    ],
    [t]
  );

  const canonicalValue = String(value).toLowerCase() === 'admin' ? 'store_owner' : (value as Role);
  const selected = options.find((o) => o.key === canonicalValue) || options[0];

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useRef(`role-list-${Math.random().toString(36).slice(2)}`).current;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(options.findIndex((o) => o.key === selected.key));
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPosition({ top: r.bottom + 4, left: r.left, width: Math.max(220, r.width) });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(target)) setOpen(false);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(options.findIndex((o) => o.key === selected.key));
  }, [selected.key, options]);

  const onKeyDownButton: React.KeyboardEventHandler<HTMLButtonElement> = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
      setTimeout(updatePosition, 0);
    }
  };

  const onKeyDownList: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'Tab') { setOpen(false); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) { onChange(opt.key); setOpen(false); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`w-[220px] justify-between inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/10'} bg-white/5 border-white/10 text-white`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDownButton}
        title={t('users.role')}
      >
        <span className="inline-flex items-center gap-2">
          {selected.icon}
          <span>{selected.label}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-white/70" />
      </button>

      {open && position && createPortal(
        <div
          role="listbox"
          id={listboxId}
          aria-activedescendant={`${listboxId}-opt-${activeIndex}`}
          className="fixed z-[1000] rounded-lg border border-white/10 bg-[#151515]/95 backdrop-blur shadow-2xl overflow-hidden"
          style={{ top: position.top, left: position.left, width: position.width }}
          onKeyDown={onKeyDownList}
        >
          {options.map((opt, idx) => {
            const active = idx === activeIndex;
            const selectedNow = opt.key === selected.key;
            return (
              <div
                key={opt.key}
                id={`${listboxId}-opt-${idx}`}
                role="option"
                aria-selected={selectedNow}
                tabIndex={-1}
                className={`px-3 py-2 cursor-pointer select-none transition flex items-start gap-3 ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(opt.key); setOpen(false); }}
              >
                <div className="mt-0.5">{opt.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium leading-tight">{opt.label}</div>
                  <div className="text-xs text-white/70 leading-snug">{opt.desc}</div>
                </div>
                {selectedNow && (
                  <div className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 ml-2 self-center">{t('common.selected') || 'Selected'}</div>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};
