import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Package,
  Tag,
  User,
  FileText,
  Save,
  Loader2,
  Image as ImageIcon,
  Camera,
  Star,
  Trash2,
  Plus,
  Wand2,
  Lock,
} from '@/lib/safe-lucide-react';
import { productsApi, categoriesApi, type CategoryItem } from '@/lib/api/products.api';
import type { Supplier } from '@/lib/api/suppliers.api';
import { getSuppliers } from '@/lib/api/suppliers.api';
import { proxyImage } from '@/lib/proxyImage';
import { formatLKR } from '@/lib/utils/currency';

type WarrantyUnit = 'days' | 'months' | 'years';

type ImageItem = { url: string; alt?: string; isPrimary?: boolean };

type FormDataType = {
  _id?: string;
  sku: string;
  name: { en: string; si?: string };
  category: string;
  brand: string;
  supplier: string;
  price: { cost: number; retail: number; wholesale?: number };
  stock: { current: number };
  minimumStock: number;
  reorderPoint: number;
  unit: string;
  images: ImageItem[];
  warranty?: {
    enabled?: boolean;
    periodDays?: number;
    type?: string;
    requiresSerial?: boolean;
    coverage?: string[];
    exclusions?: string[];
  };
};

type ProductFormProps = {
  product?: Partial<FormDataType> & { _id?: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const MAX_IMAGES = 10;
const SKU_MIN_LENGTH = 12;
const SKU_MAX_LENGTH = 24;
const SKU_PATTERN = /^[A-Z]{3}-[A-Z]{2,3}-[A-Z0-9]{2,4}(?:-[A-Z0-9]{2,4})?-\d{3,}$/;

function PriceInput({ id, label, value, onChange, required, invalid, invalidMessage, onBlur, placeholder = '0.00', helper, hideLabel = false }: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
  invalid?: boolean;
  invalidMessage?: string;
  onBlur?: () => void;
  placeholder?: string;
  helper?: ReactNode;
  hideLabel?: boolean;
}) {
  return (
    <div>
      {!hideLabel && (
        <label htmlFor={id} className="block text-sm font-medium text-white mb-2">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <div className={`flex items-center rounded-xl border bg-white/5 backdrop-blur ${invalid ? 'border-rose-400' : 'border-white/20 hover:border-white/30 focus-within:border-white/40'} focus-within:ring-2 focus-within:ring-white/20`}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={value ?? 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onBlur={onBlur}
          className="w-full h-12 px-4 rounded-l-xl bg-transparent text-white placeholder-white/50 outline-none"
          placeholder={placeholder}
        />
        <span className="px-4 h-12 inline-flex items-center rounded-r-xl bg-white/10 border-l border-white/20 text-white/80 text-sm font-medium">LKR</span>
      </div>
      {invalid && <p className="mt-1 text-xs text-rose-400">{invalidMessage || `${label} is below cost.`}</p>}
      {helper ? (<div className="mt-1 text-xs">{helper}</div>) : null}
    </div>
  );
}

export function ProductForm({ product, isOpen, onClose, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Unit mapping for display names
  const getUnitDisplayName = (unit: string) => {
    const unitMap: Record<string, string> = {
      'pcs': 'Pieces',
      'kg': 'Kilograms', 
      'g': 'Grams',
      'm': 'Meters',
      'cm': 'Centimeters',
      'l': 'Liters',
      'ml': 'Milliliters',
      'box': 'Box',
      'pack': 'Pack',
      'pair': 'Pair',
      'set': 'Set',
      'roll': 'Roll',
      'bottle': 'Bottle',
      'sheet': 'Sheet'
    };
    return unitMap[unit] || unit;
  };

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [showBrandAdd, setShowBrandAdd] = useState(false);
  const [newBrand, setNewBrand] = useState('');

  const [formData, setFormData] = useState<FormDataType>({
    _id: product?._id,
    sku: product?.sku || '',
    name: { en: product?.name?.en || '' },
    category: product?.category || '',
    brand: (product as any)?.brand || '',
    supplier: (product as any)?.supplier || '',
    price: {
      cost: (product as any)?.price?.cost || 0,
      retail: (product as any)?.price?.retail || 0,
      wholesale: (product as any)?.price?.wholesale || 0,
    },
    stock: { current: (product as any)?.stock?.current || 0 },
    minimumStock: (product as any)?.minimumStock || 0,
    reorderPoint: (product as any)?.reorderPoint || 0,
    unit: (product as any)?.unit || 'pcs',
    images: (product as any)?.images || [],
    warranty: (product as any)?.warranty || { enabled: false, periodDays: 0, type: 'manufacturer', requiresSerial: false, coverage: [], exclusions: [] },
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageMsg, setImageMsg] = useState<string | null>(null);

  const costPrice = formData.price.cost || 0;
  const retailValue = formData.price.retail || 0;
  const wholesaleValue = formData.price.wholesale || 0;
  const retailProfit = costPrice > 0 && retailValue > 0 ? retailValue - costPrice : null;
  const wholesaleProfit = costPrice > 0 && wholesaleValue > 0 ? wholesaleValue - costPrice : null;

  const [barcodeMode, setBarcodeMode] = useState<'single' | 'unique'>('single');
  const [stickersQty, setStickersQty] = useState<number>(0);

  const [warrantyUnit, setWarrantyUnit] = useState<WarrantyUnit>('months');
  const [warrantyValue, setWarrantyValue] = useState<number>(0);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState<{ en: string; si: string; descEn?: string; descSi?: string }>({ en: '', si: '' });

  // Load categories and suppliers when opened
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const [catsRes, supsRes] = await Promise.all([
          categoriesApi.list(),
          getSuppliers({ page: 1, limit: 100, ...(formData.category ? { category: formData.category } : {}) }),
        ]);
        setCategories(catsRes.data.items);
        setSuppliers((supsRes as any).data?.items || (supsRes as any).data || []);
      } catch (e) {
        console.error('Failed to load lists', e);
      }
    })();
  }, [isOpen]);

  // When category changes, refresh suppliers and brand options
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        if (formData.category) {
          // Filter suppliers by category when possible
          const supsRes = await getSuppliers({ page: 1, limit: 100, category: formData.category });
          setSuppliers((supsRes as any).data?.items || (supsRes as any).data || []);
          // Load brand options from products list if available
          try {
            const listRes = await productsApi.list({ category: formData.category, limit: 100 } as any);
            const items: any[] = (listRes as any).data?.items || [];
            const brands = Array.from(new Set(items.map((p) => (p as any).brand).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
            setBrandOptions(brands);
          } catch {
            setBrandOptions([]);
          }
        } else {
          setBrandOptions([]);
        }
      } catch (e) {
        console.error('category change side-load failed', e);
      }
    })();
  }, [formData.category, isOpen]);

  // Sync warranty UI state from periodDays
  useEffect(() => {
    const days = formData.warranty?.periodDays || 0;
    if (!days) {
      setWarrantyUnit('months');
      setWarrantyValue(0);
      return;
    }
    // Prefer months if divisible by 30, else years if big enough
    if (days % 365 === 0) {
      setWarrantyUnit('years');
      setWarrantyValue(days / 365);
    } else if (days % 30 === 0) {
      setWarrantyUnit('months');
      setWarrantyValue(days / 30);
    } else {
      setWarrantyUnit('days');
      setWarrantyValue(days);
    }
  }, [formData.warranty?.periodDays]);

  const setWarrantyPeriod = (value: number, unit: WarrantyUnit) => {
    setWarrantyUnit(unit);
    setWarrantyValue(value);
    const days = unit === 'years' ? value * 365 : unit === 'months' ? value * 30 : value;
    setFormData((p) => ({ ...p, warranty: { ...(p.warranty || {}), periodDays: Math.max(0, Math.floor(days)) } }));
  };

  const costValue = formData.price.cost || 0;
  const submitText = product?._id ? 'Save Changes' : 'Create Product';

  const normalizeSku = (value: string, { allowTrailingDash = true }: { allowTrailingDash?: boolean } = {}) => {
    if (!value) return '';
    let normalized = value.toUpperCase().replace(/[^A-Z0-9-]/g, '-').replace(/--+/g, '-');
    normalized = normalized.replace(/^-+/, '');
    if (!allowTrailingDash) normalized = normalized.replace(/-+$/g, '');
    return normalized.slice(0, SKU_MAX_LENGTH);
  };

  const getSkuValidationError = (sku: string) => {
    if (!sku) return 'SKU is required.';
    if (sku.length < SKU_MIN_LENGTH || sku.length > SKU_MAX_LENGTH) {
      return `SKU must be between ${SKU_MIN_LENGTH} and ${SKU_MAX_LENGTH} characters.`;
    }
    if (!SKU_PATTERN.test(sku)) {
      return 'SKU must follow CAT-BRD-SPEC(-VAR optional)-### pattern.';
    }
    return null;
  };

  const evaluateSkuState = () => {
    const normalizedInitial = normalizeSku(product?.sku || '', { allowTrailingDash: true });
    const normalizedCurrent = normalizeSku(formData.sku || '', { allowTrailingDash: true });
    const skuChanged = normalizedCurrent !== normalizedInitial;
    const skuError = getSkuValidationError(formData.sku);
    const isEditing = Boolean(product?._id);
    return {
      skuError,
      skuChanged,
      isEditing,
      blockingError: Boolean(skuError && (!isEditing || skuChanged)),
      legacyAllowed: Boolean(isEditing && !skuChanged && skuError),
    };
  };

  const abbreviate = (text: string, length = 3) => {
    if (!text) return '';
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ');
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (!words.length) return '';

    let candidate = '';
    for (const word of words) {
      if (word.length >= length && !candidate) {
        candidate = word.slice(0, length);
        break;
      }
      candidate += word[0];
      if (candidate.length >= length) break;
    }

    if (candidate.length < length) {
      const fallback = words.join('');
      candidate = (candidate + fallback.slice(candidate.length)).slice(0, length);
    }

    return candidate.slice(0, length);
  };

  const deriveCategoryCode = () => {
    if (!formData.category) return 'GEN';
    const match = categories.find((cat) => cat._id === formData.category);
    const code = abbreviate(match?.name?.en || '', 3);
    return code.length === 3 ? code : (code + 'GEN').slice(0, 3);
  };

  const deriveBrandCode = () => {
    const primary = formData.brand || '';
    const fallbackWords = (formData.name.en || '').split(/\s+/).filter(Boolean);
    const fallback = fallbackWords.length > 1 ? fallbackWords[1] : fallbackWords[0] || '';
    const source = primary || fallback;
    let code = abbreviate(source, 3);
    if (code.length < 2) {
      const extra = abbreviate(fallback || primary || 'GEN', 3);
      code = (code + extra).slice(0, 3);
    }
    if (code.length < 2) code = 'GEN';
    return code.slice(0, 3);
  };

  const deriveSpecCode = () => {
    const nameTokens = (formData.name.en || '')
      .split(/[\s/]+/)
      .flatMap((token) => token.split('-'))
      .map((token) => token.toUpperCase().replace(/[^A-Z0-9]/g, ''))
      .filter(Boolean);

    let candidate = nameTokens.find((token) => /\d/.test(token));
    if (!candidate) {
      candidate = nameTokens[1] || nameTokens[0] || '';
    }
    if (!candidate) {
      candidate = abbreviate(formData.unit || 'STD', 3);
    }

    let normalized = candidate.replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (normalized.length < 2) {
      normalized = (normalized + '00').slice(0, 2);
    }
    return normalized;
  };

  const buildStandardSkuBase = (sequenceWidth = 3) => {
    const categoryCode = deriveCategoryCode();
    const brandCode = deriveBrandCode();
    let specCode = deriveSpecCode();
    const maxBaseLength = SKU_MAX_LENGTH - (sequenceWidth + 1);

    const compose = (spec: string) => normalizeSku([categoryCode, brandCode, spec].join('-'), { allowTrailingDash: false });
    let base = compose(specCode);

    while (base.length > maxBaseLength && specCode.length > 2) {
      specCode = specCode.slice(0, -1);
      base = compose(specCode);
    }

    if (base.length > maxBaseLength) {
      base = base.slice(0, maxBaseLength).replace(/-+$/g, '');
    }

    return base;
  };

  async function handleGenerateSku() {
    if (generatingSku) return;
    setGeneratingSku(true);
    try {
      const fetchExisting = async (prefix: string) => {
        const res = await productsApi.list({ q: prefix } as any);
        const items: any[] = (res as any).data?.items || [];
        return items
          .map((it) => String((it as any).sku || '').toUpperCase())
          .filter((sku) => sku.startsWith(prefix.toUpperCase()));
      };

      const calculateNextSequence = (prefix: string, candidates: string[]) => {
        const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escaped}-(\\d+)$`, 'i');
        const suffixes = candidates
          .map((sku) => {
            const match = sku.match(regex);
            if (match) return parseInt(match[1], 10);
            if (sku === prefix.toUpperCase()) return 0;
            return null;
          })
          .filter((n): n is number => typeof n === 'number' && !Number.isNaN(n));

        const maxSuffix = suffixes.length ? Math.max(...suffixes) : 0;
        const nextNumber = suffixes.length ? maxSuffix + 1 : 1;
        const width = Math.max(3, ...suffixes.map((n) => String(n).length), String(nextNumber).length);
        return { nextNumber, width };
      };

      let base = buildStandardSkuBase();
      let existing = await fetchExisting(base);
      let { nextNumber, width } = calculateNextSequence(base, existing);

      if (width > 3) {
        base = buildStandardSkuBase(width);
        existing = width > 3 ? await fetchExisting(base) : existing;
        ({ nextNumber, width } = calculateNextSequence(base, existing));
      }

      const sequence = String(nextNumber).padStart(width, '0');
      let sku = `${base}-${sequence}`;

      if (sku.length > SKU_MAX_LENGTH) {
        const allowedBaseLength = SKU_MAX_LENGTH - (width + 1);
        const [categoryCode, brandCode] = base.split('-');
        let specCode = base.split('-').slice(2).join('-');
        if (!specCode) {
          specCode = deriveSpecCode();
        }
        while (`${categoryCode}-${brandCode}-${specCode}`.length > allowedBaseLength && specCode.length > 2) {
          specCode = specCode.slice(0, -1);
        }
        const trimmedBase = normalizeSku(`${categoryCode}-${brandCode}-${specCode}`, { allowTrailingDash: false }).slice(0, allowedBaseLength).replace(/-+$/g, '');
        sku = `${trimmedBase}-${sequence}`;
      }

      setFormData((p) => ({ ...p, sku: normalizeSku(sku, { allowTrailingDash: false }) }));
    } catch (e) {
      console.error('generate sku failed', e);
    } finally {
      setGeneratingSku(false);
    }
  }

  async function handleImagesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_IMAGES - (formData.images?.length || 0));
    if (files.length === 0) return;
    setUploadingImages(true);
    try {
      const uploaded: ImageItem[] = [];
      for (const file of files) {
        const res = await productsApi.uploadImage(file);
        uploaded.push({ url: (res as any).data.url });
      }
      setFormData((p) => {
        const merged = [...(p.images || []), ...uploaded];
        if (!merged.some((i) => i.isPrimary) && merged.length > 0) merged[0].isPrimary = true;
        return { ...p, images: merged };
      });
      setImageMsg('Images uploaded');
    } catch (e) {
      console.error('upload images failed', e);
      setImageMsg('Image upload failed');
    } finally {
      setUploadingImages(false);
      setTimeout(() => setImageMsg(null), 2000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }
  function handleDropImages(e: DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    void handleImagesSelected(files);
  }

  // Reorder images via drag-and-drop
  const dragIndex = useRef<number | null>(null);
  const onImageDragStart = (idx: number) => (e: DragEvent) => {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };
  const onImageDragOver = (e: DragEvent) => {
    e.preventDefault();
  };
  const onImageDrop = (idx: number) => (e: DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === idx) return;
    setFormData((p) => {
      const arr = [...(p.images || [])];
      const [moved] = arr.splice(from, 1);
      arr.splice(idx, 0, moved);
      return { ...p, images: arr };
    });
  };

  function setPrimaryImage(idx: number) {
    setFormData((p) => ({
      ...p,
      images: (p.images || []).map((img, i) => ({ ...img, isPrimary: i === idx })),
    }));
  }
  function removeImage(idx: number) {
    setFormData((p) => {
      const next = [...(p.images || [])];
      const wasPrimary = next[idx]?.isPrimary;
      next.splice(idx, 1);
      if (wasPrimary && next.length > 0) next[0].isPrimary = true;
      return { ...p, images: next };
    });
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!formData.name.en) errs.push('name.en');
    const { blockingError } = evaluateSkuState();
    if (blockingError) errs.push('sku');
    if (!formData.category) errs.push('category');
    if ((formData.price.cost || 0) <= 0) errs.push('price.cost');
    if ((formData.price.retail || 0) <= 0) errs.push('price.retail');
    if ((formData.price.wholesale || 0) < 0) errs.push('price.wholesale');
    if ((formData.price.wholesale || 0) > 0 && (formData.price.wholesale || 0) < (formData.price.cost || 0)) {
      errs.push('price.wholesale');
    }
    if (errs.length) {
      setTouched((t) => ({ ...t, nameEn: true, sku: true, category: true, priceCost: true, priceRetail: true, priceWholesale: true }));
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...formData, category: formData.category || undefined } as any;
      if (!payload.name?.si) {
        payload.name = { ...payload.name, si: payload.name?.en || '' };
      }
      if (payload.price) {
        payload.price.cost = Number(payload.price.cost || 0);
        payload.price.retail = Number(payload.price.retail || 0);
        const wholesaleNumeric = Number(payload.price.wholesale || 0);
        if (wholesaleNumeric > 0) {
          payload.price.wholesale = wholesaleNumeric;
        } else {
          delete payload.price.wholesale;
        }
      }
      if (product?._id) {
        await productsApi.update(product._id, payload);
      } else {
        const res = await productsApi.create(payload);
        const created = (res as any)?.data?.product;
        if (barcodeMode === 'unique') {
          const qty = stickersQty || formData.stock.current || 0;
          if (qty > 0) {
            try {
              await productsApi.createStickerBatch({ productId: created?._id || (product as any)?._id, quantity: qty, mode: 'unique_per_unit' });
            } catch (err) {
              console.warn('Sticker batch creation failed', err);
            }
          }
        }
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      console.error('submit failed', e);
      alert('Failed to save product');
    } finally {
      setLoading(false);
    }
  }

  const skuState = evaluateSkuState();
  const skuError = skuState.skuError;
  const showSkuFeedback = touched.sku || submitAttempted;
  const shouldShowSkuError = showSkuFeedback && skuState.blockingError;
  const showLegacySkuNotice = showSkuFeedback && skuState.legacyAllowed;
  const skuAriaDescribedBy = shouldShowSkuError ? 'sku-error' : showLegacySkuNotice ? 'sku-warning' : undefined;
  const skuBorderClasses = shouldShowSkuError
    ? 'border-rose-400 hover:border-rose-300 focus:border-rose-300'
    : showLegacySkuNotice
      ? 'border-amber-400/70 hover:border-amber-300 focus:border-amber-300'
      : 'border-white/20 hover:border-white/30 focus:border-white/40';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/80" onClick={onClose} aria-label="Close product form" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-white/20" style={{ backgroundColor: '#252526' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 rounded-t-2xl" style={{ backgroundColor: '#252526' }}>
          <h2 className="text-xl font-semibold text-white">{product?._id ? 'Edit Product' : 'Add New Product'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 text-sm text-rose-400 font-medium flex items-center gap-2">
            <span className="text-rose-400 text-base">*</span> Required field
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-24">
              {/* LEFT: main details */}
              <div className="md:col-span-1 xl:col-span-2 space-y-8">
                {/* Basic Information */}
                <div className="rounded-2xl shadow-lg border border-white/10 p-6 md:p-8" style={{ backgroundColor: '#252526' }}>
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-300" /> Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name_en" className="block text-sm font-medium text-white mb-2">Product Name (English) <span className="text-rose-400">*</span></label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                        <input type="text" required id="name_en" value={formData.name.en} onChange={(e) => setFormData(prev => ({ ...prev, name: { ...prev.name, en: e.target.value } }))} onBlur={() => setTouched(t=>({ ...t, nameEn: true }))} aria-invalid={Boolean((touched.nameEn||submitAttempted) && !formData.name.en)} aria-describedby={(touched.nameEn||submitAttempted) && !formData.name.en ? 'name-en-error' : undefined} className={`w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 backdrop-blur text-white placeholder-white/50 border ${((touched.nameEn||submitAttempted) && !formData.name.en) ? 'border-rose-400' : 'border-white/20 hover:border-white/30 focus:border-white/40'} focus:outline-none focus:ring-2 focus:ring-white/20`} placeholder="Enter product name in English" />
                      </div>
                      {(touched.nameEn || submitAttempted) && !formData.name.en && (
                        <p id="name-en-error" className="mt-1 text-xs text-rose-400">Product name (English) is required.</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="sku" className="block text-sm font-medium text-white mb-2">SKU <span className="text-rose-400">*</span></label>
                      <div className="relative flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                          <input
                            type="text"
                            required
                            id="sku"
                            value={formData.sku}
                            onChange={(e) => {
                              const next = normalizeSku(e.target.value);
                              setFormData(prev => ({ ...prev, sku: next }));
                            }}
                            onBlur={() => {
                              setFormData(prev => ({ ...prev, sku: normalizeSku(prev.sku || '', { allowTrailingDash: false }) }));
                              setTouched(t => ({ ...t, sku: true }));
                            }}
                            aria-invalid={shouldShowSkuError}
                            aria-describedby={skuAriaDescribedBy}
                            className={`w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 backdrop-blur text-white placeholder-white/50 border ${skuBorderClasses} focus:outline-none focus:ring-2 focus:ring-white/20`}
                            placeholder="e.g., FAN-PAN-16W-001"
                            title="Follow CAT-BRD-SPEC-### format (optional variant before digits)"
                          />
                        </div>
                        <button type="button" onClick={handleGenerateSku} disabled={generatingSku} className="h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 transition-colors" title="Generate SKU using CAT-BRD-SPEC-### pattern">{generatingSku ? '...' : (<><Wand2 className="w-4 h-4" /> Generate</>)}</button>
                      </div>
                      {shouldShowSkuError && skuError && (
                        <p id="sku-error" className="mt-1 text-xs text-rose-400">{skuError}</p>
                      )}
                      {showLegacySkuNotice && skuError && (
                        <p id="sku-warning" className="mt-1 text-xs text-amber-300">
                          This product uses a legacy SKU format. You can keep it, but consider regenerating to adopt the CAT-BRD-SPEC-### pattern.
                        </p>
                      )}
                      <p className="text-xs text-white/70 mt-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-400/20">💡 Format: <span className="font-semibold text-white">CAT-BRD-SPEC-###</span> (e.g., <span className="text-white">FAN-PAN-16W-001</span>). Add an optional variant like <span className="text-white">-WHT</span> before the number when needed.</p>
                    </div>
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-white mb-2">Category <span className="text-rose-400">*</span></label>
                      <div className="relative flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                          <select required id="category" value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} onBlur={() => setTouched(t=>({ ...t, category: true }))} aria-invalid={Boolean((touched.category||submitAttempted) && !formData.category)} aria-describedby={(touched.category||submitAttempted) && !formData.category ? 'category-error' : undefined} className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 backdrop-blur text-white border border-white/20 hover:border-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" title="Select the category for this product">
                            <option value="" className="bg-slate-800 text-white">Select Category</option>
                            {categories.map(category => (<option key={category._id} value={category._id} className="bg-slate-800 text-white">{category.name.en}</option>))}
                          </select>
                        </div>
                        <button type="button" onClick={() => setShowCategoryModal(true)} className="h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 inline-flex items-center gap-2 transition-colors" title="Add category"><Plus className="w-4 h-4" /> New</button>
                      </div>
                      {(touched.category || submitAttempted) && !formData.category && (
                        <p id="category-error" className="mt-1 text-xs text-rose-400">Category is required.</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="brand" className="block text-sm font-medium text-white mb-2">Brand</label>
                      {brandOptions.length > 0 && !showBrandAdd ? (
                        <div className="relative flex gap-2">
                          <div className="relative flex-1">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                            <select id="brand" value={formData.brand} onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))} className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 backdrop-blur text-white border border-white/20 hover:border-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20">
                              <option value="" className="bg-gray-800 text-white">Select Brand</option>
                              {brandOptions.map((b) => (<option key={b} value={b} className="bg-gray-800 text-white">{b}</option>))}
                            </select>
                          </div>
                          <button type="button" onClick={() => { setShowBrandAdd(true); setNewBrand(''); }} className="h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 inline-flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" /> New</button>
                        </div>
                      ) : (
                        <div className="relative flex gap-2">
                          <div className="relative flex-1">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                            <input type="text" id="brand" value={showBrandAdd ? newBrand : formData.brand} onChange={(e) => showBrandAdd ? setNewBrand(e.target.value) : setFormData(prev => ({ ...prev, brand: e.target.value }))} className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 backdrop-blur text-white placeholder-white/50 border border-white/20 hover:border-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" placeholder="Brand name" />
                          </div>
                          <button type="button" onClick={() => { if (!showBrandAdd) { setShowBrandAdd(true); setNewBrand(''); return; } const v = newBrand.trim(); if (!v) { setShowBrandAdd(false); return; } setBrandOptions((opts) => Array.from(new Set([ ...opts, v ])).sort((a,b)=>a.localeCompare(b))); setFormData(prev => ({ ...prev, brand: v })); setShowBrandAdd(false); }} className="h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 inline-flex items-center gap-2 transition-colors">
                            {showBrandAdd ? 'Save' : (<><Plus className="w-4 h-4" /> New</>)}
                          </button>
                          {showBrandAdd && (<button type="button" onClick={() => { setShowBrandAdd(false); setNewBrand(''); }} className="h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors">Cancel</button>)}
                        </div>
                      )}
                    </div>
                    {/* Supplier */}
                    <div className="md:col-span-2">
                      <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2"><User className="w-4 h-4" /> Supplier</h3>
                      <div className="relative flex gap-2">
                        <div className="relative flex-1">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                          <select id="supplier" value={formData.supplier} onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))} className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 backdrop-blur text-white border border-white/20 hover:border-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20">
                            <option value="" className="bg-gray-800 text-white">Select Supplier</option>
                            {suppliers.map(supplier => (<option key={supplier._id} value={supplier._id} className="bg-gray-800 text-white">{supplier.name} ({supplier.supplierCode})</option>))}
                          </select>
                        </div>
                        <button type="button" onClick={() => window.open('/suppliers', '_blank')} className="h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 inline-flex items-center gap-2 transition-colors" title="Add supplier"><Plus className="w-4 h-4" /> New</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="rounded-2xl shadow-lg border border-white/10 p-6 md:p-8" style={{ backgroundColor: '#252526' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2"><Tag className="w-5 h-5 text-indigo-300" /> Pricing</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <PriceInput
                      id="price_cost"
                      label="Cost Price"
                      required
                      value={formData.price.cost}
                      onChange={(v) => setFormData((prev) => ({ ...prev, price: { ...prev.price, cost: v } }))}
                      onBlur={() => setTouched((t) => ({ ...t, priceCost: true }))}
                    />
                    <PriceInput
                      id="price_retail"
                      label=""
                      required
                      value={formData.price.retail}
                      onChange={(v) => setFormData((prev) => ({ ...prev, price: { ...prev.price, retail: v } }))}
                      onBlur={() => setTouched((t) => ({ ...t, priceRetail: true }))}
                      invalid={formData.price.retail > 0 && formData.price.retail < (formData.price.cost || 0)}
                      invalidMessage="Retail price is below cost."
                      helper={retailProfit !== null ? (
                        <span className={`font-medium ${retailProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          Profit: {formatLKR(retailProfit)}
                        </span>
                      ) : undefined}
                    />
                    <PriceInput
                      id="price_wholesale"
                      label=""
                      value={formData.price.wholesale || 0}
                      onChange={(v) => setFormData((prev) => ({ ...prev, price: { ...prev.price, wholesale: v } }))}
                      onBlur={() => setTouched((t) => ({ ...t, priceWholesale: true }))}
                      invalid={(formData.price.wholesale || 0) > 0 && (formData.price.wholesale || 0) < (formData.price.cost || 0)}
                      invalidMessage="Wholesale price is below cost."
                      helper={wholesaleProfit !== null ? (
                        <span className={`font-medium ${wholesaleProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          Profit: {formatLKR(wholesaleProfit)}
                        </span>
                      ) : undefined}
                    />
                  </div>
                  {(submitAttempted || touched.priceCost || touched.priceRetail) && (formData.price.cost <= 0 || formData.price.retail <= 0) && (
                    <p className="mt-2 text-xs text-rose-300">Cost and retail prices are required.</p>
                  )}
                  {(submitAttempted || touched.priceWholesale) && (formData.price.wholesale || 0) > 0 && (formData.price.wholesale || 0) < (formData.price.cost || 0) && (
                    <p className="mt-2 text-xs text-rose-300">Wholesale price must be above cost or leave it blank.</p>
                  )}
                </div>

                {/* Warranty */}
                <div className="rounded-2xl shadow-lg border border-white/10 p-6 md:p-8" style={{ backgroundColor: '#252526' }}>
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-indigo-300" /> 
                    Warranty
                  </h3>
                  <div className="space-y-6">
                    <label className="flex items-center gap-3 text-white cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={Boolean(formData.warranty?.enabled)} 
                        onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty||{}), enabled: e.target.checked } }))} 
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium">Enable Warranty for this product</span>
                    </label>
                    
                    {formData.warranty?.enabled && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="warranty_value" className="block text-sm font-medium text-white mb-2">Period</label>
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  id="warranty_value" 
                                  type="number" 
                                  min={0} 
                                  value={warrantyValue} 
                                  onChange={(e) => setWarrantyPeriod(parseInt(e.target.value)||0, warrantyUnit)} 
                                  className="h-12 px-4 rounded-xl bg-white/5 backdrop-blur border border-white/20 hover:border-white/30 focus:border-white/40 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 text-center" 
                                  placeholder="12" 
                                />
                                <select 
                                  id="warranty_unit" 
                                  value={warrantyUnit} 
                                  onChange={(e) => setWarrantyPeriod(warrantyValue, e.target.value as WarrantyUnit)} 
                                  className="h-12 px-3 rounded-xl bg-white/5 backdrop-blur border border-white/20 hover:border-white/30 focus:border-white/40 text-white focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
                                >
                                  <option value="days" className="bg-gray-800 text-white">Days</option>
                                  <option value="months" className="bg-gray-800 text-white">Months</option>
                                  <option value="years" className="bg-gray-800 text-white">Years</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label htmlFor="warranty_type" className="block text-sm font-medium text-white mb-2">Warranty Type</label>
                              <select 
                                id="warranty_type" 
                                value={formData.warranty?.type || 'manufacturer'} 
                                onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty||{}), type: e.target.value } }))} 
                                className="w-full h-12 px-4 rounded-xl bg-white/5 backdrop-blur border border-white/20 hover:border-white/30 focus:border-white/40 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                              >
                                <option value="manufacturer" className="bg-gray-800 text-white">Manufacturer</option>
                                <option value="extended" className="bg-gray-800 text-white">Extended</option>
                                <option value="lifetime" className="bg-gray-800 text-white">Lifetime</option>
                                <option value="none" className="bg-gray-800 text-white">None</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={Boolean(formData.warranty?.requiresSerial)} 
                            onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty||{}), requiresSerial: e.target.checked } }))} 
                            className="w-5 h-5 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-white font-medium">Requires Serial Activation</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="warranty_coverage" className="block text-sm font-medium text-white mb-2">Coverage (comma separated)</label>
                            <input 
                              id="warranty_coverage" 
                              type="text" 
                              value={(formData.warranty?.coverage||[]).join(', ')} 
                              onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty||{}), coverage: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) } }))} 
                              className="w-full h-12 px-4 rounded-xl bg-white/5 backdrop-blur border border-white/20 hover:border-white/30 focus:border-white/40 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20" 
                              placeholder="Battery, Speaker, etc." 
                            />
                          </div>
                          <div>
                            <label htmlFor="warranty_exclusions" className="block text-sm font-medium text-white mb-2">Exclusions (comma separated)</label>
                            <input 
                              id="warranty_exclusions" 
                              type="text" 
                              value={(formData.warranty?.exclusions||[]).join(', ')} 
                              onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...(prev.warranty||{}), exclusions: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) } }))} 
                              className="w-full h-12 px-4 rounded-xl bg-white/5 backdrop-blur border border-white/20 hover:border-white/30 focus:border-white/40 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20" 
                              placeholder="Physical damage, Liquid damage, etc." 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inventory */}
                <div className="rounded-2xl shadow-lg border border-white/10 p-6 md:p-8" style={{ backgroundColor: '#252526' }}>
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Package className="w-5 h-5 text-indigo-300" /> Inventory</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="flex flex-col">
                      <label htmlFor="stock_current" className="block text-sm font-medium text-white mb-2">Current Stock</label>
                      <input type="number" min={0} id="stock_current" value={formData.stock.current} onChange={(e) => setFormData(prev => ({ ...prev, stock: { ...prev.stock, current: parseInt(e.target.value) || 0 } }))} className="w-full h-12 px-3 rounded-xl bg-white/5 backdrop-blur text-white placeholder-white/50 border border-white/20 hover:border-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 text-center" placeholder="0" />
                    </div>
                    <div className="flex flex-col">
                      <label htmlFor="minimum_stock" className="block text-sm font-medium text-white mb-2">Minimum Stock</label>
                      <input type="number" min={0} id="minimum_stock" value={formData.minimumStock} onChange={(e) => setFormData(prev => ({ ...prev, minimumStock: parseInt(e.target.value) || 0 }))} className="w-full h-12 px-3 rounded-xl bg-white/5 backdrop-blur text-white placeholder-white/50 border border-white/20 hover:border-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 text-center" placeholder="0" />
                    </div>
                    <div className="flex flex-col">
                      <label htmlFor="reorder_point" className="block text-sm font-medium text-white mb-2">Reorder Point</label>
                      <input type="number" min={0} id="reorder_point" value={formData.reorderPoint} onChange={(e) => setFormData(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))} className="w-full h-12 px-3 rounded-xl bg-white/5 backdrop-blur text-white placeholder-white/50 border border-white/20 hover:border-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 text-center" placeholder="0" />
                    </div>
                    <div className="flex flex-col">
                      <label htmlFor="unit" className="block text-sm font-medium text-white mb-2">Unit</label>
                      <div className="relative">
                        <div className="w-full h-12 px-3 rounded-xl bg-white/5 backdrop-blur text-white border border-white/20 hover:border-white/30 focus-within:border-white/40 focus-within:ring-2 focus-within:ring-white/20 flex items-center justify-center cursor-pointer group">
                          <span className="text-center text-white text-sm font-medium truncate">
                            {getUnitDisplayName(formData.unit)}
                          </span>
                          <select 
                            id="unit" 
                            value={formData.unit} 
                            onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          >
                            <option value="pcs">Pieces</option>
                            <option value="kg">Kilograms</option>
                            <option value="g">Grams</option>
                            <option value="m">Meters</option>
                            <option value="cm">Centimeters</option>
                            <option value="l">Liters</option>
                            <option value="ml">Milliliters</option>
                            <option value="box">Box</option>
                            <option value="pack">Pack</option>
                            <option value="pair">Pair</option>
                            <option value="set">Set</option>
                            <option value="roll">Roll</option>
                            <option value="bottle">Bottle</option>
                            <option value="sheet">Sheet</option>
                          </select>
                          <div className="pointer-events-none">
                            <svg className="h-4 w-4 text-white/60 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {!product && (
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      <div className="text-sm text-white">Generate Barcodes:</div>
                      <div className="flex flex-col gap-2 text-white">
                        <label className="inline-flex items-center gap-2">
                          <input type="radio" name="barcodeMode" value="single" checked={barcodeMode==='single'} onChange={() => setBarcodeMode('single')} />
                          <span>Single barcode for all units (faster)</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="radio" name="barcodeMode" value="unique" checked={barcodeMode==='unique'} onChange={() => setBarcodeMode('unique')} />
                          <span>Unique barcode per unit (tracking)</span>
                        </label>
                      </div>
                      {barcodeMode === 'unique' && (
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label htmlFor="stickers_qty" className="block text-sm font-medium text-white mb-2">Quantity to barcode</label>
                            <input type="number" id="stickers_qty" min={0} value={stickersQty || formData.stock.current} onChange={(e) => setStickersQty(parseInt(e.target.value) || 0)} className="w-full h-12 px-4 rounded-xl bg-white/5 backdrop-blur text-white placeholder-white/50 border border-white/20 hover:border-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20" placeholder="e.g. 24" />
                            <p className="text-xs text-white/70 mt-1">Per-unit barcodes enable individual item tracking but take longer to generate.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: media & others */}
              <div className="md:col-span-1 space-y-8">
                {/* Images */}
                <div className="rounded-2xl shadow-lg border border-white/10 p-6 md:p-8" style={{ backgroundColor: '#252526' }}>
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-indigo-300" /> 
                    Product Images
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label htmlFor="product_images" className="block text-sm font-medium text-white mb-2">Upload Images</label>
                      {imageMsg && <p className="text-xs text-emerald-300 mb-1">{imageMsg}</p>}
                      <input
                        ref={fileInputRef}
                        id="product_images"
                        type="file"
                        multiple
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleImagesSelected(e.target.files)}
                        className="hidden"
                      />
                      <div
                        onDragOver={handleDragOver}
                        onDrop={handleDropImages}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-xl border-2 border-dashed border-white/20 bg-white/5 backdrop-blur hover:bg-white/10 transition-all cursor-pointer px-6 py-8 flex flex-col items-center justify-center text-center"
                      >
                        <Camera className="w-8 h-8 text-white/60 mb-3" />
                        <p className="text-sm text-white font-medium">Click to upload or drag & drop</p>
                        <p className="text-xs text-white/60 mt-1">PNG, JPG, or WebP files • Max 5MB each</p>
                      </div>
                      {uploadingImages && (<p className="text-xs text-white/60 mt-2">Uploading...</p>)}
                    </div>

                    {formData.images && formData.images.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-white/70">
                          <span>{formData.images.length}/{MAX_IMAGES} images</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {formData.images.map((img, idx) => (
                            <div
                              key={img.url || `img-${idx}`}
                              className="relative rounded-xl overflow-hidden border border-white/20 bg-black/30 group w-24 h-24 shadow-sm"
                              draggable
                              onDragStart={onImageDragStart(idx)}
                              onDragOver={onImageDragOver}
                              onDrop={onImageDrop(idx)}
                            >
                              <img
                                src={proxyImage(img.url)}
                                alt={img.alt || `Image ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-1 left-1">
                                <button
                                  type="button"
                                  onClick={() => setPrimaryImage(idx)}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                                    img.isPrimary
                                      ? 'bg-yellow-400 text-black border-yellow-300'
                                      : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
                                  }`}
                                  title={img.isPrimary ? 'Primary image' : 'Make primary'}
                                >
                                  <Star className={`w-3 h-3 ${img.isPrimary ? 'fill-black' : 'fill-transparent'}`} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black/80 text-white border border-white/20"
                                title="Remove image"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions - sticky footer */}
            <div className="sticky bottom-0 -mx-6 mt-8 px-6 py-4 border-t border-white/20 flex items-center justify-end gap-4 rounded-b-2xl" style={{ backgroundColor: '#252526' }}>
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#FACC15,#F59E0B)', color: '#000' }}>
                {loading ? (<Loader2 className="w-5 h-5 animate-spin" />) : (<Save className="w-5 h-5" />)}
                {submitText}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
      {/* Close center container */}

      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowCategoryModal(false)}
            aria-label="Close category modal"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 backdrop-blur-xl p-5" style={{ backgroundColor: '#252526' }}>
            <h3 className="text-lg font-semibold text-white mb-4">Add Category</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="new-cat-en" className="block text-sm font-medium text-white mb-2">Name (English) *</label>
                <input
                  id="new-cat-en"
                  value={newCategory.en}
                  onChange={(e) => setNewCategory((p) => ({ ...p, en: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/30"
                  placeholder="Category name"
                />
              </div>
              <div>
                <label htmlFor="new-cat-si" className="block text-sm font-medium text-white mb-2">Name (Sinhala) *</label>
                <input
                  id="new-cat-si"
                  value={newCategory.si}
                  onChange={(e) => setNewCategory((p) => ({ ...p, si: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/30"
                  placeholder="වර්ග නාමය"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-yellow-300 text-black hover:bg-yellow-400 transition-colors"
                  onClick={async () => {
                    if (!newCategory.en || !newCategory.si) return;
                    try {
                      const res = await categoriesApi.create({
                        name: { en: newCategory.en, si: newCategory.si },
                        description: { en: newCategory.descEn || '', si: newCategory.descSi || '' },
                      });
                      const cat = (res as any)?.data?.category;
                      // refresh categories and select the new one
                      const list = await categoriesApi.list();
                      setCategories(list.data.items as any);
                      if (cat?._id) {
                        setFormData((prev) => ({ ...prev, category: cat._id }));
                      }
                      setShowCategoryModal(false);
                    } catch (e) {
                      console.error('Create category failed', e);
                      alert('Failed to create category');
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductForm;
