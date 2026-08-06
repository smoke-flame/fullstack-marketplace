let refreshHandler: ((accessToken: string, refreshToken: string) => void) | null = null;

export function onTokenRefreshed(accessToken: string, refreshToken: string) {
  refreshHandler?.(accessToken, refreshToken);
}

export function registerRefreshHandler(handler: (accessToken: string, refreshToken: string) => void) {
  refreshHandler = handler;
}
