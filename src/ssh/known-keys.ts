export function isKnownHostKey(
  fileContent: string,
  host: string,
  port: number,
  key: Buffer,
): boolean {
  const wanted = port === 22 ? host : `[${host}]:${port}`;

  for (const line of fileContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@")) continue;

    const [hosts, , base64Key] = trimmed.split(/\s+/);
    if (hosts !== wanted || !base64Key) continue;

    if (Buffer.from(base64Key, "base64").equals(key)) return true;
  }
  return false;
}
