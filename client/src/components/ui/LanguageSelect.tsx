import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type Lang = 'en' | 'si';

interface Props { value: Lang; onChange:(lang:Lang)=>void; disabled?: boolean; }

// Accessible custom language picker similar to RoleSelect
export const LanguageSelect: React.FC<Props> = ({ value, onChange, disabled }) => {
  const { t, i18n } = useTranslation();
  const options = useMemo(()=>[
  { key: 'en' as const, icon: <Globe className="w-4 h-4 text-amber-300"/>, label: 'English', desc: t('users.lang_en_desc') || 'English interface' },
  { key: 'si' as const, icon: <Globe className="w-4 h-4 text-emerald-300"/>, label: 'සිංහල', desc: t('users.lang_si_desc') || 'සිංහල අතුරුමුහුණත' },
  ],[t]);

  const selected = options.find(o=>o.key===value) || options[0];

  const btnRef = useRef<HTMLButtonElement|null>(null);
  const listboxId = useRef(`lang-list-${Math.random().toString(36).slice(2)}`).current;
  const [open,setOpen] = useState(false);
  const [activeIndex,setActiveIndex] = useState(options.findIndex(o=>o.key===selected.key));
  const [pos,setPos] = useState<{top:number;left:number;width:number}|null>(null);
  const updatePos = () => { const el=btnRef.current; if(!el) return; const r=el.getBoundingClientRect(); setPos({top:r.bottom+4,left:r.left,width:Math.max(200,r.width)}); };

  useEffect(()=>{ if(!open) return; updatePos(); const onScroll=()=>updatePos(); const onResize=()=>updatePos(); const onClick=(e:MouseEvent)=>{ if(btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);};
    window.addEventListener('scroll',onScroll,true); window.addEventListener('resize',onResize); document.addEventListener('mousedown',onClick); return ()=>{ window.removeEventListener('scroll',onScroll,true); window.removeEventListener('resize',onResize); document.removeEventListener('mousedown',onClick);}; },[open]);

  useEffect(()=>{ setActiveIndex(options.findIndex(o=>o.key===selected.key)); },[selected.key, options]);

  const onKeyDownBtn: React.KeyboardEventHandler<HTMLButtonElement> = (e) => {
    if(disabled) return; if(['ArrowDown','Enter',' '].includes(e.key)){ e.preventDefault(); setOpen(true); setTimeout(updatePos,0);} };
  const onKeyDownList: React.KeyboardEventHandler<HTMLDivElement> = (e) => { if(!open) return; if(e.key==='Escape'){e.preventDefault(); setOpen(false); return;} if(e.key==='Tab'){ setOpen(false); return;} if(e.key==='Enter'){ e.preventDefault(); const opt=options[activeIndex]; if(opt){ onChange(opt.key); setOpen(false); } return;} if(e.key==='ArrowDown'){ e.preventDefault(); setActiveIndex(i=>(i+1)%options.length);} else if(e.key==='ArrowUp'){ e.preventDefault(); setActiveIndex(i=>(i-1+options.length)%options.length);} else if(e.key==='Home'){ e.preventDefault(); setActiveIndex(0);} else if(e.key==='End'){ e.preventDefault(); setActiveIndex(options.length-1);} };

  return <>
    <button ref={btnRef} type="button" className={`w-[220px] justify-between inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition ${disabled? 'opacity-60 cursor-not-allowed':'hover:bg-white/10'} bg-white/5 border-white/10 text-white`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open? listboxId: undefined} onClick={()=>!disabled && setOpen(v=>!v)} onKeyDown={onKeyDownBtn} title={t('users.language')||'Language'}>
      <span className="inline-flex items-center gap-2">{selected.icon}<span>{selected.label}</span></span>
      <ChevronDown className="w-4 h-4 text-white/70" />
    </button>
    {open && pos && createPortal(
      <div role="listbox" id={listboxId} aria-activedescendant={`${listboxId}-opt-${activeIndex}`} className="fixed z-[1000] rounded-lg border border-white/10 bg-[#151515]/95 backdrop-blur shadow-2xl overflow-hidden" style={{top:pos.top,left:pos.left,width:pos.width}} onKeyDown={onKeyDownList}>
        {options.map((opt,idx)=>{ const active= idx===activeIndex; const selectedNow = opt.key===selected.key; return <div key={opt.key} id={`${listboxId}-opt-${idx}`} role="option" aria-selected={selectedNow} tabIndex={-1} className={`px-3 py-2 cursor-pointer select-none transition flex items-start gap-3 ${active? 'bg-white/10':'hover:bg-white/5'}`} onMouseEnter={()=>setActiveIndex(idx)} onMouseDown={(e)=> e.preventDefault()} onClick={()=> { onChange(opt.key); setOpen(false); i18n.changeLanguage(opt.key); }}>
          <div className="mt-0.5">{opt.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white font-medium leading-tight">{opt.label}</div>
            <div className="text-xs text-white/70 leading-snug">{opt.desc}</div>
          </div>
          {selectedNow && <div className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 ml-2 self-center">{t('common.selected') || 'Selected'}</div>}
        </div>; })}
      </div>, document.body)}
  </>;
};

export default LanguageSelect;
