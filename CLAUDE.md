# CLAUDE.md

## Project overview

A log-monitoring app. A remote Linux server writes specific messages to an internal log file. This app collects those messages, stores them in PostgreSQL, and shows them in a simple web UI, both live (real time) and historical (queried from the DB).

Constraints and goals:
- **Nothing can be installed on the monitored server.** Only tools already present on a standard Linux box may be used there. I do have SSH access to it.
- **More servers of the same kind may be added later.** Design with multiple sources in mind from the start.
- The app runs on a **separate machine** from the monitored server(s).
- Eventually the whole app runs in **Docker containers** in production.
- Log messages are **short**; assume one message per line (revisit if the real log proves otherwise).
- This is also a **learning project** (see "How to work with me").

## How to work with me (IMPORTANT)

This is a learning project. The goal is for me to understand and write the code myself.

- **Do NOT write code unless I explicitly ask for it.** This includes snippets, examples, config files, SQL, and Dockerfiles. If I haven't asked, don't include them.
- Instead: explain concepts, describe the approach in prose, name the relevant APIs/modules/docs to look at, outline steps, and point out pitfalls. Concrete worked examples with sample data (log lines, byte counts, table contents) are welcome; they are not code.
- When I share my code, review it: explain what is wrong or risky and why, and let me make the fix. Offer to show code only if I ask.
- Lay out trade-offs and options when there is a real decision, give a recommendation with reasons, and let me decide.
- Prefer small, incremental steps over big designs I can't follow.
- If I ask for code, keep it minimal and explain the non-obvious parts.

## Architecture (decided: PULL over SSH with polling)

An earlier idea was a push script on the monitored server. That was dropped because I have SSH access, and pulling keeps the monitored server completely untouched and keeps all state on the app side.

```
[Monitored server(s)]                         [App host]
  log file  <── ssh2 exec (stat, tail -c) ──  NestJS backend ──> PostgreSQL
                  poll every few seconds         │  ▲
                                                 │  │ REST (history)
                                                 ▼  │
                                         real-time stream ──> Next.js frontend
```

### Ingestion: polling over SSH with a byte-offset cursor
- Backend uses the **`ssh2`** Node library. One persistent SSH connection per monitored server; each poll runs short exec commands on that connection (no new handshake per poll).
- **Per-log-file cursor**, stored on the `LogFile` row: `(inode, byteOffset, generation)`. `byteOffset` = number of bytes of the file already consumed and stored, i.e. where the next unread line begins. `generation` = which version of the file the cursor is in (see Idempotency).
- **One poll cycle** (per log file):
  1. Remote `stat` returns current inode and size.
  2. `decideCursor` (pure, `src/poll/cursor-decision.ts`) compares with the cursor and returns `nothing`, `read from offset`, or `reset from 0` (no inode yet, inode changed, or size < offset).
  3. Fetch only new bytes **from the decision's `from`** (not the stored offset, which is stale on a reset), as a raw `Buffer`. `tail -c +N` is **1-indexed**, so request `from + 1`; cap with `head -c MAX_BYTES_PER_POLL`.
  4. `parseCompleteLines(chunk, from)` (pure, `src/poll/parse-lines.ts`) keeps only **complete lines**: cut at the last `\n`; the trailing partial line is not consumed and is re-read next poll.
  5. In **one DB transaction**: insert the messages (skip on conflict), then save the cursor: inode from `stat`, **new offset = `from` + bytes consumed** (NOT the file size, NOT old offset + consumed), and generation (+1 on reset, unchanged on read). Inode, offset and generation are always saved together in one update.
- **Work in bytes, not characters.** Offsets are bytes. Cut and count on the `Buffer` (`ExecResult.stdout`); decode each complete line to a string only after cutting. Do not accept a string in the parser: `.length` counts UTF-16 units, and decoding invalid UTF-8 turns 1 byte into a 3-byte U+FFFD, so the cursor would drift.
- **Parser rules:** empty lines are skipped but their bytes still count as consumed; a trailing `\r` is stripped from the content but counted. No `\n` in the chunk means 0 bytes consumed.
- **Line longer than the cap (TODO):** gives 0 consumed with a full chunk, so the cursor would be stuck forever. Detect `consumedBytes === 0 && chunk.length === MAX_BYTES_PER_POLL` in the poll cycle and decide: force-consume with a warning, or skip.
- **Append-only assumption:** the cursor is only valid if bytes before the offset never change, which is how real loggers behave. Editing a file in a text editor breaks it: either a new inode (reset, everything re-read) or an in-place rewrite (offset lands mid-line, first characters of lines go missing). When testing, add lines only with `echo "..." >> file`, and keep test files ending in exactly one `\n`.
- **Optional sanity check (not implemented):** the offset always points at a line start, so the byte at `offset - 1` must be `\n`. Fetch from one byte earlier and verify; if not `\n`, log a warning and reset.
- **Rotation/truncation:** a reset reads the new file from the start. Consider also checking the rotated-away file (e.g. `app.log.1`) for unread bytes to avoid a gap. How the real log rotates is still unknown (see open decisions).
- **Cap bytes per poll** (`MAX_BYTES_PER_POLL`, currently 64 KiB, in `RemoteLogReader.service.ts`) so catching up after downtime is done in bounded chunks (poll again immediately until caught up).
- **Idempotency (decided):** message identity is **`(logFileId, generation, startOffset)`**, enforced by a unique index; inserts must **skip on conflict** (`ON CONFLICT DO NOTHING` / TypeORM `orIgnore`), never error the whole batch.
  - `startOffset` alone is not enough: offsets restart at 0 after a reset, and new lines would collide with old ones and be silently skipped.
  - Why a **generation counter** instead of the inode: it follows our own reset logic, so it also covers truncation (same inode, size < offset) and inode reuse. A content hash was rejected: identical text at the same offset in a new file (e.g. a startup banner) would be wrongly skipped.
  - Accepted side effect: every reset stores the file's lines again under the new generation, even if the content is unchanged (editor save, manual cursor reset). Duplicates after a reset are preferred over silently lost lines.
  - Insert-then-advance in one transaction: a crash can only cause a harmless duplicate attempt, never a lost line.

### Backend: NestJS
- **Poller provider** (no controller). Registered in a module reachable from the root module. Started from `onApplicationBootstrap` (DB is ready by then): load enabled log files from DB, start one loop per file.
- **Do not await the loops inside the lifecycle hook**; Nest awaits async hooks before it starts listening, so awaiting an infinite loop would hang boot. Start loops fire-and-forget with their own error handling attached.
- **Self-scheduling loop per log file:** poll, finish, then sleep, then poll again. This guarantees no overlapping polls per file (a fixed-interval scheduler like `@Interval` would not). Files poll independently.
- Keep a map `logFileId -> stop handle` (AbortController). Make the sleep **interruptible** so shutdown is fast. An `AbortError` is the normal way a loop stops: log it at `log`/`debug` level, not as an error.
- **Shutdown:** call `app.enableShutdownHooks()` in `main.ts`; on `onModuleDestroy`/`onApplicationShutdown` stop all loops, let in-flight cycles finish, close SSH connections. Important for Docker SIGTERM.
- **Failure handling:** try/catch around each cycle so one server's failure never kills other loops; exponential backoff on repeated failures, reset on success; reconnect the SSH connection when it drops; keepalives on the connection.
- **Per-server status** stored in DB (last success, last error) so the UI can show "unreachable since ...".
- Controllers manage the poller indirectly: enabling/disabling a **log file** via the API asks the poller to start/stop that file's loop.
- **Decided: no `isEnabled` on servers.** Only `LogFile.isEnabled` is a switch (one loop per enabled file). A server with no enabled files is simply idle.
- **Decided: `SshService` owns the connections** (`Map<serverId, Client>`), shared by all loops of a server. Connections are created **lazily** on the first poll cycle that needs one, reconnected when dropped, removed from the map on `close`/`error`, and **not closed when idle** (only on server deletion and shutdown). Bootstrap only starts loops for enabled files; there is no server-level bootstrap connect.
- **Decided: server connection status** (`lastSuccessAt`/`lastErrorAt`/`lastError`) is written by **`SshService.connect`** (on `ready` and `error`), not by each loop and not by `RemoteLogReaderService` (which only fetches and throws).
  - Reason: a server has several log files; if each file loop wrote server status, file-level errors from one file and successes from another would make it flap.
  - File-level errors (`RemoteCommandError`: the server answered but the command failed, e.g. missing file) are only logged for now. Add a per-file status on `LogFile` later if the UI needs them.
  - **Settle the connection promise first** (resolve/reject), then write the status **fire-and-forget**. The status write catches and logs its own errors and **never rethrows**: nobody awaits it, so a rethrow would be an unhandled rejection and crash Node. A failed status write must never block or break the connection.
  - Not yet recorded: a connection closing without an `error` event, and exec-level failures (channel open error, command timeout).
  - **Open:** `lastSuccessAt` is currently set once per connect (connections persist), so it really means "last connected at". Either rename it or also update it on successful commands (throttled). `lastError` is never cleared: the UI must compare `lastErrorAt` with `lastSuccessAt`, or clear it on success. Decide before building the UI.
- **Module wiring:** `SshModule` imports `ServerModule` (for `ServerService`); `ServerModule` must not import `SshModule` (that would be circular). Modules go in `imports`, never in `providers`.
- **Error handling rule:** catch where you can handle the error; otherwise let it propagate. Rethrow only if the caller awaits and can act differently. A layer that catches only to record something must rethrow; a fire-and-forget function must handle every error itself. The poll cycle's `try/catch` is the boundary for a cycle.
- **Logging:** Nest's built-in `Logger` (`@nestjs/common`), one `private readonly logger` per class with `ClassName.name` as context (no manual brackets; Nest adds them).
  - The last string argument of `log`/`warn`/`debug` is the **context**, and the second argument of `error` is the **stack**: put values into the message with template strings, never as extra arguments.
  - Levels: `debug` for per-poll noise (cursor decision, parsed lines); `log` for rare events (loop start/stop, connect, reset); `warn` for recoverable problems; `error` for failed cycles, with the stack.
  - Shared helper in `src/common/` for logging an `unknown` caught error (message + stack, with a caller-supplied message prefix). Kept as a function rather than a `Logger` subclass. Don't override `Logger.error`.
  - Level filtering via the `logger` option of `NestFactory.create`, driven by an env variable.
  - Never log `SshConfig` (it contains the password).
- Keep the **line parser a pure function** (bytes in; messages with start offsets plus consumed byte count out) so the trickiest logic is testable without SSH or a DB. Done: `parseCompleteLines` in `src/poll/parse-lines.ts`.
- Also serves historical queries (filtering, pagination) and pushes new messages to clients in real time.
- Run a **single backend instance** for now. Two instances would both poll every server (the unique key prevents duplicate rows but work and cursor updates would collide). Later options: Postgres advisory lock per server, or a separate poller container.

### Database: PostgreSQL (TypeORM)
- **ORM: TypeORM** (in use). Dev runs on SQLite with `synchronize: true`; Postgres runs with `synchronize: false` and needs migrations. Every entity must be listed in `entities` in `src/data-source.ts`.
- **Server:** config + connection status (`lastSuccessAt`, `lastErrorAt`, `lastError`).
- **LogFile:** belongs to a server (`serverId`, `onDelete: CASCADE`), unique `(server, logPath)`, `isEnabled`, and the cursor: `inode` (nullable string, compared for equality only), `byteOffset` (bigint with `bigintToNumber`), `generation` (to add; starts at 0, +1 on every reset).
- **Message** (in progress, `src/messages/message.entity.ts`):
  - explicit `logFileId` FK column (like `LogFile.serverId`), not nullable; `onDelete` behaviour still to decide (CASCADE vs block).
  - `generation` and `startOffset` (bigint with `bigintToNumber`: offsets pass 2.1 billion once a file is over 2 GB; Postgres returns bigint as a string).
  - content as `text` (one decoded line).
  - received-at timestamp (`timestamptz`, `@CreateDateColumn`): when the poller stored it, used for time ranges, live view and retention. After downtime, catch-up gives many lines nearly the same timestamp, so the true order within a file is `(generation, startOffset)`. A timestamp parsed from the line itself would be a separate column (open decision 6).
  - Unique index `(logFileId, generation, startOffset)`.
  - Index for time-range queries: received-at, or `(logFileId, receivedAt)` if queries mostly filter by file.
  - Consider a bigint primary key if volume gets high.

### Frontend: Next.js (App Router)
- Simple UI: a live view of incoming messages and a view to browse stored messages.
- I'm not interested in Next.js server-side features beyond the App Router basics. Keep it simple and mostly client-driven.

### Security
- Dedicated, read-only SSH key and user for this app (not my personal key). If the server owner allows it, restrict the key to the specific read commands.
- **Verify host keys** (known_hosts); do not disable verification to make things work.
- Never commit secrets or private keys. In Docker, mount keys and known_hosts as secrets/volumes.

### Deployment
- Docker containers for backend, frontend, and Postgres, likely orchestrated with Docker Compose.
- Keep configuration in environment variables so dev and prod differ only by config.

## Open decisions (discuss with me before assuming)

1. **Real-time transport** to the browser: Server-Sent Events vs WebSocket (Nest supports both) and how the poller notifies that layer after a commit.
2. ~~ORM/DB access~~: decided, TypeORM (see Database).
3. **Log rotation** on the monitored server: mechanism (rename vs copytruncate), schedule, and whether to read the rotated file to avoid a gap.
4. **First connection behavior:** backfill the existing file from the beginning, or start from "now"?
5. **Poll interval** (1 to 3 s feels live) and the **max bytes per poll** cap.
6. **Log line format:** raw text vs parsing into structured fields (timestamp, level, text); confirm one message per line.
7. **Schema details (remaining):** the cursor lives on `LogFile` and the message key is decided (see Database). Still open: `Message` `onDelete`, the exact time index, the bigint primary key, and the meaning of `lastSuccessAt`/`lastError`.
8. **Retention:** how long messages are kept; archiving or partitioning if needed.
9. **Credential management** for SSH keys in config/Docker, and **authentication** for the web UI/API if needed.
10. **Monorepo vs separate folders** for backend and frontend.

## Conventions

- TypeScript throughout (backend and frontend).
- Follow NestJS idioms: modules, controllers, providers/services, DTOs with validation.
- Keep backend and frontend as separate apps (monorepo or separate folders; to be decided).
- Don't add new dependencies without telling me what they are for and what the alternative is.
- Never commit secrets. Use `.env` files locally and keep them out of git.

## Commands

No project scaffold exists yet. Once it does, list the exact commands here (install, run backend, run frontend, run tests, lint, docker compose up/down) and keep them current.

## Working notes for Claude

- Check existing project files before suggesting structure, and stay consistent with what is already there.
- Keep answers concise and focused on the current step.
- Update this file when we settle an open decision (move it from "Open decisions" into the relevant section above).
