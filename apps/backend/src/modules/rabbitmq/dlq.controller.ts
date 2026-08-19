import { Controller, Post, Query, Body, Logger } from '@nestjs/common';
import { Internal } from '@modules/common/decorators/internal.decorator';
import { NotificationDlqService } from '@modules/notification/notification.dlq';
import { PaymentDlqService } from '@modules/payment/payment.dlq';

interface DlqReplayMessage {
  dlqType: 'notification' | 'payment';
  payload: Record<string, unknown>;
}

interface DlqReplayRequest {
  messages?: DlqReplayMessage[];
}

@Controller()
export class DlqController {
  private readonly logger = new Logger(DlqController.name);

  constructor(
    private readonly notificationDlq: NotificationDlqService,
    private readonly paymentDlq: PaymentDlqService,
  ) { }

  @Post('internal/dlq/replay')
  @Internal()
  async replayDlq(
    @Query('dlqType') dlqType?: 'notification' | 'payment',
    @Body() body?: DlqReplayRequest,
  ): Promise<{ replayed: number; failed: number }> {
    let messages = body?.messages ?? [];

    if (dlqType) {
      messages = messages.filter((m) => m.dlqType === dlqType);
    }

    let replayed = 0;
    let failed = 0;

    for (const message of messages) {
      try {
        if (message.dlqType === 'notification') {
          await this.notificationDlq.replayNotificationDlq(message.payload as any);
        } else if (message.dlqType === 'payment') {
          await this.paymentDlq.replayPaymentDlq(message.payload as any);
        } else {
          this.logger.warn(`Unknown dlqType in DLQ message: ${message.dlqType}`);
          failed++;
          continue;
        }
        replayed++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to replay DLQ message (${message.dlqType}): ${error}`);
      }
    }

    return { replayed, failed };
  }
}
