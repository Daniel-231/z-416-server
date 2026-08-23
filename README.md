# z-416-server

Backend for the [z-416](https://github.com/Daniel-231/z-416) app — auth, friends, and live location relay.

## Stack

- Node.js + Express, written in TypeScript
- `tsx` for local dev (no build step needed while iterating)
- `dotenv` for local environment variables

Planned but not yet wired up (see `docs/NEXT-STEPS.md` in the main app repo): Socket.io for live location relay, PostgreSQL + Prisma for persistence, JWT + bcrypt for auth.

## Requirements

- Node.js 20+ and npm

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with real values — it's gitignored, so nothing there gets committed.

## Running

```bash
npm run dev     # start with auto-reload (tsx watch)
npm run build   # compile TypeScript to dist/
npm start       # run the compiled build (dist/index.js)
```

The server reads `PORT` from `.env`, falling back to `5000` if unset.

## Verifying it's up

```bash
curl http://localhost:$PORT/health
# => {"status":"ok"}
```

## Project layout

```
src/
  index.ts           # app entry point, middleware, route mounting
  Routes/
    usersRouter.ts    # mounted at /users
```

## Environment variables

| Variable | Description |
| --- | --- |
| `PORT` | Port the Express server listens on (defaults to `5000`) |

Update this table as new variables (`DATABASE_URL`, `JWT_SECRET`, etc.) are added.
