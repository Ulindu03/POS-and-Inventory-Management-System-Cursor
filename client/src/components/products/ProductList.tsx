import { useQuery } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender, createColumnHelper, type Row, type ColumnDef, type HeaderGroup } from '@tanstack/react-table';
import { productsApi, type ProductListItem } from '../../lib/api/products.api';
import { useMemo, useState } from 'react';

interface ProductListProps {
  readonly onAdd: () => void;
  readonly onEdit: (product: ProductListItem) => void;
  readonly onDelete: (product: ProductListItem) => void;
}

export default function ProductList({ onAdd, onEdit, onDelete }: ProductListProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.list({ q: search }),
    retry: 1,
  });
  const items: ProductListItem[] = (data as any)?.data?.items ?? [];

  const columnHelper = useMemo(() => createColumnHelper<ProductListItem>(), []);
  const columns = useMemo<ColumnDef<ProductListItem, any>[]>(
    () => [
      columnHelper.accessor('sku', { header: 'SKU', cell: (info: any) => info.getValue() as string }),
      columnHelper.accessor((row: ProductListItem) => row.name?.en ?? '', { id: 'name', header: 'Name', cell: (info: any) => info.getValue() as string }),
      columnHelper.accessor((row: ProductListItem) => row.price?.retail ?? 0, { id: 'price', header: 'Price', cell: (info: any) => info.getValue() as number }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: Row<ProductListItem> }) => (
          <div>
            <button className="btn btn-xs btn-info mr-2" onClick={() => onEdit(row.original)}>Edit</button>
            <button className="btn btn-xs btn-error" onClick={() => onDelete(row.original)}>Delete</button>
          </div>
        ),
      }),
    ],
    [columnHelper, onEdit, onDelete]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  let tableSection: React.ReactNode;
  if (isLoading) {
    tableSection = <div className="text-center py-8 text-[#F8F8F8]/70">Loading...</div>;
  } else if (isError) {
    tableSection = <div className="text-center py-8 text-red-400">{(error as any)?.message || 'Failed to load products'}</div>;
  } else if (items.length === 0) {
    tableSection = <div className="text-center py-8 text-[#F8F8F8]/70">No products found.</div>;
  } else {
    const headerGroups: HeaderGroup<ProductListItem>[] = table.getHeaderGroups();
    const rows = table.getRowModel().rows as Row<ProductListItem>[];
    tableSection = (
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
      {headerGroups.map((hg: HeaderGroup<ProductListItem>) => (
              <tr key={hg.id}>
        {hg.headers.map((header: any) => (
                  <th key={header.id} className="cursor-pointer select-none" onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' \u2191', desc: ' \u2193' }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
      {rows.map((row: Row<ProductListItem>) => (
              <tr key={row.id}>
        {row.getVisibleCells().map((cell: any) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white/10 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#F8F8F8]">Product List</h2>
          <button className="btn btn-primary" onClick={onAdd}>Add Product</button>
        </div>
        <div className="flex items-center mb-4">
          <input
            className="input input-bordered mr-2 w-full max-w-xs"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {tableSection}
      </div>
    </div>
  );
}
