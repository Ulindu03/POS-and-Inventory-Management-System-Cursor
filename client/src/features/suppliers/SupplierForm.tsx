import React, { useEffect, useState } from 'react';
import { categoriesApi } from '@/lib/api/products.api';
import { Save, Building, Wand2 } from 'lucide-react';
import FormModal from '@/components/ui/FormModal';
import { Supplier, getSuppliers } from '@/lib/api/suppliers.api';
import { z } from 'zod';


const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  supplierCode: z.string().min(1, 'Supplier code is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    town: z.string().optional(),
    townOther: z.string().optional(),
  }).optional(),
  paymentTerms: z.string().optional(),
  paymentPeriodType: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  creditLimit: z.number().optional(),
  creditUsed: z.number().optional(),
  rating: z.number().optional(),
  performance: z.object({
    onTimeDelivery: z.number().optional(),
    qualityRating: z.number().optional(),
    priceCompetitiveness: z.number().optional(),
  }).optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
  isActive: z.boolean(),
  notes: z.string().optional(),
  bankDetails: z.object({
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    bankName: z.string().optional(),
    branch: z.string().optional(),
  }).optional(),
});


type AddressEx = {
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  town?: string;
  townOther?: string;
};

type SupplierCategory = NonNullable<Supplier['categories']>[number];

type SupplierFormData = Partial<Omit<Supplier, 'address' | 'categories'>> & {
  address: AddressEx;
  paymentPeriodType?: 'day' | 'week' | 'month' | 'year';
  category?: string;
};

interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (data: Partial<Supplier>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ supplier, onSubmit, onCancel, loading = false }) => {
  const [customCategory, setCustomCategory] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [categories, setCategories] = useState<SupplierCategory[]>([]);
  // Fetch categories from API
  useEffect(() => {
    (async () => {
      const res = await categoriesApi.list();
      if (res.success && res.data?.items) {
        setCategories(res.data.items);
      }
    })();
  }, []);
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    supplierCode: '',
    contactPerson: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: { street: '', city: '', province: '', postalCode: '', town: '', townOther: '' },
    taxId: '',
    paymentTerms: '',
    paymentPeriodType: 'day',
    category: '',
    creditLimit: 0,
    creditUsed: 0,
    rating: 3,
    performance: { onTimeDelivery: 0, qualityRating: 0, priceCompetitiveness: 0 },
    status: 'active',
    isActive: true,
    notes: '',
    bankDetails: { accountName: '', accountNumber: '', bankName: '', branch: '' },
  });

  // Province/district/town dropdown options
  const provinceOptions = [
    '', 'Western', 'Central', 'Southern', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'
  ];
  const districtMap: Record<string, string[]> = {
    Western: ['Colombo', 'Gampaha', 'Kalutara'],
    Central: ['Kandy', 'Matale', 'Nuwara Eliya'],
    Southern: ['Galle', 'Matara', 'Hambantota'],
    Northern: ['Jaffna', 'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya'],
    Eastern: ['Trincomalee', 'Batticaloa', 'Ampara'],
    'North Western': ['Kurunegala', 'Puttalam'],
    'North Central': ['Anuradhapura', 'Polonnaruwa'],
    Uva: ['Badulla', 'Monaragala'],
    Sabaragamuwa: ['Ratnapura', 'Kegalle']
  };
  const townMap: Record<string, Record<string, string[]>> = {
    Western: {
      Colombo: ['Colombo', 'Dehiwala', 'Moratuwa', 'Kotte', 'Nugegoda', 'Maharagama', 'Mount Lavinia', 'Homagama', 'Piliyandala'],
      Gampaha: ['Gampaha', 'Negombo', 'Ja-Ela', 'Wattala', 'Kelaniya', 'Minuwangoda', 'Ragama', 'Veyangoda', 'Katunayake'],
      Kalutara: ['Kalutara', 'Panadura', 'Horana', 'Beruwala', 'Matugama', 'Aluthgama', 'Bandaragama']
    },
    Central: {
      Kandy: ['Kandy', 'Peradeniya', 'Katugastota', 'Gampola', 'Nawalapitiya', 'Akurana', 'Kundasale'],
      Matale: ['Matale', 'Dambulla', 'Sigiriya', 'Rattota', 'Ukuwela', 'Naula'],
      'Nuwara Eliya': ['Nuwara Eliya', 'Hatton', 'Ginigathhena', 'Talawakele', 'Lindula', 'Kotagala']
    },
    Southern: {
      Galle: ['Galle', 'Hikkaduwa', 'Ambalangoda', 'Elpitiya', 'Baddegama', 'Bentota'],
      Matara: ['Matara', 'Weligama', 'Dikwella', 'Akuressa', 'Hakmana'],
      Hambantota: ['Hambantota', 'Tangalle', 'Tissamaharama', 'Ambalantota', 'Beliatta']
    },
    Northern: {
      Jaffna: ['Jaffna', 'Chavakachcheri', 'Nallur', 'Point Pedro', 'Karainagar'],
      Kilinochchi: ['Kilinochchi', 'Paranthan', 'Poonakary'],
      Mannar: ['Mannar', 'Pesalai', 'Talaimannar'],
      Mullaitivu: ['Mullaitivu', 'Puthukkudiyiruppu', 'Oddusuddan'],
      Vavuniya: ['Vavuniya', 'Cheddikulam', 'Nedunkeni']
    },
    Eastern: {
      Trincomalee: ['Trincomalee', 'Kinniya', 'Muttur', 'Kantale'],
      Batticaloa: ['Batticaloa', 'Eravur', 'Kaluwanchikudy', 'Valaichchenai'],
      Ampara: ['Ampara', 'Kalmunai', 'Akkaraipattu', 'Sammanthurai', 'Dehiattakandiya']
    },
    'North Western': {
      Kurunegala: ['Kurunegala', 'Kuliyapitiya', 'Narammala', 'Pannala', 'Polgahawela', 'Melsiripura'],
      Puttalam: ['Puttalam', 'Chilaw', 'Wennappuwa', 'Marawila', 'Anamaduwa']
    },
    'North Central': {
      Anuradhapura: ['Anuradhapura', 'Mihintale', 'Kekirawa', 'Eppawala', 'Medawachchiya'],
      Polonnaruwa: ['Polonnaruwa', 'Hingurakgoda', 'Medirigiriya', 'Dimbulagala']
    },
    Uva: {
      Badulla: ['Badulla', 'Bandarawela', 'Haputale', 'Ella', 'Welimada', 'Passara'],
      Monaragala: ['Monaragala', 'Wellawaya', 'Buttala', 'Kataragama', 'Siyambalanduwa']
    },
    Sabaragamuwa: {
      Ratnapura: ['Ratnapura', 'Balangoda', 'Eheliyagoda', 'Pelmadulla', 'Embilipitiya'],
      Kegalle: ['Kegalle', 'Mawanella', 'Warakapola', 'Ruwanwella', 'Rambukkana']
    }
  };
  const selectedProvince = formData.address?.province || '';
  const selectedDistrict = formData.address?.city || '';
  const townOptions = selectedProvince && selectedDistrict && townMap[selectedProvince]?.[selectedDistrict]
    ? [...townMap[selectedProvince][selectedDistrict], 'Other']
    : [];

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        supplierCode: supplier.supplierCode,
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        alternatePhone: supplier.alternatePhone || '',
        address: {
          street: supplier.address?.street || '',
          city: supplier.address?.city || '',
          province: supplier.address?.province || '',
          postalCode: supplier.address?.postalCode || '',
          town: (supplier.address as AddressEx | undefined)?.town || '',
          townOther: (supplier.address as AddressEx | undefined)?.townOther || '',
        },
        taxId: supplier.taxId || '',
        paymentTerms: supplier.paymentTerms,
        category: supplier.categories?.[0]?._id || '',
        creditLimit: supplier.creditLimit,
        creditUsed: supplier.creditUsed,
        rating: supplier.rating,
        performance: supplier.performance,
        status: supplier.status,
        isActive: supplier.isActive,
        notes: supplier.notes || '',
        bankDetails: {
          accountName: supplier.bankDetails?.accountName || '',
          accountNumber: supplier.bankDetails?.accountNumber || '',
          bankName: supplier.bankDetails?.bankName || '',
          branch: supplier.bankDetails?.branch || '',
        },
      });
    }
  }, [supplier]);

  const handleInputChange = <K extends keyof SupplierFormData>(field: K, value: SupplierFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const key = String(field);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  type NestedKeys = 'address' | 'bankDetails' | 'performance';

  const handleNestedInputChange = <K extends NestedKeys, F extends keyof NonNullable<SupplierFormData[K]> & string>(
    parent: K,
    field: F,
    value: NonNullable<SupplierFormData[K]>[F]
  ) => {
    setFormData((prev) => {
      const currentParent = (prev?.[parent] as Record<string, unknown> | undefined) ?? {};
      return {
        ...prev,
        [parent]: {
          ...currentParent,
          [field]: value,
        },
      } as SupplierFormData;
    });
  };

  const validateForm = () => {
    try {
      supplierSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          const path = issue.path.join('.');
          newErrors[path] = issue.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const [popupError, setPopupError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    // Map category to categories array for API (full object)
    let selectedCategoryObj: SupplierCategory | undefined;
    if (formData.category) {
      selectedCategoryObj = categories.find((cat) => cat._id === formData.category);
      if (!selectedCategoryObj) {
        setPopupError('Selected category could not be found.');
        return;
      }
    }

    type SubmitData = Partial<Supplier> & {
      category?: string;
      paymentPeriodType?: SupplierFormData['paymentPeriodType'];
    };

    const submitData: SubmitData = {
      ...formData,
      categories: selectedCategoryObj ? [selectedCategoryObj] : [],
    };

    delete submitData.category;
    delete submitData.paymentPeriodType;

    try {
      await onSubmit(submitData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create supplier';
      setPopupError(message);
    }
  };

  // Helper to format code like PREFIX-001
  const formatCode = (prefix: string, num: number, width: number = 3) => {
    const safePrefix = (prefix || 'SUP').toUpperCase().replace(/[^A-Z]/g, '') || 'SUP';
    const padded = String(num).padStart(width, '0');
    return `${safePrefix}-${padded}`;
  };

  const generateSupplierCode = async () => {
    try {
      setGenLoading(true);
      // Prefer current prefix if user typed one (e.g., ABC-), else use SUP
      const current = (formData.supplierCode || '').toUpperCase();
      const prefix = current.includes('-') ? current.split('-')[0] : (current || 'SUP');

      const res = await getSuppliers({ page: 1, limit: 1000 });
      const list: Supplier[] = res?.data || [];
      // Extract numeric suffixes for matching prefix
      let maxNum = 0;
      let maxWidth = 3;
      list.forEach(s => {
        const code = (s.supplierCode || '').toUpperCase();
        const parts = code.split('-');
        if (parts.length >= 2) {
          const [pfx, numStr] = [parts[0], parts[parts.length - 1]];
          const n = parseInt(numStr, 10);
          if (pfx === prefix && !Number.isNaN(n)) {
            maxNum = Math.max(maxNum, n);
            maxWidth = Math.max(maxWidth, numStr.length);
          }
        }
      });
      const next = maxNum + 1;
      const nextCode = formatCode(prefix, next, maxWidth);
      setFormData(prev => ({ ...prev, supplierCode: nextCode }));
      setErrors(prev => ({ ...prev, supplierCode: '' }));
    } catch (error) {
      console.error('generateSupplierCode failed', error);
      // Fallback when API fails
      const fallback = formatCode('SUP', 1);
      setFormData(prev => ({ ...prev, supplierCode: fallback }));
    } finally {
      setGenLoading(false);
    }
  };

  let buttonLabel = 'Create Supplier';
  if (supplier) buttonLabel = 'Update Supplier';
  if (loading) buttonLabel = 'Saving...';

  return (
    <FormModal
      isOpen
      onClose={onCancel}
      title={supplier ? 'Edit Supplier' : 'Add New Supplier'}
      subtitle={supplier ? 'Update supplier information' : 'Create a new supplier record'}
      icon={<Building className="w-6 h-6 text-[#F8F8F8]" />}
      widthClass="max-w-4xl"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            form="supplier-form"
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <Save className="w-4 h-4" /> {buttonLabel}
          </button>
        </div>
      }
    >
      {popupError && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-700 text-center font-semibold">
          {popupError}
          <button className="ml-2 px-2 py-1 rounded bg-red-500 text-white" onClick={() => setPopupError(null)}>Close</button>
        </div>
      )}
      <form id="supplier-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Basic & Contact */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8]">Basic Information</h3>
            <div>
              <label htmlFor="supplier-name" className="block text-sm font-medium text-[#F8F8F8] mb-1">Supplier Name *</label>
              <input
                type="text"
                id="supplier-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-white/10 border ${errors.name ? 'border-red-500' : 'border-white/10'} text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30`}
                placeholder="Enter supplier name"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="supplier-code" className="block text-sm font-medium text-[#F8F8F8]">Supplier Code *</label>
                <button
                  type="button"
                  onClick={generateSupplierCode}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-[#F8F8F8] hover:bg-white/20 disabled:opacity-50"
                  disabled={genLoading}
                >
                  <Wand2 className="w-3 h-3" /> {genLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <input
                type="text"
                id="supplier-code"
                value={formData.supplierCode}
                onChange={(e) => handleInputChange('supplierCode', e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 rounded-xl bg-white/10 border ${errors.supplierCode ? 'border-red-500' : 'border-white/10'} text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30`}
                placeholder="e.g., SUP-001"
              />
              {errors.supplierCode && <p className="text-red-400 text-sm mt-1">{errors.supplierCode}</p>}
            </div>
            <div>
              {/* Tax ID removed as requested */}
            </div>
            <div>
              <label htmlFor="supplier-paymentTerms" className="block text-sm font-medium text-[#F8F8F8] mb-1">Payment Terms</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="supplier-paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="e.g., 30"
                />
                <select
                  id="supplier-paymentPeriodType"
                  value={formData.paymentPeriodType || 'day'}
                  onChange={(e) =>
                    handleInputChange(
                      'paymentPeriodType',
                      e.target.value as SupplierFormData['paymentPeriodType']
                    )
                  }
                  className="px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="supplier-category" className="block text-sm font-medium text-[#F8F8F8] mb-1">Product Category</label>
              <div className="flex gap-2 items-center">
                <select
                  id="supplier-category"
                  value={formData.category || ''}
                  onChange={(e) => {
                    handleInputChange('category', e.target.value);
                    if (e.target.value === 'other') setShowCategoryInput(true);
                    else setShowCategoryInput(false);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name.en}</option>
                  ))}
                  <option value="other">Other</option>
                </select>
                <button
                  type="button"
                  className="px-3 py-2 rounded-full bg-emerald-500 text-white text-lg font-bold hover:bg-emerald-600"
                  title="Add new category"
                  onClick={() => setShowCategoryInput(true)}
                >
                  +
                </button>
              </div>
              {showCategoryInput && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter new category name (EN)"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
                    onClick={async () => {
                      if (customCategory.trim()) {
                        // Create new category via API
                        const payload = { name: { en: customCategory.trim(), si: customCategory.trim() } };
                        const res = await categoriesApi.create(payload);
                        if (res.success && res.data?.category) {
                          setCategories(prev => [...prev, res.data.category]);
                          handleInputChange('category', res.data.category._id);
                        }
                        setCustomCategory('');
                        setShowCategoryInput(false);
                      }
                    }}
                  >Add</button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8]">Contact Information</h3>
            <div>
              <label htmlFor="supplier-contactPerson" className="block text-sm font-medium text-[#F8F8F8] mb-1">Contact Person</label>
              <input
                type="text"
                id="supplier-contactPerson"
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter contact person name"
              />
            </div>
            <div>
              <label htmlFor="supplier-email" className="block text-sm font-medium text-[#F8F8F8] mb-1">Email</label>
              <input
                type="email"
                id="supplier-email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-white/10 border ${errors.email ? 'border-red-500' : 'border-white/10'} text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30`}
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="supplier-phone" className="block text-sm font-medium text-[#F8F8F8] mb-1">Phone</label>
              <input
                type="tel"
                id="supplier-phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label htmlFor="supplier-altPhone" className="block text-sm font-medium text-[#F8F8F8] mb-1">Alternate Phone</label>
              <input
                type="tel"
                id="supplier-altPhone"
                value={formData.alternatePhone}
                onChange={(e) => handleInputChange('alternatePhone', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter alternate phone number"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <h3 className="text-lg font-semibold text-[#F8F8F8]">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="address-street" className="block text-sm font-medium text-[#F8F8F8] mb-1">Street</label>
              <input
                type="text"
                id="address-street"
                value={formData.address?.street}
                onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter street address"
              />
            </div>
            <div>
              <label htmlFor="address-province" className="block text-sm font-medium text-[#F8F8F8] mb-1">Province</label>
              <select
                id="address-province"
                value={formData.address?.province || ''}
                onChange={(e) => {
                  handleNestedInputChange('address', 'province', e.target.value);
                  handleNestedInputChange('address', 'city', '');
                  handleNestedInputChange('address', 'town', '');
                }}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
              >
                <option value="">Select province</option>
                {provinceOptions.slice(1).map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="address-district" className="block text-sm font-medium text-[#F8F8F8] mb-1">District</label>
              <select
                id="address-district"
                value={formData.address?.city || ''}
                onChange={(e) => {
                  handleNestedInputChange('address', 'city', e.target.value);
                  handleNestedInputChange('address', 'town', '');
                }}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                disabled={!selectedProvince}
              >
                <option value="">Select district</option>
                {selectedProvince && districtMap[selectedProvince]?.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="address-town" className="block text-sm font-medium text-[#F8F8F8] mb-1">Town</label>
              <select
                id="address-town"
                value={formData.address?.town || ''}
                onChange={(e) => handleNestedInputChange('address', 'town', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
                disabled={!selectedDistrict}
              >
                <option value="">Select town</option>
                {townOptions.map((town) => (
                  <option key={town} value={town}>{town}</option>
                ))}
              </select>
              {formData.address?.town === 'Other' && (
                <input
                  type="text"
                  id="address-town-other"
                  value={formData.address?.townOther || ''}
                  onChange={(e) => handleNestedInputChange('address', 'townOther', e.target.value)}
                  className="mt-2 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="Enter town manually"
                />
              )}
            </div>
            <div>
              <label htmlFor="address-postalCode" className="block text sm font-medium text-[#F8F8F8] mb-1">Postal Code</label>
              <input
                type="text"
                id="address-postalCode"
                value={formData.address?.postalCode}
                onChange={(e) => handleNestedInputChange('address', 'postalCode', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter postal code"
              />
            </div>
          </div>
        </div>


        {/* Bank, Status & Notes */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8]">Bank Details</h3>
            <div>
              <label htmlFor="bank-accountName" className="block text-sm font-medium text-[#F8F8F8] mb-1">Account Name</label>
              <input
                type="text"
                id="bank-accountName"
                value={formData.bankDetails?.accountName}
                onChange={(e) => handleNestedInputChange('bankDetails', 'accountName', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter account name"
              />
            </div>
            <div>
              <label htmlFor="bank-accountNumber" className="block text-sm font-medium text-[#F8F8F8] mb-1">Account Number</label>
              <input
                type="text"
                id="bank-accountNumber"
                value={formData.bankDetails?.accountNumber}
                onChange={(e) => handleNestedInputChange('bankDetails', 'accountNumber', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter account number"
              />
            </div>
            <div>
              <label htmlFor="bank-bankName" className="block text-sm font-medium text-[#F8F8F8] mb-1">Bank Name</label>
              <input
                type="text"
                id="bank-bankName"
                value={formData.bankDetails?.bankName}
                onChange={(e) => handleNestedInputChange('bankDetails', 'bankName', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter bank name"
              />
            </div>
            <div>
              <label htmlFor="bank-branch" className="block text-sm font-medium text-[#F8F8F8] mb-1">Branch</label>
              <input
                type="text"
                id="bank-branch"
                value={formData.bankDetails?.branch}
                onChange={(e) => handleNestedInputChange('bankDetails', 'branch', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter branch name"
              />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8]">Status & Notes</h3>
            <div>
              <label htmlFor="supplier-status" className="block text-sm font-medium text-[#F8F8F8] mb-1">Status</label>
              <select
                id="supplier-status"
                value={formData.status}
                  onChange={(e) =>
                    handleInputChange('status', e.target.value as SupplierFormData['status'])
                  }
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-emerald-500 focus:ring-emerald-500 border-white/20 rounded bg-white/10"
              />
              <label htmlFor="isActive" className="text-sm text-[#F8F8F8]">Is Active</label>
            </div>
            <div>
              <label htmlFor="supplier-notes" className="block text-sm font-medium text-[#F8F8F8] mb-1">Notes</label>
              <textarea
                value={formData.notes}
                id="supplier-notes"
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter any additional notes..."
              />
            </div>
          </div>
        </div>
      </form>
    </FormModal>
  );
};
export default SupplierForm;
