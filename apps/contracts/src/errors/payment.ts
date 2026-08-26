export const paymentErrorCodes = {
  paymentNotFound: 'payment.NOT_FOUND',
  paymentInvalidStatus: 'payment.INVALID_STATUS',
} as const;

export type PaymentErrorCode = (typeof paymentErrorCodes)[keyof typeof paymentErrorCodes];
