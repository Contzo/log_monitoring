import { Logger } from "@nestjs/common";

export function logError(error: Error | unknown, logger: Logger) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(message, stack);
}
