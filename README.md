# Slot Booking API

A REST API for booking and cancelling time slots, with real-time availability
updates broadcast over Socket.IO. Built with Express, TypeScript, Prisma, and
PostgreSQL.

## Prerequisites

- Node.js (v18+)
- npm
- Docker + Docker Compose (for the test database)
- A running PostgreSQL instance for local development (or use Docker for this too)

## Installation

```bash
npm install
```

## Environment

Copy the example env file and fill in your own values:

```bash
cp .env.example .env
```

`.env.example`:
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<database>
PORT=3000

No authentication is required or implemented anywhere in this API — all
endpoints are publicly accessible by design (see [Key decisions](#key-decisions)).

## Migration, seed, and start

```bash
# apply migrations to your dev database
npx prisma migrate deploy

# seed sample time slots 
npx prisma db seed

# start the server
npm run dev
```

The server listens on `http://localhost:3000` (or `$PORT` if set).

## Test database and test commands

Docker is used here only as a convenient way to provide an isolated
PostgreSQL instance for the concurrency test; it is not required for the
main application, which connects to any PostgreSQL instance via
`DATABASE_URL`. 

```bash
# 1. start an isolated Postgres container for tests (port 5434, separate from any dev DB)
npm run test:db:up

# 2. apply migrations to the test database
npm run test:db:migrate

# 3. run the tests
npm test
```

`pretest` runs steps 1–2 automatically, so `npm test` alone is sufficient once
the Docker daemon is running.

Test DB config lives in `docker-compose.test.yml` and `.env.test` — the test
database runs on port `5434` specifically to avoid colliding with any other
Postgres instance (dev DB, another project's container, etc.) already bound to
the default `5432`/`5433`.

**If you hit `EADDRINUSE` or `P1000` authentication errors**, it usually means
a stale container is holding the port or an old data volume has different
credentials baked in. Reset cleanly with:

```bash
docker compose -f docker-compose.test.yml down -v
npm run test:db:up
npm run test:db:migrate
```

### What the tests cover

1. A successful booking returns `201` and the slot disappears from `GET /slots`.
2. Two concurrent `POST /bookings` requests for the same slot (fired via
   `Promise.all`, no sequential workaround) resolve to exactly one `201` and
   one `409`, and exactly one active booking persists in the database
   afterward — enforced by a partial unique index at the DB level, not
   application logic.
3. Cancelling a booking returns `200`, restores the slot to availability, and
   permits a new booking on that slot.
4. (Bonus) Repeated cancellation of an already-cancelled booking returns `200`
   idempotently, with no additional state change.

Tests generate their own slot data per test (random UUIDs, no fixed fixtures)
and clean up what they create in `afterAll`, so the suite is repeatable across
runs without manual DB resets.

## API and documentation

- **Swagger/Scalar UI**: `http://localhost:3000/docs`
- **OpenAPI spec**: `http://localhost:3000/openapi.json`

Three endpoints are documented: `GET /slots`, `POST /bookings`,
`DELETE /bookings/:bookingId` — including request/response schemas, all
status codes (`200`, `201`, `400`, `404`, `409`, `500`), validation rules,
examples, the idempotent-cancellation behavior, and the absence of
authentication. The documentation is generated from the same spec file the
server serves at runtime, so it reflects actual behavior rather than a
hand-written description that could drift.

## Real-time updates (Socket.IO)

Connects on the default namespace (`/`) and default path (`/socket.io`), no
authentication required.

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:3000");
```

| Event | Payload | Fired when |
|---|---|---|
| `slot.booked` | `{ slotId, bookingId, available: false }` | after a booking's DB write commits successfully |
| `slot.released` | `{ slotId, bookingId, available: true }` | after a cancellation's DB write commits successfully |

No events fire on rejected requests (`400`/`404`/`409`) or on repeated
cancellation of an already-cancelled booking. No customer data
(`customerName`/`customerEmail`) is included in event payloads. There is no
client-to-server event in this system.

**No delivery guarantees**: events are broadcast via `io.emit` to
currently-connected sockets only — there is no persistence, replay, or
exactly-once guarantee. A client that connects after an event fired, or is
disconnected during one, will miss it and must reconcile state via
`GET /slots`.

### Frontend-free verification

A minimal Node script using `socket.io-client`, with no browser or UI
required:

```js
// verify.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => console.log("Connected:", socket.id));
socket.on("slot.booked", (data) => console.log("slot.booked:", data));
socket.on("slot.released", (data) => console.log("slot.released:", data));
socket.on("disconnect", () => console.log("Disconnected"));
```

```bash
node verify.js
```

With that running, trigger the REST endpoints from another terminal (curl,
Postman, etc.) and confirm exactly one log line per successful booking/
cancellation, and none on rejected or repeated requests.

## Conflict prevention

Two concurrent `POST /bookings` requests for the same slot are prevented from
both succeeding by a **partial unique index** at the database level:

```sql
CREATE UNIQUE INDEX "bookings_active_slot_unique"
ON "bookings" ("timeSlotId")
WHERE "status" = 'active';
```

This allows a slot to have any number of *cancelled* bookings in its history,
but only ever one *active* booking at a time. When two requests race, both
attempt an insert; Postgres allows exactly one to succeed and rejects the
other with a unique-constraint violation (`P2002`), which the controller
catches and returns as `409 SLOT_UNAVAILABLE`. This is enforced atomically by
the database itself rather than by an application-level read-then-write check,
which would be vulnerable to the same race it's meant to prevent.

Booking cancellation uses a simpler read-then-update flow rather than the same
atomic-guard pattern, since each booking is cancelled independently by its own
ID — two different bookings never contend for the same row, so there is no
equivalent race to close there.

## Key decisions

- **No authentication**: out of scope per requirements; all endpoints are
  public.
- **Socket.IO on the default namespace/path**: no custom namespace, no rooms,
  no client-emitted events — the system only needs server-to-client broadcast
  of two event types.
- **Broadcast failures are non-fatal**: `broadcastSlotEvent` is a no-op if
  Socket.IO hasn't been initialized (e.g. when the Express app is imported
  directly by tests without starting a real server) and doesn't throw if
  `io.emit` itself fails — a lost real-time notification is recoverable via
  `GET /slots`, but it should never fail the underlying REST request.
- **`app.ts` / `server.ts` split**: the Express app (routes, middleware,
  docs) is defined and exported separately from the process entry point
  (HTTP server creation, Socket.IO init, `.listen()`). This lets integration
  tests import the app directly via `supertest` without binding a real port,
  avoiding port collisions and unhandled-exception noise in test runs.
- **Idempotent cancellation**: calling `DELETE /bookings/:id` on an
  already-cancelled booking returns `200` with the current state rather than
  erroring, and does not re-broadcast — this was a bug found and fixed during
  development (see AI disclosure).
- **Cancellation intentionally not given the same atomic-guard treatment as
  booking creation**, since cancellations target independent rows by ID and
  don't share the same race condition that concurrent bookings on the same
  slot do.

## Future improvements

- Add a test asserting Socket.IO events actually fire (current tests only cover REST responses; a dedicated test file would spin up a real HTTP server + socket.io-client on an ephemeral port)
- Rate limiting / basic abuse protection, given there's no auth
- Structured logging instead of console.log
- CI pipeline (GitHub Actions) running the test suite against a Postgres service container

## Actual time spent

 Approximately 3 hours across design, implementation, testing, and documentation.

## Unfinished / known gaps

All required endpoints, the data model, conflict-prevention mechanism, and the three specified automated tests are implemented and passing against a real PostgreSQL instance. Excluded by spec: frontend, authentication, payments, cloud deployment, CI/CD. No known gaps within the required scope.

## AI disclosure

AI assistance (Claude) was used throughout this project's development, specifically for:

- **System and API design validation**: reviewing the REST endpoint structure, Socket.IO event design, and error-handling approach against the stated requirements, and identifying gaps — including a missing database constraint that would have allowed duplicate active bookings under concurrent requests, and a logic bug in the cancellation endpoint that allowed a re-update to run after an already-cancelled response was sent.
- **Configuration**: Socket.IO server setup, the `app.ts`/`server.ts` split to make the Express app testable in isolation, and Docker Compose / environment setup for an isolated test database.
- **Documentation**: drafting the OpenAPI specification and this README, based on the actual controller, schema, and error-handling code in this repository.
- **Test authoring**: drafting the Vitest + Supertest integration test suite, including the concurrent-request test for the booking race condition.

All AI-suggested code was manually reviewed, adapted to match this project's
actual schema, error types, and validation logic, and verified by running the
full test suite against a real PostgreSQL instance (`npm test`), plus manual
verification of the Socket.IO events via the frontend-free `verify.js` script
and manual `curl` requests against the running server. No code was accepted
without being run and checked against the requirements in this document.
# Booking-system
