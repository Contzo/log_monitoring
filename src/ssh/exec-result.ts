export interface ExecResult {
  command: string;
  stdout: Buffer;
  stderr: Buffer;
  code: number | null;
  signal: string | null;
}

export class RemoteCommandError extends Error {
  constructor(
    message: string,
    readonly result: ExecResult,
  ) {
    super(message);
    this.name = "RemoteCommandError";
  }
}

const MAX_STDERR_IN_MESSAGE = 300;

export function stdoutText(result: ExecResult): string {
  return result.stdout.toString("utf8");
}

export function stderrText(result: ExecResult): string {
  return result.stderr.toString("utf8");
}

export function isSuccess(result: ExecResult): boolean {
  return result.code === 0;
}

export function assertSuccess(result: ExecResult): ExecResult {
  if (isSuccess(result)) return result;

  const reason =
    result.code !== null ? `exit code ${result.code}` : `signal ${result.signal ?? "unknown"}`;
  const stderr = stderrText(result).trim().slice(0, MAX_STDERR_IN_MESSAGE);

  throw new RemoteCommandError(
    `Command failed (${reason}): ${result.command}${stderr ? ` - ${stderr}` : ""}`,
    result,
  );
}
