'use client';

import { Provider } from 'react-redux';
import { store } from '@/store';
import { useAppDispatch } from '@/shared/hooks';
import { setCredentials } from '@/modules/auth/userSlice';
import { registerRefreshHandler } from '@/modules/auth/refreshSync';
import { getAccessToken, getRefreshToken } from '@/modules/auth/auth';
import { UserRole } from '@marketplace/contracts/models/user';
import { useEffect } from 'react';

function ReduxInit({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const rawRoles = Array.isArray(payload.roles) ? payload.roles : [];
        const roles = rawRoles.filter((r: string): r is UserRole => r === UserRole.BUYER || r === UserRole.SELLER);
        const user = {
          id: payload.sub,
          email: (payload.email || payload.sub || '') as string,
          roles,
        };
        dispatch(setCredentials({ user, accessToken: token, refreshToken: refreshToken || '' }));
      } catch {
        // ignore invalid token
      }
    }

    registerRefreshHandler((accessToken, refreshToken) => {
      dispatch(setCredentials({
        user: store.getState().user.user!,
        accessToken,
        refreshToken: refreshToken,
      }));
    });
  }, [dispatch]);

  return children;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ReduxInit>{children}</ReduxInit>
    </Provider>
  );
}
