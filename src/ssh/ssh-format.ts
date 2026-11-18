export type ExecResult = {
  command: string;
  stdout: Buffer;
  stderr: Buffer;
  code: number | null; // null when the process was killed by a signal
  signal: string | null;
};

export function getText(result: ExecResult): string {
  return result.stdout.toString();
}

export function getError(result: ExecResult): string {
  return result.stderr.toString();
}

export function isSuccess(result: ExecResult): boolean {
  return result.code === 0;
}

export function formatComamndResult(result: ExecResult): ExecResult {
  if (isSuccess(result)) return result;

  const failureReason =
    result.signal !== null
      ? `killed by signal: ${result.signal}`
      : result.code === null
        ? "No exit code, channel closed early"
        : `exit with code: ${result.code}`;

  const stdError = getError(result);
  throw new Error(
    `Command failed (${failureReason}): ${result.command}  failed with message: ${stdError ?? "undefined"}`,
  );
}
// docker exec <container-name> cat /etc/ssh/ssh_host_ed25519_key.pub
