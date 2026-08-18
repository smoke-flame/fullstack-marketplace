export const orderErrorCodes = {
  notFound: 'order.NOT_FOUND',
  notCancellable: 'order.NOT_CANCELLABLE',
  invalidTransition: 'order.INVALID_TRANSITION',
  sagaTimeout: 'order.SAGA_TIMEOUT',
} as const;

export type OrderErrorCode = (typeof orderErrorCodes)[keyof typeof orderErrorCodes];
