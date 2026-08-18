'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/ui/toast';
import { z } from 'zod';

const paymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['card', 'paypal', 'bank_transfer']),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export function PaymentPage() {
  const [processing, setProcessing] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (_data: PaymentFormData) => {
    setProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Payment processed successfully');
    } catch {
      toast.error('Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">Payment</h1>
      <p className="mt-2 text-muted-foreground">Process a payment for your order</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Label htmlFor="orderId">Order ID</Label>
          <Input
            id="orderId"
            placeholder="UUID"
            isInvalid={!!errors.orderId}
            {...register('orderId')}
          />
          {errors.orderId && <p className="text-sm text-destructive">{errors.orderId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min={0}
            isInvalid={!!errors.amount}
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">Payment Method</Label>
          <select
            id="method"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register('method')}
          >
            <option value="card">Credit Card</option>
            <option value="paypal">PayPal</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
          {errors.method && <p className="text-sm text-destructive">{errors.method.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || processing}>
          {isSubmitting || processing ? 'Processing...' : 'Pay Now'}
        </Button>
      </form>
    </div>
  );
}
