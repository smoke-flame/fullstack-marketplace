export const cartErrorCodes = {
  limitExceeded: 'cart.CART_LIMIT_EXCEEDED',
  productUnavailable: 'cart.PRODUCT_UNAVAILABLE',
} as const;

export type CartErrorCode = (typeof cartErrorCodes)[keyof typeof cartErrorCodes];
