import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

/**
 * WebhookProcessor — processes outbox entries and delivers webhooks to n8n.
 *
 * Uses admin bypass since BullMQ workers have no tenant CLS context.
 * Distinguishes retryable (5xx, timeout, network) from non-retryable (4xx) errors.
 */
@Processor('webhook')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly rlsBypassPrisma: PublicPrismaService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<{ outboxId: string }>) {
    const { outboxId } = job.data;
    const n8nUrl = this.config.get<string>('N8N_WEBHOOK_URL', '');

    if (!n8nUrl) {
      this.logger.warn('N8N_WEBHOOK_URL not configured, skipping');
      return;
    }

    // Fetch outbox entry with admin bypass (batch transaction for adapter-pg compat)
    const [, outbox] = await this.rlsBypassPrisma.$transaction([
      this.rlsBypassPrisma.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`,
      this.rlsBypassPrisma.webhookOutbox.findUnique({ where: { id: outboxId } }),
    ]);

    if (!outbox) {
      this.logger.warn(`Outbox entry not found: ${outboxId}`);
      return;
    }

    if (outbox.status === 'DELIVERED') {
      return;
    }

    if (outbox.attempts >= outbox.maxAttempts) {
      await this.updateStatus(outboxId, 'FAILED', 'Max attempts reached');
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': outbox.idempotencyKey,
        },
        body: JSON.stringify(outbox.payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        await this.updateStatus(outboxId, 'DELIVERED', undefined);
        this.logger.debug(
          `Webhook delivered: ${outbox.eventType} (${outboxId})`,
        );
      } else if (response.status >= 500) {
        // Retryable: server error
        await this.incrementAttempts(
          outboxId,
          `HTTP ${response.status}: ${response.statusText}`,
        );
        throw new Error(`HTTP ${response.status}`);
      } else if (response.status >= 400) {
        // Non-retryable: client error
        await this.updateStatus(
          outboxId,
          'FAILED',
          `HTTP ${response.status}: ${response.statusText}`,
        );
        this.logger.error(
          `Webhook failed (non-retryable): ${outbox.eventType} (${outboxId})`,
        );
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        await this.incrementAttempts(outboxId, 'Timeout after 10s');
      } else {
        await this.incrementAttempts(outboxId, error.message);
      }
      throw error; // Trigger BullMQ retry
    }
  }

  private async updateStatus(
    outboxId: string,
    status: string,
    lastError?: string,
  ) {
    await this.rlsBypassPrisma.$transaction([
      this.rlsBypassPrisma.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`,
      this.rlsBypassPrisma.webhookOutbox.update({
        where: { id: outboxId },
        data: {
          status,
          lastError,
          ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        },
      }),
    ]);
  }

  private async incrementAttempts(outboxId: string, lastError: string) {
    // Calculate next attempt time with exponential backoff
    // 30s, 1m, 2m, 4m, 8m, 16m (base 30s * 2^attempt)
    const now = new Date();
    const nextAttemptIn = 30000 * Math.pow(2, 1); // simplified — BullMQ handles actual retry delay

    await this.rlsBypassPrisma.$transaction([
      this.rlsBypassPrisma.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`,
      this.rlsBypassPrisma.webhookOutbox.update({
        where: { id: outboxId },
        data: {
          attempts: { increment: 1 },
          lastError,
          nextAttemptAt: new Date(now.getTime() + nextAttemptIn),
        },
      }),
    ]);
  }
}
