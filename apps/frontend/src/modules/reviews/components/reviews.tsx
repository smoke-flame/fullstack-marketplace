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
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

type StarFill = 'full' | 'half' | 'empty';

function Star({ fill }: { fill: StarFill }) {
  return (
    <span className="relative inline-block leading-none text-gray-300" aria-hidden="true">
      ★
      {fill !== 'empty' && (
        <span
          className={`absolute inset-y-0 left-0 overflow-hidden text-yellow-500 ${fill === 'half' ? 'w-1/2' : 'w-full'}`}
          aria-hidden="true"
        >
          ★
        </span>
      )}
    </span>
  );
}

function StarRating({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1" role={onChange ? 'radiogroup' : undefined}>
      {Array.from({ length: 5 }, (_, index) => {
        const star = index + 1;
        const fill: StarFill = value >= star ? 'full' : value >= star - 0.5 ? 'half' : 'empty';
        const content = <Star fill={fill} />;

        if (!onChange) return <span key={star} className="text-2xl">{content}</span>;

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            data-test-id={`star-${star}`}
            aria-checked={value === star}
            className="rounded p-0.5 text-2xl transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() => onChange(star)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

interface RatingDisplayProps {
  productId: string;
  refreshVersion?: number;
}

export function RatingDisplay({ productId, refreshVersion }: RatingDisplayProps) {
  const { data: rating, loading } = useAsync(() => getRating(productId), [productId, refreshVersion]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading rating...</div>;
  }

  if (!rating || rating.count === 0) {
    return <div className="text-sm text-muted-foreground">No ratings yet</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <StarRating value={rating.avg} />
      <span data-test-id="rating-value" className="text-sm font-medium">{rating.avg.toFixed(1)}</span>
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
    control,
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
        <Label>Rating</Label>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <div className={errors.rating ? 'rounded-md ring-2 ring-destructive' : undefined}>
              <StarRating value={field.value ?? 0} onChange={field.onChange} />
            </div>
          )}
        />
        {errors.rating && <p className="text-sm text-destructive">{errors.rating.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="text">Review (optional)</Label>
        <Input
          id="text"
          data-test-id="review-text"
          isInvalid={!!errors.text}
          {...register('text')}
        />
        {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
      </div>
      <Button data-test-id="submit-review" type="submit" disabled={isSubmitting || submitting}>
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
                <StarRating value={review.rating} />
                <span className="text-sm text-muted-foreground">{review.rating}/5</span>
              </div>
              {review.text && <p className="mt-2 text-sm">{review.text}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Buyer: {currentUserId === review.buyerId ? 'You' : 'Customer'} • {new Date(review.createdAt).toLocaleDateString()}
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
