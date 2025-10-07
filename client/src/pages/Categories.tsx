// This file shows the Categories page.
// In simple English: It lets users manage product categories in the POS system.
import { AppLayout } from '@/components/common/Layout/Layout';
import { CategoryManager } from '@/features/products/CategoryManager';

export default function CategoriesPage() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#F8F8F8]">Categories</h1>
        </div>
        <CategoryManager />
      </div>
    </AppLayout>
  );
}
