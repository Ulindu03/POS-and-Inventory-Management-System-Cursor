import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/common/Layout/Layout';
import { ProductList } from '@/features/products/ProductList';
import { ProductForm } from '@/features/products/ProductForm';
import { StickerPrintModal } from '@/features/products/StickerPrintModal';
import ProductDeleteDialog from '../components/products/ProductDeleteDialog';
import { CategoryManager } from '@/features/products/CategoryManager';
import { productsApi } from '@/lib/api/products.api';

type ProductTab = 'list' | 'categories';
type ProductModal = 'create' | 'edit' | 'category' | null;

const Products = () => {
  const [activeTab, setActiveTab] = useState<ProductTab>('list');
  const [activeModal, setActiveModal] = useState<ProductModal>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [stickerProduct, setStickerProduct] = useState<any | null>(null);

  useEffect(() => {
    const handler = (e: any) => setStickerProduct(e.detail.product);
    window.addEventListener('vz-stickers-open', handler as any);
    return () => window.removeEventListener('vz-stickers-open', handler as any);
  }, []);

  const tabs = [
    { id: 'list' as const, label: 'Products', icon: '📦' },
    { id: 'categories' as const, label: 'Categories', icon: '🏷️' },
  ];

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setActiveModal('edit');
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setActiveModal('create');
  };

  const handleDeleteProduct = (product: any) => {
    setDeletingProduct(product);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedProduct(null);
  };

  const handleExport = async () => {
    try {
      const blob = await productsApi.bulkExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products-export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
      alert('Export failed');
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    try {
      const res = await productsApi.bulkImport(file);
      alert(`Imported ${((res as any)?.data?.created) ?? 0} products`);
      window.location.reload();
    } catch (e) {
      console.error('Import failed', e);
      alert('Import failed');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F8F8F8]">Product Management</h1>
            <p className="text-[#F8F8F8]/70 mt-1">Manage your products, categories, and inventory</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCreateProduct}
              className="px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
            >
              ➕ Add Product
            </button>
            <button
              onClick={() => setActiveModal('category')}
              className="px-4 py-2 rounded-xl font-semibold bg-white/10 hover:bg-white/20 text-[#F8F8F8] border border-white/10 transition-all duration-200"
            >
              🏷️ Manage Categories
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-xl font-semibold bg-white/10 hover:bg-white/20 text-[#F8F8F8] border border-white/10 transition-all duration-200"
            >
              ⬇️ Export CSV
            </button>
            <label className="px-4 py-2 rounded-xl font-semibold bg-white/10 hover:bg-white/20 text-[#F8F8F8] border border-white/10 transition-all duration-200 cursor-pointer">
              <span>⬆️ Import CSV</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleImport(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white/20 text-[#F8F8F8] border border-white/20'
                  : 'bg-white/5 text-[#F8F8F8]/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[600px]">
          {activeTab === 'list' && (
            <ProductList 
              onEdit={handleEditProduct}
              onCreate={handleCreateProduct}
            />
          )}
          {activeTab === 'categories' && (
            <CategoryManager />
          )}
        </div>
      </div>

      {/* Modals */}
      {(activeModal === 'create' || activeModal === 'edit') && (
        <ProductForm
          product={selectedProduct}
          isOpen={true}
          onClose={handleCloseModal}
          onSuccess={() => {
            setActiveModal(null);
            setSelectedProduct(null);
            // Soft refresh: re-render list by reloading the page data instead of a hard reload
            // Hard reload can drop in-memory tokens in some browsers if running file:// or custom setups
            setTimeout(() => {
              window.dispatchEvent(new Event('vz-products-refresh'));
            }, 0);
          }}
        />
      )}
      {stickerProduct && (
        <StickerPrintModal product={stickerProduct} onClose={() => setStickerProduct(null)} />
      )}
      {deletingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <ProductDeleteDialog
              product={deletingProduct}
              onConfirm={() => {
                productsApi.delete(deletingProduct._id).then(() => {
                  setDeletingProduct(null);
                  window.location.reload();
                });
              }}
              onCancel={() => setDeletingProduct(null)}
            />
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Products;
