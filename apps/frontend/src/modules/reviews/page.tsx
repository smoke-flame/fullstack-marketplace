'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { getReviews, deleteReview, getRating } from '@/modules/reviews/api';
import type { ReviewResponse, ProductRating } from '@marketplace/contracts/models/review/review';
import { toast } from '@/shared/ui/toast';
import Link from 'next/link';

export function ReviewsPage() {
  const [productId, setProductId] = useState('');
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [rating, setRating] = useState<ProductRating | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const loadReviews = async () => {
    if (!productId) return;
    setReviewsLoading(true);
    try {
      const [reviewsData, ratingData] = await Promise.all([
        getReviews(productId),
        getRating(productId),
      ]);
      setReviews(reviewsData.items);
      setRating(ratingData);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (submitted && productId) {
      loadReviews();
    }
  }, [submitted, productId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success('Review deleted');
    } catch {
      // error handled by interceptor
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Reviews</h1>

      <form onSubmit={handleSearch} className="mt-8 flex gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="productId">Product ID</Label>
          <Input
            id="productId"
            placeholder="Enter product UUID"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={reviewsLoading || !productId}>
            {reviewsLoading ? 'Loading...' : 'Load Reviews'}
          </Button>
        </div>
      </form>

      {submitted && productId && (
        <div className="mt-8">
          <div className="flex items-center gap-4">
            <Link href={`/products/${productId}`} className="text-sm text-muted-foreground hover:underline">
              &larr; View product
            </Link>
          </div>

          {rating && rating.count > 0 && (
            <div className="mt-6 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Rating Summary</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-3xl font-bold">{rating.avg.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">{rating.count} review{rating.count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-4">
            {reviews.length === 0 ? (
              <p className="text-muted-foreground">No reviews found for this product.</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">{'★'.repeat(review.rating)}</span>
                        <span className="text-sm text-muted-foreground">{review.rating}/5</span>
                      </div>
                      {review.text && <p className="mt-2 text-sm">{review.text}</p>}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Buyer: Customer • {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(review.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
