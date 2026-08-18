import { Controller, Post, Query, Body, Logger } from '@nestjs/common';
import { Internal } from '@modules/common/decorators/internal.decorator';
import { NotificationService } from './notification.service';

interface DlqReplayRequest {
  messages?: Array<{
    originalEventType: string;
    payload: Record<string, unknown>;
    meta?: Record<string, unknown>;
  }>;
  eventType?: string;
}

@Controller()
export class DlqController {
  private readonly logger = new Logger(DlqController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Post('internal/dlq/replay')
  @Internal()
  async replayDlq(@Query('eventType') eventType?: string, @Body() body?: DlqReplayRequest): Promise<{ replayed: number; filtered: number }> {
    let messages = body?.messages ?? [];

    if (eventType) {
      messages = messages.filter((m) => m.originalEventType === eventType);
    }

    let replayed = 0;
    let filtered = 0;

    for (const message of messages) {
      try {
        await this.notificationService.replayDlqMessage(message);
        replayed++;
      } catch (error) {
        filtered++;
        this.logger.error(`Failed to replay DLQ message: ${error}`);
      }
    }

    return { replayed, filtered };
  }
}
