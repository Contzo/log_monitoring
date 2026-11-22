# CLAUDE.md: messages API (history queries, filtering, pagination)

Notes on the message read API. The root `CLAUDE.md` rules still apply (learning project: no code unless I ask; review my code instead).

## Decisions so far

- **Filters and pagination go in the query string of a `GET`**, never in a body (a GET body has no defined meaning; some clients and proxies drop it). The URL fully describes the view, so the frontend can mirror filters in its own URL. A `POST /messages/search` with a body is the escape hatch only if filters get very complex (nested AND/OR, long ID lists).
- **Route params (`:id`) identify a resource; query params filter a collection.** Rule of thumb: if the request makes sense without the value, it is a query param.
- **Flat route:** `GET /messages?logFileId=...&from=...&to=...&q=...&limit=...&before=...`. Not nested under `/log-files/:id/messages`, because the UI will also want "all messages of a server" and "last hour across all files". A nested alias can be added later.
- **Keyset (cursor) pagination, not offset.** Order by `id` descending (newest first); `before=<id>` returns rows with a smaller id. Reasons:
  - Offset pages shift while new log lines arrive (rows repeat across pages).
  - Offset gets slower deeper in.
  - `id` is auto-increment and assigned in the poller's insert, so id order is storage order. More reliable than `createdAt`, where a catch-up batch shares nearly the same timestamp.
  - If sorting by a non-unique column later, add `id` as a tie-breaker.
- **Response shape (planned):** an envelope, items plus `nextCursor` (`null` on the last page), not a bare array. Fetch `limit + 1` rows to know whether a next page exists; avoid `COUNT(*)` (expensive on a big table; make a total optional if the UI wants it).
- **Empty result is 200 with an empty list, not 404.** 404 is for a missing single resource (`/messages/99999`).
- **Relations are not loaded by default.** A message returns `logFileId` only. Don't load the log file / server for list endpoints (repeated per row); load relations only where an endpoint needs them. Avoid `eager: true`.

## Planned filters

- `logFileId` (done in the service).
- `limit` (default e.g. 50, max 150) and `before` (cursor): in the DTO, not yet applied in the service.
- `serverId`: needs a join through `logFile` (Message has no `serverId`).
- `from` / `to`: ISO 8601 UTC, half-open range `[from, to)`.
- `q` text search: `LIKE '%..%'` is fine at first (no index helps it; table scan). Escape `%` and `_` in user input; always bind as a parameter. Postgres `pg_trgm` can index it later.
- Indexes should follow the real queries, e.g. `(logFileId, id)` for "this file, newest first, before id X". Ties into open decision 7 in the root CLAUDE.md.

## Query DTO validation (`dtos/messages-query.dto.ts`)

- Query params always arrive as **strings**.
- `?` in TypeScript does nothing at runtime: every field needs `@IsOptional()` to be optional. Also mark the TS type optional (`limit?`, `before?`) so the compiler forces handling the missing case (e.g. defaulting `limit`).
- Use `Number(value)` (or `@Type(() => Number)`), not `parseInt`: `parseInt` silently accepts `12abc` -> 12, `1.9` -> 1, `1e3` -> 1, and a repeated param (array) `1,2` -> 1. `Number` gives `NaN` for all of these, so validation rejects them. Caveat: `Number("")` is 0 (caught by `@Min(1)`).
- `@IsInt()` rather than `@IsNumber()` (which accepts floats).
- **Global `ValidationPipe` needs `transform: true`** (in `app.module.ts`) so the controller receives the DTO instance with converted values. Without it you get a plain object and shouldn't rely on the conversions. `forbidNonWhitelisted` would turn unknown params into a 400 instead of silently dropping them (decide).
- Beware implicit conversion for booleans: `"false"` becomes `true`.

## TypeORM query builder notes

- **Object shorthand only works with a plain variable name.** A parameter object with `query.logFileId` needs an explicit key; the key must match the `:placeholder` name in the condition. Values are bound parameters, never pasted into SQL (injection-safe).
- **Alias** (`createQueryBuilder("message")`) does two jobs: it is the SQL table alias (`FROM message message` = table name + alias, `AS` optional) used in conditions like `message.logFileId`, and it is the prefix of the selected column aliases (`message_id`, `message_text`, ...). Without an explicit alias the repository uses the entity name `Message`. Joins get their own alias (e.g. `logFile`), so one flat row maps to a `Message` with a nested `LogFile`. Aliases also disambiguate columns like `id` that exist in both tables.
- **Don't use `select("*")` with `getMany()`.** It replaces the generated, prefixed column list; the raw rows then lack `message_id`, the mapper can't find the primary key, skips every row, and `getMany()` silently returns `[]`. For partial selects, use alias-qualified names and always include the primary key; `addSelect` adds instead of replacing.
- `getRawMany()` returns raw rows: no entity mapping and **no column transformers** (Postgres bigint comes back as a string). Use it for aggregates.
- Builder methods mutate the builder, so build it step by step with `if`s. Add a filter only when it was sent; compare with `!== undefined`, not truthiness.
- A second `.where()` **replaces** the first; use `andWhere` for additional conditions (fine even with no prior `where`).
- The builder is only a description: nothing runs until `getMany()` / `getOne()` / `getRawMany()`.
- Debugging: `getSql()` shows the SQL without running it; `logging: true` on the data source prints every query (too noisy to leave on).
- TypeORM ignores `undefined` values in a `where` object: convenient for reads, dangerous for updates/deletes (a missing filter matches every row).

## Current state (2026-11-22)

- `GET /messages/:id`: uses `ParseIntPipe`; service awaits `findOne` and throws 404 when missing. Done.
- `messages.service.ts` `find(query)`: alias `message`, conditional `logFileId` filter, `getMany()`. No order, limit or `before` yet.
- `messages.controller.ts` `find`: still calls `this.messageService.find()` **without passing `query`** (compile error now that `find` takes it), and uses `console.log` (switch to `Logger.debug` with a template string).
- `ValidationPipe` still has only `whitelist: true` (no `transform`).
- DTO: `limit` and `before` lack the `?` in their TS types; no default for `limit` yet.

## Next steps

1. Pass `query` from the controller; replace `console.log` with the class `Logger`.
2. Enable `transform: true`; add `?` and a default `limit`.
3. In the service: order by `message.id` DESC, `andWhere` for `before`, take `limit + 1`, return the envelope with `nextCursor`.
4. Add a `MessageDto` and run responses through the existing serialize interceptor.
5. Test cases for `http/messages.http`:
   - `/messages`: 200, newest 50.
   - `?limit=5&before=10`: ids below 10.
   - `?limit=abc`, `12abc`, `1.5`, `500`, `limit=1&limit=2`: 400.
   - `?logFileId=999`: 200 with an empty list.
   - `?foo=bar`: dropped (or 400 with `forbidNonWhitelisted`).
6. Then: `from`/`to`, `serverId` (join), `q`; then indexes.
