'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useState } from 'react';
import { registerUser } from '@/modules/auth/api';
import { setAccessToken, setRefreshToken } from '@/modules/auth/auth';
import { useAppDispatch } from '@/shared/hooks';
import { setCredentials } from '@/modules/auth/userSlice';
import { toast } from '@/shared/ui/toast';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { UserRole } from '@marketplace/contracts/models/user';

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
  const dispatch = useAppDispatch();
  const [isSeller, setIsSeller] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const roles: UserRole[] = [UserRole.BUYER, ...(isSeller ? [UserRole.SELLER] : [])];
      const response = await registerUser({ email: data.email, password: data.password, roles });
      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      dispatch(setCredentials({ user: response.user, accessToken: response.accessToken, refreshToken: response.refreshToken }));
      toast.success('Account created!');
      router.push('/');
    } catch {
      // error handled by interceptor toast
    }
  };

  return (
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
              type="password"
              isInvalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isSeller} onChange={(e) => setIsSeller(e.target.checked)} />
            I also want to sell items
          </label>
          <Button type="submit" className="w-full" disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Sign up'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/login" className="text-primary underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
