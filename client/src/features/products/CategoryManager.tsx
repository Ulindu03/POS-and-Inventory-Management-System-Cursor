import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api/products.api';
import FormModal from '@/components/ui/FormModal';
import { Folder, Save } from 'lucide-react';

type Category = {
  _id?: string;
  name: { en: string; si: string };
  description?: { en?: string; si?: string };
  parent?: string | null;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export const CategoryManager: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });
  const items: Category[] = (data as any)?.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: Category) => categoriesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }).then(() => setShowForm(false)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Category }) => categoriesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }).then(() => setShowForm(false)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      (c.name?.en || '').toLowerCase().includes(q) || (c.name?.si || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const startCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const startEdit = (cat: Category) => {
    setEditing(cat);
    setShowForm(true);
  };
  const doDelete = (id?: string) => {
    if (!id) return;
    if (confirm('Delete this category?')) deleteMutation.mutate(id);
  };

  let tableContent: React.ReactNode;
  if (isLoading) {
    tableContent = <div className="p-6 text-[#F8F8F8]/70">Loading...</div>;
  } else if (isError) {
    tableContent = (
      <div className="p-6 text-red-400">{(error as any)?.message || 'Failed to load categories'}</div>
    );
  } else if (filtered.length === 0) {
    tableContent = <div className="p-6 text-[#F8F8F8]/70">No categories found.</div>;
  } else {
    tableContent = (
      <table className="w-full">
        <thead className="bg-white/5 border-b border-white/10">
          <tr>
            <th className="text-left px-4 py-2 text-[#F8F8F8]/70 text-xs uppercase">Name (EN)</th>
            <th className="text-left px-4 py-2 text-[#F8F8F8]/70 text-xs uppercase">Name (SI)</th>
            <th className="text-left px-4 py-2 text-[#F8F8F8]/70 text-xs uppercase">Parent</th>
            <th className="text-left px-4 py-2 text-[#F8F8F8]/70 text-xs uppercase">Color</th>
            <th className="text-left px-4 py-2 text-[#F8F8F8]/70 text-xs uppercase">Active</th>
            <th className="text-left px-4 py-2 text-[#F8F8F8]/70 text-xs uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {filtered.map((c) => {
            const parentName = items.find((p: any) => p._id === c.parent)?.name?.en || '-';
            return (
              <tr key={c._id as string} className="hover:bg-white/5">
                <td className="px-4 py-2 text-[#F8F8F8]">{c.name?.en}</td>
                <td className="px-4 py-2 text-[#F8F8F8]/80">{c.name?.si}</td>
                <td className="px-4 py-2 text-[#F8F8F8]/80">{parentName}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded" style={{ backgroundColor: c.color || '#667eea' }} />
                    <span className="text-[#F8F8F8]/80">{c.color || '#667eea'}</span>
                  </span>
                </td>
                <td className="px-4 py-2 text-[#F8F8F8]/80">{c.isActive !== false ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20" onClick={() => startEdit(c)}>Edit</button>
                    <button className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300" onClick={() => doDelete(c._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#F8F8F8]">Category Manager</h2>
          <p className="text-[#F8F8F8]/70">Manage product categories and hierarchy</p>
        </div>
        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-xl font-semibold"
          style={{ background: 'linear-gradient(135deg,#FFE100,#FFD100)', color: '#000' }}
        >
          + Add Category
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none"
        />
      </div>

  <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">{tableContent}</div>

      {showForm && (
        <CategoryForm
          allCategories={items}
          initial={editing || undefined}
          submitting={createMutation.isPending || updateMutation.isPending}
          onCancel={() => setShowForm(false)}
          onSubmit={(payload) => {
            if (editing?._id) updateMutation.mutate({ id: editing._id, payload });
            else createMutation.mutate(payload);
          }}
        />
      )}
    </div>
  );
};

type CategoryFormProps = Readonly<{
  allCategories: Category[];
  initial?: Category;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (payload: Category) => void;
}>;

function CategoryForm({
  allCategories,
  initial,
  submitting,
  onCancel,
  onSubmit,
}: CategoryFormProps) {
  const [form, setForm] = useState<Category>(
    initial || {
      name: { en: '', si: '' },
      description: { en: '', si: '' },
      parent: null,
      color: '#667eea',
      isActive: true,
      sortOrder: 0,
    }
  );

  let submitText = 'Create';
  if (initial) submitText = 'Update';
  if (submitting) submitText = 'Saving...';

  return (
    <FormModal
      isOpen
      onClose={onCancel}
      title={initial ? 'Edit Category' : 'Add New Category'}
      subtitle={initial ? 'Update category details' : 'Create a new product category'}
      icon={<Folder className="w-6 h-6 text-[#F8F8F8]" />}
      widthClass="max-w-xl"
      footer={(
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] hover:bg-white/20 disabled:opacity-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            form="category-form"
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white flex items-center gap-2 disabled:opacity-50"
            disabled={submitting}
          >
            <Save className="w-4 h-4" /> {submitText}
          </button>
        </div>
      )}
    >
      <form
        id="category-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h4 className="text-[#F8F8F8] font-semibold mb-3">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#F8F8F8] mb-2" htmlFor="cat-name-en">Name (English) *</label>
              <input
                id="cat-name-en"
                value={form.name.en}
                onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })}
                placeholder="Enter category name (EN)"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#F8F8F8] mb-2" htmlFor="cat-name-si">Name (Sinhala) *</label>
              <input
                id="cat-name-si"
                value={form.name.si}
                onChange={(e) => setForm({ ...form, name: { ...form.name, si: e.target.value } })}
                placeholder="වර්ග නාමය (සිංහල)"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#F8F8F8] mb-2" htmlFor="cat-desc-en">Description (EN)</label>
              <textarea
                id="cat-desc-en"
                value={form.description?.en || ''}
                onChange={(e) => setForm({ ...form, description: { ...(form.description || {}), en: e.target.value } })}
                placeholder="Short description in English"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#F8F8F8] mb-2" htmlFor="cat-desc-si">Description (SI)</label>
              <textarea
                id="cat-desc-si"
                value={form.description?.si || ''}
                onChange={(e) => setForm({ ...form, description: { ...(form.description || {}), si: e.target.value } })}
                placeholder="ස්කන්ධ විස්තරය (සිංහල)"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h4 className="text-[#F8F8F8] font-semibold mb-3">Hierarchy & Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#F8F8F8] mb-2" htmlFor="cat-parent">Parent Category</label>
              <select
                id="cat-parent"
                value={form.parent || ''}
                onChange={(e) => setForm({ ...form, parent: e.target.value || null })}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] focus:outline-none focus:border-white/30"
              >
                <option value="">No parent (root)</option>
                {allCategories
                  .filter((c) => c._id !== initial?._id)
                  .map((c) => (
                    <option key={c._id} value={c._id}>{c.name.en}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#F8F8F8] mb-2" htmlFor="category-color">Color</label>
              <input
                id="category-color"
                type="color"
                value={form.color || '#667eea'}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-[52px] rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#F8F8F8] mb-2" htmlFor="cat-sort">Sort order</label>
              <input
                id="cat-sort"
                type="number"
                value={form.sortOrder || 0}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value || '0', 10) })}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] placeholder-[#F8F8F8]/50 focus:outline-none focus:border-white/30"
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-3 pt-7">
              <input
                id="active"
                type="checkbox"
                className="w-5 h-5"
                checked={form.isActive !== false}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="active" className="text-sm text-[#F8F8F8]">Active</label>
            </div>
          </div>
        </div>
      </form>
    </FormModal>
  );
}
