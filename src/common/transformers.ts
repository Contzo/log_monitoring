import type { ValueTransformer } from 'typeorm';

// Postgres returns bigint as a string to avoid precision loss. Byte offsets stay
// far below Number.MAX_SAFE_INTEGER (~9 PB), so converting to number is safe.
export const bigintToNumber: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};
