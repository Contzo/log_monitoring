import { QueryFailedError } from 'typeorm';
import { ConflictException } from '@nestjs/common';

const UNIQUE_VIOLATION_CODES = new Set([
  '23505',
  'SQLITE_CONSTRAINT_UNIQUE',
  'SQLITE_CONSTRAINT_PRIMARYKEY',
]);

function getDriverErrorCode(error: unknown): string | undefined {
  if (!(error instanceof QueryFailedError)) return undefined;
  const driverError = error.driverError as { code?: unknown } | undefined;

  return typeof driverError?.code === 'string' ? driverError.code : undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  const code = getDriverErrorCode(error);
  return code !== undefined && UNIQUE_VIOLATION_CODES.has(code);
}
export function handleDbError(error: unknown, conflictMessage: string): never {
  if (isUniqueViolation(error)) throw new ConflictException(conflictMessage);
  throw error;
}
