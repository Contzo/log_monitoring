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
- **Per-server cursor** stored in Postgres: `(server, inode, offset)`. `offset` = number of bytes of the file already consumed and stored, i.e. where the next unread line begins.
- **One poll cycle:**
  1. Remote `stat` returns current inode and size.
  2. Compare with the cursor: same inode and size > offset means new data; size == offset means nothing to do.
  3. Fetch only new bytes. `tail -c +N` is **1-indexed**, so request `offset + 1`.
  4. Keep only **complete lines**: cut at the last newline; discard the trailing partial line (it is re-read next poll because the offset only advances past complete lines).
  5. In **one DB transaction**: insert the messages and advance the offset. New offset = old offset + bytes consumed (NOT the file size).
- **Work in bytes, not characters.** Offsets are bytes; use raw buffers to compute consumed length so non-ASCII text can't make the cursor drift.
- **Rotation/truncation:** if the inode changed, or size < offset, reset offset to 0 and read the new file from the start. Consider also checking the rotated-away file (e.g. `app.log.1`) for unread bytes to avoid a gap. How the real log rotates is still unknown (see open decisions).
- **Cap bytes per poll** so catching up after downtime is done in bounded chunks (poll again immediately until caught up).
- **Idempotency:** unique constraint on `(server, start_offset)` of each message; inserts must **skip on conflict** (never error the whole batch). Insert-then-advance is the safe order: a crash can only cause a harmless duplicate attempt, never a lost line.

### Backend: NestJS
- **Poller provider** (no controller). Registered in a module reachable from the root module. Started from `onApplicationBootstrap` (DB is ready by then): load servers from DB, start one loop per server.
- **Do not await the loops inside the lifecycle hook**; Nest awaits async hooks before it starts listening, so awaiting an infinite loop would hang boot. Start loops fire-and-forget with their own error handling attached.
- **Self-scheduling loop per server:** poll, finish, then sleep, then poll again. This guarantees no overlapping polls per server (a fixed-interval scheduler like `@Interval` would not). Servers poll independently.
- Keep a map `serverId -> stop handle` (abort signal or flag). Make the sleep **interruptible** so shutdown is fast.
- **Shutdown:** call `app.enableShutdownHooks()` in `main.ts`; on `onModuleDestroy`/`onApplicationShutdown` stop all loops, let in-flight cycles finish, close SSH connections. Important for Docker SIGTERM.
- **Failure handling:** try/catch around each cycle so one server's failure never kills other loops; exponential backoff on repeated failures, reset on success; reconnect the SSH connection when it drops; keepalives on the connection.
- **Per-server status** stored in DB (last success, last error) so the UI can show "unreachable since ...".
- Controllers manage the poller indirectly: enabling/disabling a **log file** via the API asks the poller to start/stop that file's loop.
- **Decided: no `isEnabled` on servers.** Only `LogFile.isEnabled` is a switch (one loop per enabled file). A server with no enabled files is simply idle.
- **Decided: `SshService` owns the connections** (`Map<serverId, Client>`), shared by all loops of a server. Connections are created **lazily** on the first poll cycle that needs one, reconnected when dropped, removed from the map on `close`/`error`, and **not closed when idle** (only on server deletion and shutdown). Bootstrap only starts loops for enabled files; there is no server-level bootstrap connect.
- Server connection status (`lastSuccessAt`/`lastError...`) is written by the connection owner, not by each loop. Add a per-file status later if file-level errors need showing.
- Keep the **line parser a pure function** (bytes in; messages with start offsets plus consumed byte count out) so the trickiest logic is testable without SSH or a DB.
- Also serves historical queries (filtering, pagination) and pushes new messages to clients in real time.
- Run a **single backend instance** for now. Two instances would both poll every server (the unique key prevents duplicate rows but work and cursor updates would collide). Later options: Postgres advisory lock per server, or a separate poller container.

### Database: PostgreSQL
- Tables (to design together): servers (config + status), cursors (inode, offset; may live on the server row), messages (server, start_offset, timestamp, content).
- Unique `(server, start_offset)` on messages. Index for the access patterns that matter: time range and per server.

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
2. **ORM/DB access** in NestJS: TypeORM, Prisma, or plain SQL driver.
3. **Log rotation** on the monitored server: mechanism (rename vs copytruncate), schedule, and whether to read the rotated file to avoid a gap.
4. **First connection behavior:** backfill the existing file from the beginning, or start from "now"?
5. **Poll interval** (1 to 3 s feels live) and the **max bytes per poll** cap.
6. **Log line format:** raw text vs parsing into structured fields (timestamp, level, text); confirm one message per line.
7. **Schema details:** where the cursor lives, status fields, indexes.
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
