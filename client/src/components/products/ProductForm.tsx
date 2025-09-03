/* eslint-disable jsx-a11y/label-has-associated-control */
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { productsApi, categoriesApi, type CategoryItem } from '../../lib/api/products.api';
import React, { useState } from 'react';

type ProductImage = { url: string };
type ProductFormData = {
  _id?: string;
  sku: string;
  name: { en: string; si: string };
  price: { retail: number };
  category: string;
  unit: string;
  images: ProductImage[];
};

interface ProductFormProps {
  readonly product?: ProductFormData;
  readonly onClose: () => void;
}

export default function ProductForm({ product, onClose }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(
    product || {
      sku: '',
      name: { en: '', si: '' },
      price: { retail: 0 },
      category: '',
      unit: 'pcs',
      images: [],
    }
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMsg, setImageMsg] = useState<string | null>(null);
  const { data: categories } = useQuery<{ success: true; data: { items: CategoryItem[] } }>({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: form._id
      ? (data: ProductFormData) => productsApi.update(form._id!, data)
      : (data: ProductFormData) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name.startsWith('name.')) {
      setForm((f) => ({ ...f, name: { ...f.name, [name.split('.')[1]]: value } }));
    } else if (name.startsWith('price.')) {
      setForm((f) => ({ ...f, price: { ...f.price, [name.split('.')[1]]: Number(value) } }));
    } else {
      setForm((f) => ({ ...f, [name]: value } as ProductFormData));
    }
  }

  async function handleImageUpload() {
    if (!imageFile) return;
    try {
      const res = await productsApi.uploadImage(imageFile);
      setForm((f) => ({ ...f, images: [...(f.images || []), { url: res.data.url }] }));
      setImageFile(null);
      setImageMsg('Image uploaded successfully');
    } catch {
      setImageMsg('Failed to upload image');
    } finally {
      setTimeout(() => setImageMsg(null), 2000);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <input name="sku" value={form.sku} onChange={handleChange} placeholder="SKU" className="input input-bordered w-full" required />
      <input name="name.en" value={form.name.en} onChange={handleChange} placeholder="Name (English)" className="input input-bordered w-full" required />
      <input name="name.si" value={form.name.si} onChange={handleChange} placeholder="Name (Sinhala)" className="input input-bordered w-full" required />
      <input name="price.retail" type="number" value={form.price.retail} onChange={handleChange} placeholder="Retail Price" className="input input-bordered w-full" required />
      <select name="category" value={form.category} onChange={handleChange} className="input input-bordered w-full" required>
        <option value="">Select Category</option>
        {categories?.data.items.map((cat) => (
          <option key={cat._id} value={cat._id}>{cat.name.en}</option>
        ))}
      </select>
      <input name="unit" value={form.unit} onChange={handleChange} placeholder="Unit" className="input input-bordered w-full" />
      <div>
  <label htmlFor="product-image" className="block mb-1">Product Image</label>
  <input id="product-image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
  {imageMsg && <div className="text-xs text-green-600 mt-1">{imageMsg}</div>}
        <button type="button" className="btn btn-secondary mt-2" onClick={handleImageUpload} disabled={!imageFile}>Upload Image</button>
        <div className="flex gap-2 mt-2">
          {form.images?.map((img: ProductImage) => (
            <img key={img.url} src={img.url} alt="Product" className="w-16 h-16 object-cover rounded" />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary">{form._id ? 'Update' : 'Add'} Product</button>
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
