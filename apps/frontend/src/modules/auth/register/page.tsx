'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useState } from 'react';
import { registerUser } from '@/modules/auth/api';
import { toast } from '@/shared/ui/toast';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { UserRole } from '@marketplace/contracts/models/user';
import { GuestOnly } from '../guest-only';

const registerFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
  }
});

type RegisterFormData = z.infer<typeof registerFormSchema>;

export function RegisterPage() {
  const router = useRouter();
  const [isSeller, setIsSeller] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onChange',
  });
  const watched = watch();
  const allFilled = !!(watched?.email && watched?.password && watched?.confirmPassword);
  const canSubmit = allFilled && Object.keys(errors || {}).length === 0;

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const roles = [UserRole.BUYER, ...(isSeller ? [UserRole.SELLER] : [])];
      await registerUser({ email: data.email, password: data.password, roles });
      toast.success('Account created! Please sign in.');
      router.push('/login');
    } catch {
      // error handled by interceptor toast
    }
  };

  return (
    <GuestOnly>
      <div className="grid min-h-screen place-items-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-muted-foreground">Join the Marketplace</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-test-id="register-email"
                type="email"
                isInvalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-test-id="register-password"
                type="password"
                isInvalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                data-test-id="register-confirm"
                type="password"
                isInvalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" data-test-id="register-seller-checkbox" checked={isSeller} onChange={(e) => setIsSeller(e.target.checked)} />
              I also want to sell items
            </label>
            <Button type="submit" data-test-id="register-submit" className="w-full" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Sign up'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary underline">Sign in</Link>
          </p>
        </div>
      </div>
    </GuestOnly>
  );
}
