'use client';

import { Provider } from 'react-redux';
import { store } from '@/store';
import { useAppDispatch } from '@/shared/hooks';
import { logout, setCredentials, setInitialized, setLoading } from '@/modules/auth/userSlice';
import { registerRefreshHandler } from '@/modules/auth/refreshSync';
import { clearTokens, getAccessToken, getRefreshToken } from '@/modules/auth/auth';
import { getMe } from '@/modules/auth/api';
import { useEffect } from 'react';

function ReduxInit({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    dispatch(setLoading(true));
    const token = getAccessToken();
    const refreshToken = getRefreshToken();

    const initialize = async () => {
      if (token) {
        try {
          const user = await getMe();
          if (active) dispatch(setCredentials({ user, accessToken: getAccessToken() ?? token, refreshToken: getRefreshToken() ?? refreshToken ?? '' }));
        } catch {
          clearTokens();
          if (active) dispatch(logout());
        }
      }
      if (active) {
        dispatch(setLoading(false));
        dispatch(setInitialized(true));
      }
    };

    void initialize();
    registerRefreshHandler((accessToken, nextRefreshToken) => {
      const currentUser = store.getState().user.user;
      if (currentUser) dispatch(setCredentials({ user: currentUser, accessToken, refreshToken: nextRefreshToken }));
    });
    return () => { active = false; };
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
