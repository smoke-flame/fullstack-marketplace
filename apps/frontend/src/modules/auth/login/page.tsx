'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser } from '@/modules/auth/api';
import { setAccessToken, setRefreshToken } from '@/modules/auth/auth';
import { useAppDispatch } from '@/shared/hooks';
import { setCredentials } from '@/modules/auth/userSlice';
import { toast } from '@/shared/ui/toast';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { loginUserRequestSchema, type LoginUserRequest } from '@marketplace/contracts/api/auth/login';

export function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<LoginUserRequest>({
    resolver: zodResolver(loginUserRequestSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginUserRequest) => {
    try {
      const response = await loginUser(data);
      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      dispatch(setCredentials({ user: response.user, accessToken: response.accessToken, refreshToken: response.refreshToken }));
      toast.success('Welcome back!');
      router.push('/');
    } catch {
      // error handled by interceptor toast
    }
  };

  return (
    <div className="grid min-h-screen place-items-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-muted-foreground">Welcome back to Marketplace</p>
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
          <Button type="submit" className="w-full" disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account? <Link href="/register" className="text-primary underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
