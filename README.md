# z-416-server

Backend for the [z-416](https://github.com/Daniel-231/z-416) app — authentication,
friends, and live location relay.

## Stack

- **Runtime:** Node.js + [Express 4](https://expressjs.com/), written in TypeScript
- **Dev runner:** [`tsx`](https://tsx.is/) (`tsx watch`, no build step while iterating)
- **Realtime:** [Socket.IO](https://socket.io/) for live location broadcast
- **Database:** PostgreSQL (hosted on Supabase) via [Prisma 7](https://www.prisma.io/)
  with the `@prisma/adapter-pg` driver adapter
- **Auth:** Supabase Auth — the client logs in against Supabase, the server verifies
  the access token with `@supabase/supabase-js` (service-role key)
- **Config:** `dotenv` (`.env` for local, `.env.production` for prod)

## Requirements

- Node.js 20+ and npm
- Access to a PostgreSQL database (a Supabase project provides one)
- A Supabase project (for Auth)

## Setup

```bash
git clone https://github.com/Daniel-231/z-416-server
cd z-416-server
npm install
cp .env.example .env   # then fill in real values
```

`.env` and `.env.*` are gitignored (only `.env.example` is committed), so nothing
with real secrets gets pushed.

### Database

Generate the Prisma client and apply migrations to your database:

```bash
npx prisma generate          # writes the client to src/generated/prisma
npm run migrate:dev          # prisma migrate dev — creates/updates tables
```

`npm run migrate:dev` uses `DIRECT_URL` (see below). If you point `.env` at a fresh
database, this creates the `User`, `Friendship`, and `LocationShare` tables from the
migrations in `prisma/migrations/`.

## Environment variables

Copy `.env.example` to `.env` and fill in the values. Variables actually read by the
code:

| Variable | Required | Used by | Description |
| --- | --- | --- | --- |
| `PORT` | no (defaults to `5000`) | `src/index.ts` | Port the Express/Socket.IO server listens on |
| `DATABASE_URL` | **yes** | `src/lib/prisma.ts` | **Pooled** Postgres connection string used by Prisma Client at runtime. On Supabase this is the pgbouncer pooler URL (port `6543`, `?pgbouncer=true`) |
| `DIRECT_URL` | **yes** | `prisma.config.ts` | **Direct / session** Postgres connection (Supabase port `5432`). CLI-only — used by `prisma migrate` / `prisma studio` / `prisma db pull`. Running migrations through the pooler hangs on the advisory lock, so the CLI needs the direct connection |
| `SUPABASE_URL` | **yes** | `src/lib/supabase.ts` | Supabase project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | `src/lib/supabase.ts` | Supabase **service-role** key. Server-side only — used to verify bearer tokens. Never expose to clients |

The committed `.env` / `.env.production` also carry `SUPABASE_PASSWORD`,
`SUPABASE_ANON_KEY`, `SUPABASE_AUTH_CLIENT_ID`, and `SUPABASE_AUTH_SECRET`. These are
**not currently read by any code** — they're kept for reference / future use. You can
leave them blank for local development.

> Why two database URLs? `@prisma/config` 7.9.x has no working `directUrl` option, so
> `prisma.config.ts` sets its CLI `datasource.url` to `DIRECT_URL` explicitly while the
> runtime client in `src/lib/prisma.ts` connects with the pooled `DATABASE_URL`.

### `.env.example`

```dotenv
# Server
PORT=5000

# Database — Prisma Client at runtime (pooled connection)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"

# Database — Prisma CLI only: migrate / studio / db pull (direct connection)
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

# Supabase Auth (server-side)
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Not read by code yet — kept for reference
SUPABASE_PASSWORD=
SUPABASE_ANON_KEY=
SUPABASE_AUTH_CLIENT_ID=
SUPABASE_AUTH_SECRET=
```

## Running

```bash
npm run dev     # start with auto-reload (tsx watch src/index.ts)
npm run build   # compile TypeScript to dist/
npm start       # run the compiled build (node dist/index.js)
```

On start you should see `Express Server is Listening On Port: <PORT>`.

### npm scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload via `tsx watch` |
| `npm run build` | `tsc -p tsconfig.json` → `dist/` |
| `npm start` | Run the compiled server (`dist/index.js`) |
| `npm run migrate:dev` | `prisma migrate dev` against `.env` |
| `npm run migrate:prod` | `prisma migrate deploy` against `.env.production` |
| `npm run studio:dev` | Open Prisma Studio against `.env` |
| `npm run studio:prod` | Open Prisma Studio against `.env.production` |

## Verifying it's up

```bash
curl http://localhost:5000/health
# => {"status":"ok"}
```

## Authentication

All routes except `/health` require a bearer token:

```
Authorization: Bearer <supabase-access-token>
```

The client obtains this token from Supabase Auth. `src/Middleware/requireAuth.ts`
verifies it with `supabaseAdmin.auth.getUser(token)` and attaches `req.supabaseUser`.
Most routes then look up the local `User` row by `authId` — a client must call
`POST /auth/sync` once after signup to create that row.

## HTTP API

| Method | Path | Auth | Body | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | no | — | Liveness check |
| `POST` | `/auth/sync` | yes | `{ "username": string }` | Upsert the local `User` row for the authed Supabase user. `409` if the username is taken |
| `GET` | `/users/all_users` | yes | — | List all users |
| `GET` | `/friends/all_friends` | yes | — | List accepted friends of the current user |
| `POST` | `/friends/send_request` | yes | `{ "addresseeId": string }` | Create a `PENDING` friend request |
| `PUT` | `/friends/:id/accept_request` | yes | — | Accept a pending request addressed to you |
| `PUT` | `/friends/:id/decline_request` | yes | — | Delete a pending request addressed to you |
| `GET` | `/friends/friend_requests` | yes | — | Incoming pending requests *(work in progress)* |

## Realtime (Socket.IO)

Socket.IO shares the HTTP server (same `PORT`). Wire-up is in `src/socket/socket.ts`.

| Event | Direction | Payload | Description |
| --- | --- | --- | --- |
| `sendLocation` | client → server | `{ coords: { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed }, timestamp }` | A client publishes its location |
| `sendLocation` | server → other clients | `{ from: <socketId>, location: <payload above> }` | Broadcast to every other connected client |

> Note: the socket layer currently does not authenticate connections or scope
> broadcasts to friends / active `LocationShare` rows.

## Data model

Defined in `prisma/schema.prisma`:

- **`User`** — `authId` (Supabase user id), `email`, `username` (unique), `authProvider` (`EMAIL`)
- **`Friendship`** — `requesterId` → `addresseeId`, `status` (`PENDING` | `ACCEPTED` | `BLOCKED`), unique on `(requesterId, addresseeId)`
- **`LocationShare`** — `requesterId` (wants to see) → `sharerId` (being tracked), `status` (`REQUESTED` | `ACTIVE` | `ENDED` | `DECLINED`)

## Project layout

```
src/
  index.ts               # app entry: express + http server, middleware, route mounting, socket init
  generated/prisma/       # generated Prisma client (gitignored, run `prisma generate`)
  lib/
    prisma.ts             # PrismaClient wired to @prisma/adapter-pg (DATABASE_URL)
    supabase.ts           # supabaseAdmin client (SUPABASE_URL + service-role key)
  Middleware/
    requireAuth.ts        # verifies the Supabase bearer token
  Routes/
    authRouter.ts         # /auth
    usersRouter.ts        # /users
    friendsRouter.ts      # /friends
  socket/
    socket.ts             # Socket.IO server + sendLocation relay
prisma/
  schema.prisma
  migrations/
prisma.config.ts          # Prisma CLI config (schema path, migrations path, DIRECT_URL datasource)
```

## Deployment notes

- Set the same environment variables in your host (or use `.env.production` with the
  `*:prod` scripts, which load it via `dotenv-cli`).
- Build and run: `npm run build && npm start`.
- Apply migrations on deploy: `npm run migrate:prod` (`prisma migrate deploy`).
