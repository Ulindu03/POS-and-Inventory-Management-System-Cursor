// Products management page for creating, editing, and organizing inventory items
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  // State for active tab (products list or categories)
  const [activeTab, setActiveTab] = useState<ProductTab>('list');
  // State for which modal is currently open
  const [activeModal, setActiveModal] = useState<ProductModal>(null);
  // State for product being edited
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  // State for product being deleted
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  // State for product sticker printing
  const [stickerProduct, setStickerProduct] = useState<any>(null); // null allowed implicitly

  // Listen for sticker printing events from other components
  useEffect(() => {
    const handler = (e: any) => setStickerProduct(e.detail.product);
    window.addEventListener('vz-stickers-open', handler as any);
    return () => window.removeEventListener('vz-stickers-open', handler as any);
  }, []);

  const { t } = useTranslation();

  // Tab configuration for switching between products and categories
  const tabs = [
    { id: 'list' as const, label: t('productsPage.tabs.products'), icon: '📦' },
    { id: 'categories' as const, label: t('productsPage.tabs.categories'), icon: '🏷️' },
  ];

  // Open edit modal for existing product
  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setActiveModal('edit');
  };

  // Open create modal for new product
  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setActiveModal('create');
  };

  // Deletion dialog trigger now handled inline where needed; removed unused handler

  // Close any open modal and reset state
  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedProduct(null);
  };

  // Export all products to CSV file
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

  // Import products from CSV file
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
    <AppLayout className="bg-[#242424]">
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header with title and action buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="text-center lg:text-left flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-2 tracking-tight">
              {t('productsPage.title')}
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto lg:mx-0">
              {t('productsPage.subtitle')}
            </p>
          </div>
          {/* Action buttons for product management */}
          <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
            <button
              onClick={handleCreateProduct}
              className="relative group px-5 py-2.5 rounded-2xl font-semibold text-sm tracking-wide flex items-center gap-2 text-black shadow hover:shadow-lg transition-all bg-gradient-to-br from-amber-300 via-yellow-300 to-amber-200 hover:from-amber-200 hover:via-yellow-200 hover:to-amber-100"
            >
              <span className="drop-shadow-sm">➕ {t('productsPage.addProduct')}</span>
            </button>
            <button
              onClick={() => setActiveModal('category')}
              className="px-5 py-2.5 rounded-2xl font-semibold text-sm tracking-wide bg-white/10 hover:bg-white/15 text-white/90 border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all"
            >
              🏷️ {t('productsPage.manageCategories')}
            </button>
            <button
              onClick={handleExport}
              className="px-5 py-2.5 rounded-2xl font-semibold text-sm tracking-wide bg-white/10 hover:bg-white/15 text-white/90 border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all"
            >
              ⬇️ {t('productsPage.exportCsv')}
            </button>
            <label className="px-5 py-2.5 rounded-2xl font-semibold text-sm tracking-wide bg-white/10 hover:bg-white/15 text-white/90 border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all cursor-pointer">
              <span>⬆️ {t('productsPage.importCsv')}</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleImport(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        {/* Tab navigation for switching between products and categories */}
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-2.5 rounded-2xl text-sm font-semibold tracking-wide transition-all backdrop-blur-sm border group overflow-hidden flex items-center gap-2 ${
                  active
                    ? 'border-blue-400/40 text-white bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-purple-500/20 shadow-[0_4px_24px_-6px_rgba(59,130,246,0.4)]'
                    : 'border-white/10 text-gray-300 bg-white/5 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span>{tab.icon}</span>
                  {tab.label}
                </span>
                {active && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-purple-500/20 opacity-60 group-hover:opacity-80 transition-opacity" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main content area showing either products list or category manager */}
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

      {/* Modal dialogs for product management */}
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
      {/* Sticker printing modal */}
      {stickerProduct && (
        <StickerPrintModal product={stickerProduct} onClose={() => setStickerProduct(null)} />
      )}
      {/* Product deletion confirmation dialog */}
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
