import FormModal from '@/components/ui/FormModal';
import { Trash2 } from 'lucide-react';

type ProductDeleteDialogProps = Readonly<{
  product: { name?: { en?: string } } | null | undefined;
  onConfirm: (product: any) => void;
  onCancel: () => void;
}>;

export default function ProductDeleteDialog({ product, onConfirm, onCancel }: ProductDeleteDialogProps) {
  if (!product) return null;
  return (
    <FormModal
      isOpen={true}
      onClose={onCancel}
      title="Delete Product"
      subtitle="This action cannot be undone"
      icon={<Trash2 className="w-6 h-6 text-[#F8F8F8]" />}
      widthClass="max-w-md"
      footer={(
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(product)}
            className="px-4 py-2 rounded-xl bg-red-500 text-white"
          >
            Delete
          </button>
        </div>
      )}
    >
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-[#F8F8F8]">
        Are you sure you want to delete <b>{product.name?.en || 'this product'}</b>?
      </div>
    </FormModal>
  );
}
