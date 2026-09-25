# Masters Cue Sport Academy

Real-time snooker and pool table booking and operations dashboard for a cue
sport academy.

The application supports:

- Public table availability and online bookings.
- Supervisor-managed walk-ins.
- A table-format supervisor ledger.
- Online bookings, walk-ins, and maintenance blocks in one authoritative
  `Session` model.
- Real-time availability updates through Supabase Realtime.
- Admin access to the supervisor view.
- Admin settings routes for tournaments, cafeteria items, and hourly rates.
- Confirmation dialogs for booking and operations mutations.
- Loading and error states for the main routes.

## Technology

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Prisma ORM
- Supabase Postgres
- Supabase Realtime
- Next.js Server Actions and Route Handlers
- Radix UI and Lucide icons

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project with a Postgres database

## Local setup

Install dependencies:

```powershell
npm install
```

Create `.env.local` with your Supabase and database values:

```env
DATABASE_URL=your-pooled-supabase-connection-string
DIRECT_URL=your-direct-supabase-connection-string
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret
```

Prisma CLI loads `.env` by default, not `.env.local`. For Prisma commands,
create a local ignored `.env` file containing at least `DATABASE_URL` and
`DIRECT_URL`. Do not commit either environment file.

Generate Prisma Client and synchronize the development database:

```powershell
npm run db:generate
npm run db:push
```

Seed the physical tables:

```powershell
npm run db:seed
```

The seed creates eight clean tables:

- Snooker: `S1` through `S6`
- Pool: `P1` and `P2`

The seed does **not** create dummy bookings, sessions, tournaments, or
cafeteria items. It is safe to run repeatedly because it uses upserts.

Start the development server:

```powershell
npm run dev
```

Open <http://localhost:3000>.

## Login

The current login screen uses local demo credentials stored in browser
`localStorage`. It is not yet backed by Supabase Auth.

Open <http://localhost:3000/login>.

### Admin

```text
Email: admin@masterscue.com
Password: admin123
```

The admin can open:

- `/admin`
- `/admin/settings`
- `/supervisor`

### Supervisor

```text
Email: supervisor@masterscue.com
Password: supervisor123
```

The supervisor can open:

- `/supervisor`

These credentials are for local testing only. Replace the demo authentication
with Supabase Auth before deploying the application to production.

## Database model

The database uses one occupancy and ledger model:

```text
Session
```

The `Session` model represents:

- Online bookings (`ONLINE`)
- Walk-ins (`WALKIN`)
- Maintenance blocks (`MAINTENANCE`)

Session statuses are:

```text
HELD
CONFIRMED
ONGOING
COMPLETED
CANCELLED
NO_SHOW
EXPIRED
```

Active sessions (`HELD`, `CONFIRMED`, and `ONGOING`) are used when calculating
availability. Completed, cancelled, no-show, and expired sessions do not block
new bookings.

Online holds expire after five minutes. Walk-ins initially reserve a two-hour
window and can extend in one-hour increments while they remain active.

The database also contains a PostgreSQL exclusion constraint to prevent
overlapping active sessions on the same table. The SQL is in:

```text
prisma/migrations/0002_session_constraint/migration.sql
```

## Important routes

### Pages

| Route | Purpose |
| --- | --- |
| `/` | Public academy landing page |
| `/booking` | Customer booking flow |
| `/login` | Admin and supervisor login |
| `/admin` | Admin dashboard |
| `/admin/settings` | Admin settings navigation |
| `/admin/settings/tournaments` | Tournament management |
| `/admin/settings/cafeteria` | Cafeteria item management |
| `/admin/settings/rates` | Hourly rate management |
| `/supervisor` | Supervisor ledger and operations |

### API routes

| Route | Purpose |
| --- | --- |
| `GET /api/tables/availability` | Read active sessions for a date/table |
| `GET /api/ledger` | Read sessions for the ledger date |
| `POST /api/cron/cleanup` | Expire holds and extend active walk-ins |

The cleanup endpoint requires:

```text
Authorization: Bearer <CRON_SECRET>
```

## Prisma commands

```powershell
# Generate Prisma Client
npm run db:generate

# Push schema changes directly to the database
npm run db:push

# Create/apply a development migration
npm run db:migrate

# Apply committed migrations in a deployed environment
npx prisma migrate deploy

# Seed S1-S6 and P1-P2
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Inspect the database and update schema.prisma
npx prisma db pull
```

Use `prisma db push --accept-data-loss` only when you understand and accept
the columns or tables Prisma may remove.

## Validation

Run a production build:

```powershell
npm run build
```

Run TypeScript validation:

```powershell
npx tsc --noEmit
```

Format the project:

```powershell
npm run format
```

## Project structure

```text
app/
  admin/                    Admin dashboard and settings routes
  api/                      Availability, ledger, and cleanup handlers
  booking/                  Customer booking page
  login/                    Local development login
  supervisor/               Supervisor ledger and operations
prisma/
  schema.prisma             Authoritative Prisma schema
  migrations/               Database migrations and constraints
scripts/
  seed-db.cjs               Clean table seed
src/actions/                Server actions for booking and operations
src/components/             Shared UI and booking components
src/hooks/                  Supabase-backed realtime hooks
src/lib/                    Prisma, Supabase, auth, and shared helpers
```

## Production notes

Before production deployment:

1. Replace local demo authentication with Supabase Auth and server-side
   authorization.
2. Configure a scheduler or Supabase Cron to call
   `POST /api/cron/cleanup`.
3. Keep `SUPABASE_SERVICE_ROLE_KEY`, `DIRECT_URL`, and `CRON_SECRET` server
   only.
4. Verify the PostgreSQL exclusion constraint exists in the target database.
5. Configure Supabase Realtime for the `sessions` table.
6. Run the production build and test online holds, walk-ins, cancellations,
   overlap rejection, billing, and realtime availability updates.

