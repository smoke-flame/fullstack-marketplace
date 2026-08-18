import { env } from '@config/env';
import { ServiceUnavailableException } from '@modules/common/errors/gateway-errors';

export async function withInternalTimeout<T>(
  _service: string,
  operation: () => Promise<T>,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new ServiceUnavailableException()),
          env.INTERNAL_CALL_TIMEOUT_MS,
        );
      }),
    ]);
  } catch {
    throw new ServiceUnavailableException();
  } finally {
    if (timer) clearTimeout(timer);
  }
}
