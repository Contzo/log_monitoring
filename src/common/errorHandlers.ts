import { Logger } from "@nestjs/common";

export function logError(error: Error | unknown, logger: Logger, prefix?: string) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(prefix ? `${prefix}: ${message}` : message, stack);
}
