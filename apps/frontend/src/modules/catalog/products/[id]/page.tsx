'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/ui/toast';
import { getAllCategories, getProductById, updateProduct } from '@/modules/catalog/api';
import type { UpdateProductRequest } from '@marketplace/contracts/api/catalog/products';
import { updateProductRequestSchema } from '@marketplace/contracts/api/catalog/products';
import type { CategoryResponse } from '@marketplace/contracts/api/catalog/categories';
import { upsertItem } from '@/modules/cart/api';
import { useAppDispatch } from '@/shared/hooks';
import { upsertItem as upsertCartItem } from '@/store/cartSlice';
import { useAsync } from '@/shared/hooks';
import { RatingDisplay, ReviewForm, ReviewList } from '@/modules/reviews/components/reviews';
import { useAppSelector } from '@/shared/hooks';

type CategoryNode = CategoryResponse & { children?: CategoryNode[] };

function flattenCategories(categories: CategoryResponse[]): CategoryResponse[] {
  const flattened: CategoryResponse[] = [];
  const visit = (nodes: CategoryNode[]) => nodes.forEach((node) => {
    flattened.push(node);
    if (node.children) visit(node.children);
  });
  visit(categories as CategoryNode[]);
  return flattened;
}

export function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const dispatch = useAppDispatch();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const user = useAppSelector((state) => state.user.user);
  const [reviewsVersion, setReviewsVersion] = useState(0);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UpdateProductRequest>({
    resolver: zodResolver(updateProductRequestSchema),
  });

  const { data: product, loading } = useAsync(
    () => getProductById(id),
    [id],
  );

  useEffect(() => {
    if (!product || !editing) return;
    reset({
      title: product.title,
      description: product.description ?? '',
      price: product.price,
      categoryId: product.categoryId,
      status: product.status,
    });
    setCategoriesLoading(true);
    getAllCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setCategoriesLoading(false));
  }, [editing, product, reset]);

  const handleUpdate = async (data: UpdateProductRequest) => {
    try {
      await updateProduct(id, data);
      toast.success('Product updated');
      setEditing(false);
      window.location.reload();
    } catch {
      // error handled by interceptor
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      const cart = await upsertItem(product.id, { qty });
      dispatch(upsertCartItem(cart.items.find((i) => i.productId === product.id)!));
      toast.success('Added to cart');
    } catch {
      // error handled by interceptor
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Loading product...</div>;
  }

  if (!product) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Product not found.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/search" className="text-sm text-muted-foreground hover:underline">&larr; Back to search</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          {user?.id === product.sellerId && !editing && (
            <Button className="mt-4" variant="outline" onClick={() => setEditing(true)}>Edit product</Button>
          )}
          <p className="mt-4 text-4xl font-bold">${product.price}</p>
          <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${
            product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {product.status}
          </span>
          <p className="mt-6 text-muted-foreground">{product.description ?? 'No description provided.'}</p>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p>Seller: {product.sellerEmail ?? product.sellerId}</p>
            <p>Category: {product.categoryTitle ?? product.categoryId}</p>
            <p>Updated: {new Date(product.updatedAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-lg border p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={99}
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <Button className="w-full" onClick={handleAddToCart} disabled={adding}>
              {adding ? 'Adding...' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>
      {editing && user?.id === product.sellerId && (
        <form onSubmit={handleSubmit(handleUpdate)} className="mt-8 space-y-4 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Edit product</h2>
          <div className="space-y-2">
            <Label htmlFor="edit-title">Name</Label>
            <Input id="edit-title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <textarea id="edit-description" className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price</Label>
              <Input id="edit-price" type="number" min={1} {...register('price', { valueAsNumber: true })} />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select id="edit-status" className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...register('status')}>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <select id="edit-category" className="h-10 w-full rounded-md border bg-background px-3 text-sm" disabled={categoriesLoading} {...register('categoryId')}>
                {flattenCategories(categories).map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
              </select>
              {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting || categoriesLoading}>{isSubmitting ? 'Saving...' : 'Save changes'}</Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}
      <section className="mt-10 border-t pt-8">
        <h2 className="text-2xl font-semibold">Reviews</h2>
        <div className="mt-4"><RatingDisplay productId={id} /></div>
        <ReviewList key={reviewsVersion} productId={id} currentUserId={user?.id} onReviewDeleted={() => setReviewsVersion((version) => version + 1)} />
        {user && <ReviewForm productId={id} onReviewCreated={() => setReviewsVersion((version) => version + 1)} />}
      </section>
    </div>
  );
}
