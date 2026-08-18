import type { PaymentResponse, PaymentStatus } from '@marketplace/contracts/models/payment';

export interface PaymentRepository {
  create(data: {
    orderId: string;
    buyerId: string;
    amount: number;
    status: PaymentStatus;
    reason?: string;
  }): Promise<{ payment: PaymentResponse; created: boolean }>;
  findByOrderId(orderId: string): Promise<PaymentResponse | null>;
  findByIdempotentKey(sagaId: string): Promise<PaymentResponse | null>;
  updateStatus(id: string, status: PaymentStatus, reason?: string): Promise<PaymentResponse>;
  transitionStatus(id: string, from: PaymentStatus, to: PaymentStatus, reason?: string): Promise<PaymentResponse | null>;
  findByBuyerIdAndOrderId(buyerId: string, orderId: string): Promise<PaymentResponse[]>;
}

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
