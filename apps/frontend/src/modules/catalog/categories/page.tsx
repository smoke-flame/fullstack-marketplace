'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/ui/toast';
import { getAllCategories, createCategory } from '@/modules/catalog/api';
import type { CategoryResponse } from '@marketplace/contracts/api/catalog/categories';
import { createCategoryRequestSchema, type CreateCategoryRequest } from '@marketplace/contracts/api/catalog/categories';
import { useAsync } from '@/shared/hooks';
import { useEffect, useState } from 'react';

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const { loading } = useAsync(getAllCategories, []);

  useEffect(() => {
    if (categories.length > 0) return;
    getAllCategories().then(setCategories).catch(() => {});
  }, [categories.length]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryRequest>({
    resolver: zodResolver(createCategoryRequestSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: CreateCategoryRequest) => {
    try {
      const category = await createCategory(data);
      setCategories((prev) => [...prev, category]);
      toast.success('Category created');
      reset();
    } catch {
      // error handled by interceptor
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Loading categories...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Categories</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Create Category</h2>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Category name"
            isInvalid={!!errors.title}
            {...register('title')}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentId">Parent Category ID (optional)</Label>
          <Input
            id="parentId"
            placeholder="UUID"
            isInvalid={!!errors.parentId}
            {...register('parentId')}
          />
          {errors.parentId && <p className="text-sm text-destructive">{errors.parentId.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Category'}
        </Button>
      </form>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <div key={category.id} className="rounded-lg border p-4">
            <h3 className="font-semibold">{category.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{category.id}</p>
            {category.parentId && (
              <p className="mt-1 text-xs text-muted-foreground">Parent: {category.parentId}</p>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">No categories yet.</p>
      )}
    </div>
  );
}
