'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProductRequestSchema, type CreateProductRequest } from '@marketplace/contracts/api/catalog/products';
import type { CategoryResponse } from '@marketplace/contracts/api/catalog/categories';
import { createProduct } from '@/modules/catalog/api';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/ui/toast';

type Node = CategoryResponse & { children?: Node[] };
function flatten(nodes: CategoryResponse[]): CategoryResponse[] {
  const result: CategoryResponse[] = [];
  const visit = (items: Node[]) => items.forEach((item) => { result.push(item); if (item.children) visit(item.children); });
  visit(nodes as Node[]);
  return result;
}

export function CreateProductModal({ categories, onClose, onCreated }: { categories: CategoryResponse[]; onClose: () => void; onCreated: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateProductRequest>({ resolver: zodResolver(createProductRequestSchema) });
  const onSubmit = async (data: CreateProductRequest) => {
    try { await createProduct(data); toast.success('Product created'); onCreated(); onClose(); }
    catch { /* interceptor handles errors */ }
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
    <form onSubmit={handleSubmit(onSubmit)} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
      <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Create product</h2><button type="button" onClick={onClose} aria-label="Close">✕</button></div>
      <div className="space-y-2"><Label htmlFor="product-title">Title</Label><Input id="product-title" data-test-id="product-title-input" {...register('title')} />{errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="product-description">Description</Label><textarea id="product-description" data-test-id="product-description" className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" {...register('description')} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="product-price">Price</Label><Input id="product-price" data-test-id="product-price" type="number" min="1" {...register('price', { valueAsNumber: true })} />{errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="product-category">Category</Label><select id="product-category" data-test-id="product-category" className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...register('categoryId')}><option value="">Choose category</option>{flatten(categories).map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select>{errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}</div></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button data-test-id="create-product-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create product'}</Button></div>
    </form>
  </div>;
}
