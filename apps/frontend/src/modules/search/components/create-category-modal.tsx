'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCategoryRequestSchema, type CategoryResponse, type CreateCategoryRequest } from '@marketplace/contracts/api/catalog/categories';
import { createCategory } from '@/modules/catalog/api';
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

export function CreateCategoryModal({ categories, onClose, onCreated }: { categories: CategoryResponse[]; onClose: () => void; onCreated: () => void }) {
  const [parentSearch, setParentSearch] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateCategoryRequest>({ resolver: zodResolver(createCategoryRequestSchema), defaultValues: { parentId: null } });
  const onSubmit = async (data: CreateCategoryRequest) => {
    try { await createCategory({ ...data, parentId: data.parentId || null }); toast.success('Category created'); onCreated(); onClose(); }
    catch { /* interceptor handles errors */ }
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-lg space-y-4 rounded-lg bg-background p-6 shadow-lg">
      <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Create category</h2><button type="button" onClick={onClose} aria-label="Close">✕</button></div>
      <div className="space-y-2"><Label htmlFor="category-title">Title</Label><Input id="category-title" data-test-id="category-title" {...register('title')} />{errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="category-parent-search">Parent category (optional)</Label><Input id="category-parent-search" placeholder="Search parent categories..." value={parentSearch} onChange={(event) => setParentSearch(event.target.value)} /><select id="category-parent" className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...register('parentId', { setValueAs: (value) => value || null })}><option value="">No parent</option>{flatten(categories).filter((category) => category.title.toLowerCase().includes(parentSearch.toLowerCase())).map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button data-test-id="create-category-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create category'}</Button></div>
    </form>
  </div>;
}
