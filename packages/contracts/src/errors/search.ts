export const searchErrorCodes = {
  invalidQuery: 'search.INVALID_QUERY',
} as const;

export type SearchErrorCode = (typeof searchErrorCodes)[keyof typeof searchErrorCodes];
