import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, format, isBefore, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BadgePercent,
  Ban,
  CalendarClock,
  Clock,
  Loader2,
  NotebookPen,
  RefreshCcw,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from '@/lib/safe-lucide-react';
import {
  ProductDiscountInfo,
  ProductListItem,
  ProductPricingSummary,
  DiscountStatus,
  productsApi,
} from '@/lib/api/products.api';
import { formatLKR } from '@/lib/utils/currency';
import { proxyImage } from '@/lib/proxyImage';
import { FormModal } from '@/components/ui/FormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface DiscountManagerProps {
  canManage: boolean;
}

type DiscountSummaryMetrics = {
  totalDiscountedProducts: number;
  activeDiscounts: number;
  totalDiscountValue: number;
  expiringSoon: number;
};

type StatusFilter = 'all' | 'with-discount' | 'without-discount' | DiscountStatus;

interface DiscountFormState {
  type: 'percentage' | 'fixed';
  value: number;
  startAt: string;
  endAt: string;
  notes: string;
  isEnabled: boolean;
}

const STATUS_STYLES: Record<DiscountStatus | 'with-discount' | 'without-discount', { label: string; badge: string; dot: string }> = {
  active: {
    label: 'Active now',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40',
    dot: 'bg-emerald-400',
  },
  scheduled: {
    label: 'Scheduled',
    badge: 'bg-sky-500/20 text-sky-300 border border-sky-400/30',
    dot: 'bg-sky-400',
  },
  expired: {
    label: 'Expired',
    badge: 'bg-rose-500/20 text-rose-300 border border-rose-400/30',
    dot: 'bg-rose-400',
  },
  disabled: {
    label: 'Disabled',
    badge: 'bg-amber-500/15 text-amber-200 border border-amber-300/30',
    dot: 'bg-amber-300',
  },
  none: {
    label: 'No discount',
    badge: 'bg-white/5 text-white/70 border border-white/10',
    dot: 'bg-white/40',
  },
  'with-discount': {
    label: 'All discounted',
    badge: 'bg-purple-500/20 text-purple-200 border border-purple-400/30',
    dot: 'bg-purple-400',
  },
  'without-discount': {
    label: 'No discounts',
    badge: 'bg-white/5 text-white/70 border border-white/10',
    dot: 'bg-white/40',
  },
};

const formatDateTimeForInput = (value: string | null | undefined) => {
  if (!value) return '';
  try {
    const date = typeof value === 'string' ? parseISO(value) : new Date(value);
    return format(date, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.error('Failed to format datetime input:', error);
    return '';
  }
};

const formatDateTimeForDisplay = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    const date = typeof value === 'string' ? parseISO(value) : new Date(value);
    return format(date, 'dd MMM yyyy, HH:mm');
  } catch (error) {
    console.error('Failed to format datetime display:', error);
    return value ?? '—';
  }
};

const TIME_HOURS_12 = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const TIME_MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));
const MERIDIEMS = ['AM', 'PM'] as const;

type DateTimeParts = {
  date: string;
  hour: string;
  minute: string;
  meridiem: (typeof MERIDIEMS)[number];
};

const parseDateTimeParts = (value: string | null | undefined): DateTimeParts => {
  if (!value) {
    return { date: '', hour: '09', minute: '00', meridiem: 'AM' };
  }
  try {
    const date = parseISO(value);
    const formattedDate = format(date, 'yyyy-MM-dd');
    const hour24 = Number(format(date, 'HH'));
    const minute = format(date, 'mm');
    const meridiem: DateTimeParts['meridiem'] = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return {
      date: formattedDate,
      hour: String(hour12).padStart(2, '0'),
      minute,
      meridiem,
    };
  } catch (error) {
    console.error('Failed to parse datetime parts:', error);
    return { date: '', hour: '09', minute: '00', meridiem: 'AM' };
  }
};

const buildDateTimeValue = (parts: DateTimeParts): string => {
  if (!parts.date) {
    return '';
  }
  const rawHour = Number(parts.hour);
  const normalizedHour = Number.isFinite(rawHour) ? rawHour : 0;
  const hour12 = ((normalizedHour - 1 + 12) % 12) + 1; // ensure 1-12 range
  const hour24 = parts.meridiem === 'PM' ? (hour12 % 12) + 12 : hour12 % 12;
  const hour = String(hour24).padStart(2, '0');
  return `${parts.date}T${hour}:${parts.minute}`;
};

const buildDefaultFormState = (): DiscountFormState => {
  const now = new Date();
  const start = format(now, "yyyy-MM-dd'T'HH:mm");
  const end = format(addDays(now, 7), "yyyy-MM-dd'T'HH:mm");
  return {
    type: 'percentage',
    value: 10,
    startAt: start,
    endAt: end,
    notes: '',
    isEnabled: true,
  };
};

export const DiscountManager: React.FC<DiscountManagerProps> = ({ canManage }) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<DiscountSummaryMetrics | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [formState, setFormState] = useState<DiscountFormState>(buildDefaultFormState);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingProduct, setRemovingProduct] = useState<ProductListItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const startParts = useMemo(() => parseDateTimeParts(formState.startAt), [formState.startAt]);
  const endParts = useMemo(() => parseDateTimeParts(formState.endAt), [formState.endAt]);

  const handleDateTimeChange = useCallback(
    (field: 'startAt' | 'endAt', part: keyof DateTimeParts, newValue: string) => {
      setFormState((prev) => {
        const currentParts = parseDateTimeParts(prev[field]);
        const nextParts = { ...currentParts, [part]: newValue } as DateTimeParts;
        const isoValue = buildDateTimeValue(nextParts);
        return { ...prev, [field]: isoValue };
      });
    },
    []
  );

  const refreshMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await productsApi.discountSummary();
      setMetrics(res.data);
    } catch (error) {
      console.error('Failed to load discount metrics:', error);
      toast.error(t('discounts.loadSummaryError', 'Could not load discount overview.'));
    } finally {
      setLoadingMetrics(false);
    }
  }, [t]);

  const refreshProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await productsApi.list({ limit: 200, page: 1 });
      const items = res?.data?.items ?? [];
      setProducts(items);
    } catch (error) {
      console.error('Failed to load discounted products:', error);
      toast.error(t('discounts.loadProductsError', 'Unable to load products right now.'));
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [t]);

  useEffect(() => {
    refreshMetrics();
    refreshProducts();
    const handler = () => {
      refreshMetrics();
      refreshProducts();
    };
    window.addEventListener('vz-products-refresh', handler);
    return () => window.removeEventListener('vz-products-refresh', handler);
  }, [refreshMetrics, refreshProducts]);

  const handleOpenModal = useCallback(async (product: ProductListItem) => {
    if (!canManage) return;
    try {
      const res = await productsApi.getById(product._id);
      const current = res.data.product;
      const discount = current.discount as ProductDiscountInfo | null;
      setSelectedProduct(current);
      setFormState(() => {
        if (discount) {
          return {
            type: discount.type,
            value: discount.value,
            startAt: formatDateTimeForInput(discount.startAt),
            endAt: formatDateTimeForInput(discount.endAt),
            notes: discount.notes ?? '',
            isEnabled: discount.isEnabled,
          };
        }
        return buildDefaultFormState();
      });
      setModalOpen(true);
    } catch (error) {
      console.error('Failed to load product details:', error);
      toast.error(t('discounts.loadProductError', 'Unable to open discount details right now.'));
    }
  }, [canManage, t]);

  const closeModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
    setFormState(buildDefaultFormState());
  };

  const handlePresetRange = (days: number) => {
    setFormState((prev) => {
      const startDate = prev.startAt ? new Date(prev.startAt) : new Date();
      const start = format(startDate, "yyyy-MM-dd'T'HH:mm");
      const end = format(addDays(startDate, days), "yyyy-MM-dd'T'HH:mm");
      return { ...prev, startAt: start, endAt: end };
    });
  };

  const computedProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const list = products.filter((product) => {
      const matchesSearch = !query
        || product.name?.en?.toLowerCase().includes(query)
        || product.sku?.toLowerCase().includes(query)
        || (product.barcode?.toLowerCase().includes(query) ?? false);

      if (!matchesSearch) return false;

      const status = product.discount?.status ?? 'none';
      if (statusFilter === 'all') return true;
      if (statusFilter === 'with-discount') {
        return product.discount?.isEnabled && product.discount.status !== 'none';
      }
      if (statusFilter === 'without-discount') {
        return !product.discount || product.discount.status === 'none';
      }
      return status === statusFilter;
    });

    return list.sort((a, b) => {
      const statusA = a.discount?.status === 'active' ? 0 : a.discount?.status === 'scheduled' ? 1 : 2;
      const statusB = b.discount?.status === 'active' ? 0 : b.discount?.status === 'scheduled' ? 1 : 2;
      return statusA - statusB;
    });
  }, [products, searchTerm, statusFilter]);

  const validateForm = (): boolean => {
    if (!selectedProduct) return false;
    const { value, type, startAt, endAt } = formState;

    if (!value || Number.isNaN(value) || value <= 0) {
      toast.error(t('discounts.validation.valuePositive', 'Discount value must be greater than zero.'));
      return false;
    }

    if (type === 'percentage' && value > 90) {
      toast.error(t('discounts.validation.percentageLimit', 'Percentage discounts cannot exceed 90%.'));
      return false;
    }

    if (!startAt || !endAt) {
      toast.error(t('discounts.validation.scheduleRequired', 'Start and end dates are required.'));
      return false;
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      toast.error(t('discounts.validation.scheduleInvalid', 'Please provide valid start and end dates.'));
      return false;
    }

    if (!isBefore(start, end)) {
      toast.error(t('discounts.validation.scheduleOrder', 'End date must be after start date.'));
      return false;
    }

    const now = new Date();
    if (start.getTime() < now.getTime() - 1000 * 60) {
      toast.warning(t('discounts.validation.startPast', 'The start time is in the past.')); // warning but allow continue
    }

    return true;
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        type: formState.type,
        value: formState.value,
        startAt: new Date(formState.startAt).toISOString(),
        endAt: new Date(formState.endAt).toISOString(),
        notes: formState.notes?.trim() || undefined,
        isEnabled: formState.isEnabled,
      };
      const res = await productsApi.upsertDiscount(selectedProduct._id, payload);
      const updatedDiscount = res.data.discount;
      const updatedPricing = res.data.pricing;

      setProducts((prev) => prev.map((item) => {
        if (item._id === selectedProduct._id) {
          return {
            ...item,
            discount: updatedDiscount,
            pricing: updatedPricing,
          };
        }
        return item;
      }));

      toast.success(t('discounts.saveSuccess', 'Discount saved successfully.'));
      closeModal();
      refreshMetrics();
      window.dispatchEvent(new Event('vz-products-refresh'));
    } catch (error) {
      console.error('Failed to save discount:', error);
      toast.error(t('discounts.saveError', 'Failed to save discount. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDiscount = async () => {
    if (!removingProduct) return;
    setRemoving(true);
    try {
      await productsApi.removeDiscount(removingProduct._id);
      setProducts((prev) => prev.map((item) => {
        if (item._id === removingProduct._id) {
          const clone: ProductListItem = {
            ...item,
            discount: null,
            pricing: item.pricing ? ({
              ...item.pricing,
              discountAmount: 0,
              final: item.pricing.base,
              hasActiveDiscount: false,
              status: 'none',
            } satisfies ProductPricingSummary) : item.pricing,
          };
          return clone;
        }
        return item;
      }));

      toast.success(t('discounts.removeSuccess', 'Discount removed.'));
      setRemovingProduct(null);
      refreshMetrics();
      window.dispatchEvent(new Event('vz-products-refresh'));
    } catch (error) {
      console.error('Failed to remove discount:', error);
      toast.error(t('discounts.removeError', 'Unable to remove discount right now.'));
    } finally {
      setRemoving(false);
    }
  };

  const renderStatusBadge = (status: DiscountStatus) => {
    const config = STATUS_STYLES[status];
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${config.badge}`}>
        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
        {t(`discounts.status.${status}`, config.label)}
      </span>
    );
  };

  const statusFilters: { id: StatusFilter; label: string; icon: ReactNode }[] = [
    { id: 'all', label: t('discounts.filters.all', 'All'), icon: <RefreshCcw className="w-4 h-4" /> },
    { id: 'active', label: t('discounts.filters.active', 'Active'), icon: <Sparkles className="w-4 h-4" /> },
    { id: 'scheduled', label: t('discounts.filters.scheduled', 'Scheduled'), icon: <CalendarClock className="w-4 h-4" /> },
    { id: 'expired', label: t('discounts.filters.expired', 'Expired'), icon: <Clock className="w-4 h-4" /> },
    { id: 'with-discount', label: t('discounts.filters.with', 'With discount'), icon: <BadgePercent className="w-4 h-4" /> },
    { id: 'without-discount', label: t('discounts.filters.without', 'No discount'), icon: <Ban className="w-4 h-4" /> },
  ];

  const summaryCards = [
    {
      title: t('discounts.metrics.totalDiscounted', 'Products on discount'),
      value: metrics?.totalDiscountedProducts ?? 0,
      icon: <BadgePercent className="w-6 h-6 text-purple-300" />,
      accent: 'from-purple-500/25 to-purple-400/15 border-purple-400/30',
    },
    {
      title: t('discounts.metrics.active', 'Active right now'),
      value: metrics?.activeDiscounts ?? 0,
      icon: <Sparkles className="w-6 h-6 text-emerald-300" />,
      accent: 'from-emerald-500/25 to-emerald-400/15 border-emerald-400/30',
    },
    {
      title: t('discounts.metrics.totalValue', 'Total discount value (est.)'),
      value: metrics ? formatLKR(metrics.totalDiscountValue) : 'LKR 0.00',
      icon: <NotebookPen className="w-6 h-6 text-sky-300" />,
      accent: 'from-sky-500/25 to-sky-400/15 border-sky-400/30',
    },
    {
      title: t('discounts.metrics.expiringSoon', 'Expiring within 3 days'),
      value: metrics?.expiringSoon ?? 0,
      icon: <AlertTriangle className="w-6 h-6 text-amber-300" />,
      accent: 'from-amber-500/25 to-amber-400/15 border-amber-400/30',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`rounded-2xl border bg-white/5 backdrop-blur-md p-5 flex items-center gap-4 border-white/10 ${card.accent}`}
          >
            <div className="p-3 rounded-xl bg-white/10">{card.icon}</div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">{card.title}</p>
              <p className="text-2xl font-semibold text-white mt-1">
                {loadingMetrics ? <Loader2 className="w-6 h-6 animate-spin text-white/60" /> : card.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('discounts.searchPlaceholder', 'Search products by name, SKU or barcode...')}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-white/50"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                <Sparkles className="w-4 h-4" />
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const active = statusFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setStatusFilter(filter.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'border-purple-400/50 bg-purple-500/20 text-white shadow-[0_6px_20px_rgba(147,51,234,0.15)]'
                      : 'border-white/10 text-white/70 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  {filter.icon}
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="min-w-full divide-y divide-white/5 text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-xs uppercase tracking-wider text-white/60">
                <th className="px-6 py-3">{t('discounts.table.product', 'Product')}</th>
                <th className="px-6 py-3">{t('discounts.table.discount', 'Discount')}</th>
                <th className="px-6 py-3">{t('discounts.table.schedule', 'Schedule')}</th>
                <th className="px-6 py-3">{t('discounts.table.pricing', 'Pricing')}</th>
                <th className="px-6 py-3">{t('discounts.table.status', 'Status')}</th>
                <th className="pl-4 pr-10 py-3 text-right min-w-[9rem]">{t('discounts.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loadingProducts ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-white/10" />
                        <div>
                          <div className="h-4 w-32 rounded bg-white/10 mb-2" />
                          <div className="h-3 w-20 rounded bg-white/10" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 rounded bg-white/10 mb-2" />
                      <div className="h-3 w-16 rounded bg-white/10" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-28 rounded bg-white/10" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 rounded bg-white/10" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-16 rounded bg-white/10" />
                    </td>
                    <td className="pl-4 pr-10 py-4 text-right min-w-[9rem]">
                      <div className="inline-flex h-9 w-24 rounded-full bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : computedProducts.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-white/60">
                    {t('discounts.emptyState', 'No products match your filters. Try adjusting the filters or search term.')}
                  </td>
                </tr>
              ) : (
                computedProducts.map((product) => {
                  const discount = product.discount as ProductDiscountInfo | null;
                  const pricing = product.pricing as ProductPricingSummary | undefined;
                  const status = discount?.status ?? 'none';
                  const hasDiscount = !!discount && discount.isEnabled && discount.status !== 'none';
                  const primaryImage = product.images?.find((image) => image.isPrimary)?.url || product.images?.[0]?.url;

                  return (
                    <motion.tr
                      key={product._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-white/80 hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                            {primaryImage ? (
                              <img
                                src={proxyImage(primaryImage)}
                                alt={product.name?.en ?? 'Product'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <BadgePercent className="w-5 h-5 text-white/40" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{product.name?.en ?? 'Unnamed product'}</p>
                            <p className="text-xs text-white/50">
                              SKU: {product.sku}{' '}
                              {product.barcode ? `• ${product.barcode}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {hasDiscount ? (
                          <div className="space-y-1">
                            <p className="font-medium text-white">
                              {discount.type === 'percentage'
                                ? `${discount.value}% off`
                                : `${formatLKR(discount.value)} off`}
                            </p>
                            <p className="text-xs text-white/50">
                              {discount.notes ? discount.notes : t('discounts.noNotes', 'No extra notes')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-white/50">{t('discounts.notConfigured', 'No active discount')}</p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1 text-xs text-white/70">
                          <p>{t('discounts.labels.starts', 'Starts')}: {formatDateTimeForDisplay(discount?.startAt)}</p>
                          <p>{t('discounts.labels.ends', 'Ends')}: {formatDateTimeForDisplay(discount?.endAt)}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <p className="text-white/80">{t('discounts.labels.retailPrice', 'Retail price')}: {formatLKR(pricing?.base ?? product.price?.retail ?? 0)}</p>
                          <p className="text-emerald-300">
                            {t('discounts.labels.finalPrice', 'Promo price')}: {formatLKR(pricing?.final ?? product.price?.retail ?? 0)}
                          </p>
                          {pricing?.discountAmount ? (
                            <p className="text-xs text-emerald-200">
                              {t('discounts.labels.youSave', 'Saving')}: {formatLKR(pricing.discountAmount)}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {renderStatusBadge(status)}
                      </td>

                      <td className="pl-4 pr-10 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => handleOpenModal(product)}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                              canManage
                                ? 'border-purple-400/40 text-white hover:bg-purple-500/20'
                                : 'border-white/10 text-white/40 cursor-not-allowed'
                            }`}
                          >
                            <NotebookPen className="w-4 h-4" />
                            {t('discounts.actions.manage', 'Manage')}
                          </button>
                          {canManage && hasDiscount ? (
                            <button
                              type="button"
                              onClick={() => setRemovingProduct(product)}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 px-4 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/15 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t('discounts.actions.remove', 'Remove')}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        isOpen={modalOpen && !!selectedProduct}
        onClose={closeModal}
        title={t('discounts.modal.title', 'Configure discount')}
        subtitle={selectedProduct ? `${selectedProduct.name?.en ?? selectedProduct.sku}` : ''}
        icon={<BadgePercent className="w-6 h-6 text-purple-300" />}
        widthClass="max-w-3xl"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/20"
              disabled={saving}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {t('discounts.modal.save', 'Save discount')}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{t('discounts.modal.enabled', 'Discount enabled')}</p>
                  <p className="text-xs text-white/60">{t('discounts.modal.enabledHint', 'Disable to keep the configuration for later without applying it now.')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormState((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
                  className="text-white"
                >
                  {formState.isEnabled ? <ToggleRight className="h-10 w-10 text-emerald-300" /> : <ToggleLeft className="h-10 w-10 text-white/40" />}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-white mb-2">{t('discounts.modal.type', 'Discount type')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['percentage', 'fixed'] as const).map((typeOption) => {
                    const active = formState.type === typeOption;
                    return (
                      <button
                        key={typeOption}
                        type="button"
                        onClick={() => setFormState((prev) => ({ ...prev, type: typeOption }))}
                        className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                          active
                            ? 'border-purple-400/50 bg-purple-500/20 text-white'
                            : 'border-white/10 text-white/70 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        {typeOption === 'percentage'
                          ? t('discounts.modal.typePercentage', 'Percentage off')
                          : t('discounts.modal.typeFixed', 'Fixed amount off')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-white block mb-2">
                  {formState.type === 'percentage'
                    ? t('discounts.modal.percentageLabel', 'Percentage value (%)')
                    : t('discounts.modal.fixedLabel', 'Amount in LKR')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={formState.type === 'percentage' ? 90 : undefined}
                  value={formState.value}
                  onChange={(event) => setFormState((prev) => ({ ...prev, value: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none"
                />
                {formState.type === 'percentage' ? (
                  <p className="mt-1 text-xs text-white/50">{t('discounts.modal.percentageHint', 'Keep under 60% for seasonal campaigns; maximum allowed is 90%.')}</p>
                ) : (
                  <p className="mt-1 text-xs text-white/50">{t('discounts.modal.fixedHint', 'Enter the amount to subtract from the retail price (in LKR).')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{t('discounts.modal.schedule', 'Schedule')}</p>
                  <p className="text-xs text-white/60">{t('discounts.modal.scheduleHint', 'Choose when this discount starts and ends.')}</p>
                </div>
                <CalendarClock className="w-6 h-6 text-white/60" />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <label className="text-xs uppercase tracking-wide text-white/50">
                  {t('discounts.modal.start', 'Start date & time')}
                  <div className="mt-1 flex flex-wrap items-start gap-2 sm:flex-nowrap">
                    <input
                      type="date"
                      value={startParts.date}
                      onChange={(event) => handleDateTimeChange('startAt', 'date', event.target.value)}
                      className="flex-1 min-w-[10rem] rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex gap-1">
                        <select
                          value={startParts.hour}
                          onChange={(event) => handleDateTimeChange('startAt', 'hour', event.target.value)}
                          className="w-20 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
                        >
                          {TIME_HOURS_12.map((hour) => (
                            <option key={hour} value={hour}>
                              {hour}
                            </option>
                          ))}
                        </select>
                        <select
                          value={startParts.minute}
                          onChange={(event) => handleDateTimeChange('startAt', 'minute', event.target.value)}
                          className="w-20 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
                        >
                          {TIME_MINUTES.map((minute) => (
                            <option key={minute} value={minute}>
                              {minute}
                            </option>
                          ))}
                        </select>
                      </div>
                      <select
                        value={startParts.meridiem}
                        onChange={(event) => handleDateTimeChange('startAt', 'meridiem', event.target.value as DateTimeParts['meridiem'])}
                        className="w-20 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
                      >
                        {MERIDIEMS.map((meridiem) => (
                          <option key={meridiem} value={meridiem}>
                            {meridiem}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </label>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  {t('discounts.modal.end', 'End date & time')}
                  <div className="mt-1 flex flex-wrap items-start gap-2 sm:flex-nowrap">
                    <input
                      type="date"
                      value={endParts.date}
                      onChange={(event) => handleDateTimeChange('endAt', 'date', event.target.value)}
                      className="flex-1 min-w-[10rem] rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex gap-1">
                        <select
                          value={endParts.hour}
                          onChange={(event) => handleDateTimeChange('endAt', 'hour', event.target.value)}
                          className="w-20 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
                        >
                          {TIME_HOURS_12.map((hour) => (
                            <option key={hour} value={hour}>
                              {hour}
                            </option>
                          ))}
                        </select>
                        <select
                          value={endParts.minute}
                          onChange={(event) => handleDateTimeChange('endAt', 'minute', event.target.value)}
                          className="w-20 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
                        >
                          {TIME_MINUTES.map((minute) => (
                            <option key={minute} value={minute}>
                              {minute}
                            </option>
                          ))}
                        </select>
                      </div>
                      <select
                        value={endParts.meridiem}
                        onChange={(event) => handleDateTimeChange('endAt', 'meridiem', event.target.value as DateTimeParts['meridiem'])}
                        className="w-20 rounded-xl border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
                      >
                        {MERIDIEMS.map((meridiem) => (
                          <option key={meridiem} value={meridiem}>
                            {meridiem}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handlePresetRange(days)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/20 hover:bg-white/10"
                  >
                    {t('discounts.modal.presetDays', '{{count}} day campaign', { count: days })}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="text-xs uppercase tracking-wide text-white/50 block mb-2">
                {t('discounts.modal.notes', 'Notes for the team')}
              </label>
              <textarea
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                rows={4}
                placeholder={t('discounts.modal.notesPlaceholder', 'Describe the campaign, target audience, or stacking rules...')}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
              />
              <p className="mt-2 text-xs text-white/40">
                {t('discounts.modal.notesHint', 'Notes appear in audit logs and help the POS team understand campaign rules.')}
              </p>
            </div>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={!!removingProduct}
        onClose={() => (removing ? null : setRemovingProduct(null))}
        onConfirm={handleRemoveDiscount}
        loading={removing}
        tone="danger"
        confirmLabel={t('discounts.confirmRemove', 'Remove discount')}
        title={t('discounts.confirmTitle', 'Remove this discount?')}
        description={t('discounts.confirmDescription', 'This will immediately stop the promotion for this product at all POS counters.')}
      />
    </div>
  );
};

export default DiscountManager;
