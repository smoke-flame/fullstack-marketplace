export const catalogErrorCodes = {
  categoryDepthExceeded: 'catalog.CATEGORY_DEPTH_EXCEEDED',
  categoryNotFound: 'catalog.CATEGORY_NOT_FOUND',
  productNotFound: 'catalog.PRODUCT_NOT_FOUND',
  forbidden: 'catalog.FORBIDDEN',
} as const;

export type CatalogErrorCode = (typeof catalogErrorCodes)[keyof typeof catalogErrorCodes];
