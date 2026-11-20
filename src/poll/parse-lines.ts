export interface ParsedLine {
  startOffset: number;
  content: string;
}

export interface ParseResult {
  lines: ParsedLine[];
  consumedBytes: number;
}

const LF = 0x0a; // '\n'
const CR = 0x0d; // '\r'

export function parseCompleteLines(chunk: Buffer, baseOffset: number): ParseResult {
  const lastNewline = chunk.lastIndexOf(LF);
  if (lastNewline === -1) return { lines: [], consumedBytes: 0 };

  const consumedBytes = lastNewline + 1;
  const lines: ParsedLine[] = [];
  let lineStart = 0;

  while (lineStart < consumedBytes) {
    // Always found: a newline exists at or before lastNewline.
    const newline = chunk.indexOf(LF, lineStart);
    let lineEnd = newline;
    if (lineEnd > lineStart && chunk[lineEnd - 1] === CR) lineEnd--;

    // Empty lines are skipped but still counted in consumedBytes.
    if (lineEnd > lineStart) {
      lines.push({
        startOffset: baseOffset + lineStart,
        content: chunk.toString("utf8", lineStart, lineEnd),
      });
    }
    lineStart = newline + 1;
  }

  return { lines, consumedBytes };
}
