/* eslint-disable jsx-a11y/label-has-associated-control */
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, MapPin, CreditCard, Star, Save } from 'lucide-react';
import FormModal from '@/components/ui/FormModal';

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().refine((v) => /.+@.+\..+/.test(v), { message: 'Invalid email address' }),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  alternatePhone: z.string().optional(),
  address: z.object({
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    province: z.string().min(2, 'Province is required'),
    postalCode: z.string().min(4, 'Postal code is required'),
  }),
  type: z.enum(['retail', 'wholesale', 'corporate']),
  creditLimit: z.number().min(0, 'Credit limit cannot be negative'),
  loyaltyPoints: z.number().min(0, 'Loyalty points cannot be negative'),
  taxId: z.string().optional(),
  birthday: z.string().optional(),
  notes: z.string().optional(),
});

interface CustomerFormProps {
  customer?: Partial<z.infer<typeof customerSchema>>;
  onSubmit: (data: z.infer<typeof customerSchema>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onSubmit, onCancel, isLoading = false }) => {
  const isEditing = useMemo(() => Boolean(customer), [customer]);

  const { register, handleSubmit, formState: { errors, isValid }, reset } = useForm({
    resolver: zodResolver(customerSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      alternatePhone: '',
      address: { street: '', city: '', province: '', postalCode: '' },
      type: 'retail',
      creditLimit: 0,
      loyaltyPoints: 0,
      taxId: '',
      birthday: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        alternatePhone: customer.alternatePhone ?? '',
        address: {
          street: customer.address?.street ?? '',
          city: customer.address?.city ?? '',
          province: customer.address?.province ?? '',
          postalCode: customer.address?.postalCode ?? '',
        },
  type: (customer.type as z.infer<typeof customerSchema>['type']) ?? 'retail',
        creditLimit: customer.creditLimit ?? 0,
        loyaltyPoints: customer.loyaltyPoints ?? 0,
        taxId: customer.taxId ?? '',
        birthday: customer.birthday ?? '',
        notes: customer.notes ?? '',
      });
    }
  }, [customer, reset]);

  const handleFormSubmit = (values: any) => onSubmit(values as z.infer<typeof customerSchema>);

  let submitText = 'Create Customer';
  if (isEditing) submitText = 'Update Customer';
  if (isLoading) submitText = 'Saving...';

  return (
    <FormModal
      isOpen
      onClose={onCancel}
      title={isEditing ? 'Edit Customer' : 'Add New Customer'}
      subtitle={isEditing ? 'Update customer information' : 'Register a new customer'}
      icon={<User className="w-6 h-6 text-[#F8F8F8]" />}
      widthClass="max-w-4xl"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] hover:bg-white/20 disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            form="customer-form"
            type="submit"
            disabled={!isValid || isLoading}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {submitText}
          </button>
        </div>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="customer-name" className="block text-sm font-medium text-[#F8F8F8] mb-2">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
                <input
                  {...register('name')}
                  id="customer-name"
                  type="text"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="Enter full name"
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="customer-email" className="block text-sm font-medium text-[#F8F8F8] mb-2">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
                <input
                  {...register('email')}
                  id="customer-email"
                  type="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="Enter email address"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="customer-phone" className="block text-sm font-medium text-[#F8F8F8] mb-2">Phone *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
                <input
                  {...register('phone')}
                  id="customer-phone"
                  type="tel"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="Enter phone number"
                />
              </div>
              {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>}
            </div>

            <div>
              <label htmlFor="customer-altPhone" className="block text-sm font-medium text-[#F8F8F8] mb-2">Alternate Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
                <input
                  {...register('alternatePhone')}
                  id="customer-altPhone"
                  type="tel"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="Enter alternate phone"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4"><MapPin className="inline w-5 h-5 mr-2" />Address Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="customer-street" className="block text-sm font-medium text-[#F8F8F8] mb-2">Street Address *</label>
              <input
                {...register('address.street')}
                id="customer-street"
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter street address"
              />
              {errors.address?.street && <p className="mt-1 text-sm text-red-400">{errors.address.street.message}</p>}
            </div>

            <div>
              <label htmlFor="customer-city" className="block text-sm font-medium text-[#F8F8F8] mb-2">City *</label>
              <input
                {...register('address.city')}
                id="customer-city"
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter city"
              />
              {errors.address?.city && <p className="mt-1 text-sm text-red-400">{errors.address.city.message}</p>}
            </div>

            <div>
              <label htmlFor="customer-province" className="block text-sm font-medium text-[#F8F8F8] mb-2">Province *</label>
              <input
                {...register('address.province')}
                id="customer-province"
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter province"
              />
              {errors.address?.province && <p className="mt-1 text-sm text-red-400">{errors.address.province.message}</p>}
            </div>

            <div>
              <label htmlFor="customer-postalCode" className="block text-sm font-medium text-[#F8F8F8] mb-2">Postal Code *</label>
              <input
                {...register('address.postalCode')}
                id="customer-postalCode"
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter postal code"
              />
              {errors.address?.postalCode && <p className="mt-1 text-sm text-red-400">{errors.address.postalCode.message}</p>}
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-lg font-semibold text-[#F8F8F8] mb-4">Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="customer-type" className="block text-sm font-medium text-[#F8F8F8] mb-2">Customer Type *</label>
              <select
                {...register('type')}
                id="customer-type"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>

            <div>
              <label htmlFor="customer-creditLimit" className="block text-sm font-medium text-[#F8F8F8] mb-2">Credit Limit (LKR)</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
                <input
                  {...register('creditLimit', { valueAsNumber: true })}
                  id="customer-creditLimit"
                  type="number"
                  min={0}
                  step={100}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="0.00"
                />
              </div>
              {errors.creditLimit && <p className="mt-1 text-sm text-red-400">{errors.creditLimit.message}</p>}
            </div>

            <div>
              <label htmlFor="customer-loyaltyPoints" className="block text-sm font-medium text-[#F8F8F8] mb-2">Loyalty Points</label>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#F8F8F8]/50" />
                <input
                  {...register('loyaltyPoints', { valueAsNumber: true })}
                  id="customer-loyaltyPoints"
                  type="number"
                  min={0}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                  placeholder="0"
                />
              </div>
              {errors.loyaltyPoints && <p className="mt-1 text-sm text-red-400">{errors.loyaltyPoints.message}</p>}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="customer-taxId" className="block text-sm font-medium text-[#F8F8F8] mb-2">Tax ID</label>
              <input
                  {...register('taxId')}
                  id="customer-taxId"
                  type="text"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="Enter tax ID"
              />
            </div>

            <div>
              <label htmlFor="customer-birthday" className="block text-sm font-medium text-[#F8F8F8] mb-2">Birthday</label>
              <input
                  {...register('birthday')}
                  id="customer-birthday"
                  type="date"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <label htmlFor="customer-notes" className="block text-sm font-medium text-[#F8F8F8] mb-2">Notes</label>
          <textarea
            {...register('notes')}
            id="customer-notes"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30 resize-none"
            placeholder="Enter any additional notes about the customer..."
          />
        </div>
      </form>
    </FormModal>
  );
};

export default CustomerForm;
