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
import { useAppSelector } from '@/shared/hooks';
import { UserRole } from '@marketplace/contracts/models/user';

type CategoryNode = CategoryResponse & { children?: CategoryNode[] };

function flattenCategories(categories: CategoryResponse[]): CategoryResponse[] {
  const result: CategoryResponse[] = [];
  const visit = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      result.push(node);
      if (node.children) visit(node.children);
    }
  };
  visit(categories as CategoryNode[]);
  return result;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [parentSearch, setParentSearch] = useState('');
  const [parentCandidates, setParentCandidates] = useState<CategoryResponse[]>([]);
  const [selectedParent, setSelectedParent] = useState<CategoryResponse | null>(null);
  const isSeller = useAppSelector((state) => state.user.user?.roles.includes(UserRole.SELLER) ?? false);
  const { data: initialCategories, loading } = useAsync(getAllCategories, []);

  useEffect(() => {
    if (initialCategories) {
      setCategories(initialCategories);
      setParentCandidates(flattenCategories(initialCategories));
    }
  }, [initialCategories]);

  useEffect(() => {
    const query = parentSearch.trim();
    if (!query) {
      setParentCandidates(flattenCategories(categories));
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getAllCategories(controller.signal, query)
        .then((result) => setParentCandidates(flattenCategories(result)))
        .catch(() => {});
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [parentSearch, categories]);

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
      const category = await createCategory({
        title: data.title,
        parentId: selectedParent?.id ?? null,
      });
      setCategories((prev) => [...prev, category]);
      toast.success('Category created');
      reset();
      setParentSearch('');
      setSelectedParent(null);
    } catch {
      // error handled by interceptor
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Loading categories...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold">Categories</h1>

      {isSeller && <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4 rounded-lg border p-6">
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
          <Label htmlFor="parentCategory">Parent Category (optional)</Label>
          <Input
            id="parentCategory"
            placeholder="Search categories..."
            value={selectedParent ? selectedParent.title : parentSearch}
            onChange={(event) => {
              setSelectedParent(null);
              setParentSearch(event.target.value);
            }}
          />
          {selectedParent && (
            <button
              type="button"
              className="text-sm text-muted-foreground underline"
              onClick={() => { setSelectedParent(null); setParentSearch(''); }}
            >
              Clear parent category
            </button>
          )}
          {!selectedParent && parentSearch.trim() && (
            <div className="max-h-48 overflow-y-auto rounded-md border bg-background">
              {parentCandidates.length > 0 ? parentCandidates.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => { setSelectedParent(category); setParentSearch(category.title); }}
                >
                  {category.title}
                </button>
              )) : <p className="px-3 py-2 text-sm text-muted-foreground">No categories found.</p>}
            </div>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Category'}
        </Button>
      </form>}

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
