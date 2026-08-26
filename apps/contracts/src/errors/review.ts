export const reviewErrorCodes = {
  reviewAlreadyExists: 'reviews.REVIEW_ALREADY_EXISTS',
  reviewNotFound: 'reviews.NOT_FOUND',
  reviewForbidden: 'reviews.FORBIDDEN',
  purchaseNotFound: 'reviews.PURCHASE_NOT_FOUND',
} as const;

export type ReviewErrorCode = (typeof reviewErrorCodes)[keyof typeof reviewErrorCodes];
