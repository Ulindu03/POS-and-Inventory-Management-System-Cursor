import React, { useEffect, useState } from 'react';
import { Save, Building } from 'lucide-react';
import FormModal from '@/components/ui/FormModal';
import { Supplier } from '@/lib/api/suppliers.api';
import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  supplierCode: z.string().min(1, 'Supplier code is required'),
  contactPerson: z.string().optional(),
  email: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /.+@.+\..+/.test(val), { message: 'Invalid email address' }),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().default('30 days'),
  creditLimit: z.number().min(0, 'Credit limit must be positive'),
  creditUsed: z.number().min(0, 'Credit used must be positive'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  performance: z.object({
    onTimeDelivery: z.number().min(0).max(100),
    qualityRating: z.number().min(0).max(100),
    priceCompetitiveness: z.number().min(0).max(100),
  }),
  status: z.enum(['active', 'inactive', 'suspended']),
  isActive: z.boolean(),
  notes: z.string().optional(),
  bankDetails: z
    .object({
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      bankName: z.string().optional(),
      branch: z.string().optional(),
    })
    .optional(),
});

interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (data: Partial<Supplier>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ supplier, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    supplierCode: '',
    contactPerson: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: { street: '', city: '', province: '', postalCode: '' },
    taxId: '',
    paymentTerms: '30 days',
    creditLimit: 0,
    creditUsed: 0,
    rating: 3,
    performance: { onTimeDelivery: 0, qualityRating: 0, priceCompetitiveness: 0 },
    status: 'active',
    isActive: true,
    notes: '',
    bankDetails: { accountName: '', accountNumber: '', bankName: '', branch: '' },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        supplierCode: supplier.supplierCode,
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        alternatePhone: supplier.alternatePhone || '',
        address: supplier.address || { street: '', city: '', province: '', postalCode: '' },
        taxId: supplier.taxId || '',
        paymentTerms: supplier.paymentTerms,
        creditLimit: supplier.creditLimit,
        creditUsed: supplier.creditUsed,
        rating: supplier.rating,
        performance: supplier.performance,
        status: supplier.status,
        isActive: supplier.isActive,
        notes: supplier.notes || '',
        bankDetails: supplier.bankDetails || { accountName: '', accountNumber: '', bankName: '', branch: '' },
      });
    }
  }, [supplier]);

  const handleInputChange = (field: keyof Supplier, value: any) => {
    setFormData((prev) => ({ ...(prev as any), [field]: value } as Partial<Supplier>));
    const key = String(field);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleNestedInputChange = (parent: keyof Supplier, field: string, value: any) => {
    setFormData((prev) => {
      const parentObj: any = (prev as any)[parent as string] || {};
      return { ...(prev as any), [parent]: { ...parentObj, [field]: value } } as Partial<Supplier>;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) onSubmit(formData);
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
              <label htmlFor="supplier-code" className="block text-sm font-medium text-[#F8F8F8] mb-1">Supplier Code *</label>
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
              <label htmlFor="supplier-taxId" className="block text-sm font-medium text-[#F8F8F8] mb-1">Tax ID</label>
              <input
                type="text"
                id="supplier-taxId"
                value={formData.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter tax ID"
              />
            </div>
            <div>
              <label htmlFor="supplier-paymentTerms" className="block text-sm font-medium text-[#F8F8F8] mb-1">Payment Terms</label>
              <select
                id="supplier-paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
              >
                <option value="15 days">15 days</option>
                <option value="30 days">30 days</option>
                <option value="45 days">45 days</option>
                <option value="60 days">60 days</option>
                <option value="90 days">90 days</option>
              </select>
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
              <label htmlFor="address-city" className="block text-sm font-medium text-[#F8F8F8] mb-1">City</label>
              <input
                type="text"
                id="address-city"
                value={formData.address?.city}
                onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label htmlFor="address-province" className="block text-sm font-medium text-[#F8F8F8] mb-1">Province</label>
              <input
                type="text"
                id="address-province"
                value={formData.address?.province}
                onChange={(e) => handleNestedInputChange('address', 'province', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter province"
              />
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

        {/* Financial & Performance */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8]">Financial Information</h3>
            <div>
              <label htmlFor="credit-limit" className="block text-sm font-medium text-[#F8F8F8] mb-1">Credit Limit (LKR)</label>
              <input
                type="number"
                id="credit-limit"
                value={formData.creditLimit}
                onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-3 rounded-xl bg-white/10 border ${errors.creditLimit ? 'border-red-500' : 'border-white/10'} text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30`}
                placeholder="0.00"
                min={0}
                step={0.01}
              />
              {errors.creditLimit && <p className="text-red-400 text-sm mt-1">{errors.creditLimit}</p>}
            </div>
            <div>
              <label htmlFor="credit-used" className="block text-sm font-medium text-[#F8F8F8] mb-1">Credit Used (LKR)</label>
              <input
                type="number"
                id="credit-used"
                value={formData.creditUsed}
                onChange={(e) => handleInputChange('creditUsed', parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-3 rounded-xl bg-white/10 border ${errors.creditUsed ? 'border-red-500' : 'border-white/10'} text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30`}
                placeholder="0.00"
                min={0}
                step={0.01}
              />
              {errors.creditUsed && <p className="text-red-400 text-sm mt-1">{errors.creditUsed}</p>}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#F8F8F8]">Performance & Rating</h3>
            <div>
              <label htmlFor="supplier-rating" className="block text-sm font-medium text-[#F8F8F8] mb-1">Rating (1-5)</label>
              <input
                type="number"
                id="supplier-rating"
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', parseInt(e.target.value) || 3)}
                className={`w-full px-4 py-3 rounded-xl bg-white/10 border ${errors.rating ? 'border-red-500' : 'border-white/10'} text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30`}
                min={1}
                max={5}
              />
              {errors.rating && <p className="text-red-400 text-sm mt-1">{errors.rating}</p>}
            </div>
            <div>
              <label htmlFor="perf-onTime" className="block text-sm font-medium text-[#F8F8F8] mb-1">On-time Delivery (%)</label>
              <input
                type="number"
                id="perf-onTime"
                value={formData.performance?.onTimeDelivery}
                onChange={(e) => handleNestedInputChange('performance', 'onTimeDelivery', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="0"
                min={0}
                max={100}
              />
            </div>
            <div>
              <label htmlFor="perf-quality" className="block text-sm font-medium text-[#F8F8F8] mb-1">Quality Rating (%)</label>
              <input
                type="number"
                id="perf-quality"
                value={formData.performance?.qualityRating}
                onChange={(e) => handleNestedInputChange('performance', 'qualityRating', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="0"
                min={0}
                max={100}
              />
            </div>
            <div>
              <label htmlFor="perf-price" className="block text-sm font-medium text-[#F8F8F8] mb-1">Price Competitiveness (%)</label>
              <input
                type="number"
                id="perf-price"
                value={formData.performance?.priceCompetitiveness}
                onChange={(e) => handleNestedInputChange('performance', 'priceCompetitiveness', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="0"
                min={0}
                max={100}
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
                onChange={(e) => handleInputChange('status', e.target.value)}
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
