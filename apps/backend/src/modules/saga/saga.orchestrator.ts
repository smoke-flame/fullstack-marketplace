import { Injectable, Logger } from '@nestjs/common';
export interface SagaStep<T> {
  name: string;
  execute(context: T): Promise<void>;
  compensate?(context: T): Promise<void>;
}
@Injectable()
export class SagaOrchestrator {
  private readonly logger = new Logger(SagaOrchestrator.name);
  async run<T>(name: string, context: T, steps: SagaStep<T>[]) {
    const complete: SagaStep<T>[] = [];
    try {
      for (const step of steps) {
        await step.execute(context);
        complete.push(step);
      }
      this.logger.log(`Saga ${name} completed`);
    } catch (error) {
      this.logger.error(`Saga ${name} failed; compensating ${complete.length} step(s)`);
      for (const step of complete.reverse()) {
        if (step.compensate)
          await step
            .compensate(context)
            .catch((compensationError: unknown) =>
              this.logger.error(`Compensation ${step.name} failed`, compensationError),
            );
      }
      throw error;
    }
  }
}
