import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * WebhookService — enqueues webhook events to the outbox for reliable delivery.
 *
 * BullMQ exponential backoff with delay: 30000 produces retries at approximately:
 * 30s, 1m, 2m, 4m, 8m, 16m
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectQueue('webhook') private readonly webhookQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  buildPayload(type: string, data: object) {
    return {
      id: `evt_${crypto.randomUUID()}`,
      type,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  async enqueue(eventType: string, payload: object) {
    const n8nUrl = this.config.get<string>('N8N_WEBHOOK_URL', '');
    if (!n8nUrl) {
      // Dev mode without n8n configured — skip silently
      return;
    }

    const idempotencyKey = crypto.randomUUID();

    // Batch transaction: set_config + create on same PG connection.
    // Interactive transactions break with @prisma/adapter-pg.
    const [, outbox] = await this.prisma.$transaction([
      this.prisma.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`,
      this.prisma.webhookOutbox.create({
        data: {
          eventType,
          payload: payload as any,
          idempotencyKey,
          status: 'PENDING',
        },
      }),
    ]);

    // Enqueue BullMQ job
    await this.webhookQueue.add(
      eventType,
      { outboxId: outbox.id },
      {
        attempts: 6,
        backoff: { type: 'exponential', delay: 30000 },
        jobId: idempotencyKey, // deduplicate at queue level too
      },
    );

    this.logger.debug(
      `Enqueued webhook event: ${eventType} (outboxId: ${outbox.id})`,
    );
  }
}
