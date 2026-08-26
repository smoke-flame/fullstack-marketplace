export const inventoryErrorCodes = {
  stockBelowReserved: 'inventory.STOCK_BELOW_RESERVED',
  insufficientStock: 'inventory.INSUFFICIENT_STOCK',
} as const;

export type InventoryErrorCode = (typeof inventoryErrorCodes)[keyof typeof inventoryErrorCodes];
