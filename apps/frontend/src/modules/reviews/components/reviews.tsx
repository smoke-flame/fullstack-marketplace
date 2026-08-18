'use client';

import { useState } from 'react';
import { useAsync } from '@/shared/hooks';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/ui/toast';
import { getRating, getReviews, createReview, deleteReview } from '@/modules/reviews/api';
import type { CreateReviewRequest } from '@marketplace/contracts/models/review/review';
import { createReviewRequestSchema } from '@marketplace/contracts/models/review/review';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface RatingDisplayProps {
  productId: string;
}

export function RatingDisplay({ productId }: RatingDisplayProps) {
  const { data: rating, loading } = useAsync(() => getRating(productId), [productId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading rating...</div>;
  }

  if (!rating || rating.count === 0) {
    return <div className="text-sm text-muted-foreground">No ratings yet</div>;
  }

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(rating.avg));

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {stars.map((filled, i) => (
          <span key={i} className={`text-lg ${filled ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
        ))}
      </div>
      <span className="text-sm font-medium">{rating.avg.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">({rating.count} review{rating.count !== 1 ? 's' : ''})</span>
    </div>
  );
}

interface ReviewFormProps {
  productId: string;
  onReviewCreated: () => void;
}

export function ReviewForm({ productId, onReviewCreated }: ReviewFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateReviewRequest>({
    resolver: zodResolver(createReviewRequestSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: CreateReviewRequest) => {
    setSubmitting(true);
    try {
      await createReview(productId, data);
      toast.success('Review submitted');
      reset();
      onReviewCreated();
    } catch {
      // error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 rounded-lg border p-6">
      <h3 className="text-lg font-semibold">Write a Review</h3>
      <div className="space-y-2">
        <Label htmlFor="rating">Rating</Label>
        <Input
          id="rating"
          type="number"
          min={1}
          max={5}
          isInvalid={!!errors.rating}
          {...register('rating', { valueAsNumber: true })}
        />
        {errors.rating && <p className="text-sm text-destructive">{errors.rating.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="text">Review (optional)</Label>
        <Input
          id="text"
          isInvalid={!!errors.text}
          {...register('text')}
        />
        {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting || submitting}>
        {isSubmitting || submitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
}

interface ReviewListProps {
  productId: string;
  currentUserId?: string;
  onReviewDeleted: () => void;
}

export function ReviewList({ productId, currentUserId, onReviewDeleted }: ReviewListProps) {
  const { data, loading } = useAsync(() => getReviews(productId), [productId]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (reviewId: string) => {
    setDeletingId(reviewId);
    try {
      await deleteReview(reviewId);
      toast.success('Review deleted');
      onReviewDeleted();
    } catch {
      // error handled by interceptor
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="mt-6 text-sm text-muted-foreground">Loading reviews...</div>;
  }

  const reviews = data?.reviews ?? [];

  if (reviews.length === 0) {
    return <div className="mt-6 text-sm text-muted-foreground">No reviews yet. Be the first to review!</div>;
  }

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-lg font-semibold">Reviews</h3>
      {reviews.map((review) => (
        <div key={review.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">{'★'.repeat(review.rating)}</span>
                <span className="text-sm text-muted-foreground">{review.rating}/5</span>
              </div>
              {review.text && <p className="mt-2 text-sm">{review.text}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Buyer: {review.buyerId.slice(0, 8)}... • {new Date(review.createdAt).toLocaleDateString()}
              </p>
            </div>
            {currentUserId === review.buyerId && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(review.id)}
                disabled={deletingId === review.id}
              >
                {deletingId === review.id ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
