import { Injectable } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { PaymentRepository } from './payment.repository';
import type { PaymentResponse, PaymentStatus } from '@marketplace/contracts/models/payment';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    orderId: string;
    buyerId: string;
    amount: number;
    status: PaymentStatus;
    reason?: string;
  }): Promise<{ payment: PaymentResponse; created: boolean }> {
    try {
      const payment = await this.prisma.payment.create({
        data: {
          orderId: data.orderId,
          buyerId: data.buyerId,
          amount: data.amount,
          status: data.status,
          reason: data.reason ?? null,
        },
      });
      return { payment: this.mapPayment(payment), created: true };
    } catch (error: unknown) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const payment = await this.prisma.payment.findUniqueOrThrow({ where: { orderId: data.orderId } });
      return { payment: this.mapPayment(payment), created: false };
    }
  }

  async findByOrderId(orderId: string): Promise<PaymentResponse | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return payment ? this.mapPayment(payment) : null;
  }

  async findByIdempotentKey(sagaId: string): Promise<PaymentResponse | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId: sagaId },
      orderBy: { createdAt: 'asc' },
    });
    return payment ? this.mapPayment(payment) : null;
  }

  async updateStatus(id: string, status: PaymentStatus, reason?: string): Promise<PaymentResponse> {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        status,
        reason: reason ?? null,
      },
    });
    return this.mapPayment(payment);
  }

  async transitionStatus(id: string, from: PaymentStatus, to: PaymentStatus, reason?: string): Promise<PaymentResponse | null> {
    const result = await this.prisma.payment.updateMany({
      where: { id, status: from },
      data: { status: to, reason: reason ?? null },
    });
    if (!result.count) return null;
    return this.findByOrderId((await this.prisma.payment.findUniqueOrThrow({ where: { id } })).orderId);
  }

  async findByBuyerIdAndOrderId(buyerId: string, orderId: string): Promise<PaymentResponse[]> {
    const payments = await this.prisma.payment.findMany({
      where: { buyerId, orderId },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map(this.mapPayment);
  }

  private mapPayment(payment: {
    id: string;
    orderId: string;
    buyerId: string;
    amount: number;
    status: PaymentStatus;
    reason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentResponse {
    return {
      id: payment.id,
      orderId: payment.orderId,
      buyerId: payment.buyerId,
      amount: payment.amount,
      status: payment.status,
      reason: payment.reason as PaymentResponse['reason'],
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
