export type Cursor = { inode: string | null; offset: number };
export type Observed = { inode: string; size: number };

export type CursorDecision =
  | { kind: "nothing" }
  | { kind: "read"; from: number }
  | { kind: "reset"; from: 0 };

export function decideCursor(cursor: Cursor, observed: Observed): CursorDecision {
  // No cursor yet (first run): start from the beginning of the file.
  if (cursor.inode === null) return { kind: "reset", from: 0 };

  if (cursor.inode !== observed.inode || observed.size < cursor.offset) {
    return { kind: "reset", from: 0 };
  }

  if (observed.size === cursor.offset) return { kind: "nothing" };

  return { kind: "read", from: cursor.offset };
}
