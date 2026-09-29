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
- Public academy content is server-cached and invalidated by admin edits; live
  table availability and staff operations remain fresh.
- Admin access to the supervisor view.
- Admin settings routes for tournaments, cafeteria items, hourly rates, and shop products.
- A public mobile-first pro shop with admin-managed products and percentage discounts.
- Confirmation dialogs for booking and operations mutations.
- Pending feedback for login, booking, and supervisor actions.
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

The seed creates and activates six tables:

- Snooker: `T1` through `T4`
- Pool: `P1` and `P2`

The seed deactivates any other tables without deleting their rows or session
history. It does **not** create dummy bookings, sessions, tournaments, or
cafeteria items; it preserves rates on existing tables and is safe to run
repeatedly.

## Pro shop

Apply the shop database migration before running the app with shop pages:

```powershell
npm run db:migrate -- --name shop_products
```

The customer catalog is at `/shop`. Admins can manage its products in Admin
Settings → Shop; product updates also appear in the customer catalog. Product
discounts are percentages off the saved price. There is no cart or checkout.

Seed the sample cue, tip, chalk, glove, case, and care-kit catalog:

```powershell
npm run db:seed-shop
```

This provisions a public-read `shop-products` Supabase Storage bucket and
uploads locally authored sample artwork. The app issues signed upload URLs
only after verifying an admin session; storage writes are not available to
anonymous visitors. Admin uploads accept JPEG, PNG, WebP, and AVIF images up
to 3 MB. The seed command refuses remote Supabase projects unless you add
`--confirm-remote` after verifying the selected project:

```powershell
npm run db:seed-shop -- --confirm-remote
```

Keep Supabase service-role/secret keys server-only and configure them through
the ignored environment files or Vercel environment settings.

Start the development server:

```powershell
npm run dev
```

Open <http://localhost:3000>.

## Staff login

Staff login uses Supabase Auth. Create each staff account in Supabase Auth and
set its **app metadata** role to `admin` or `supervisor` (for example,
`{"role":"admin"}`). Do not set authorization roles in user-editable metadata.
The application validates the role from the authenticated Supabase user on the
server; browser storage is not used as an authentication source.

Open <http://localhost:3000/login>.

Administrators can open `/admin`, its settings routes, and `/supervisor`.
Supervisors can open `/supervisor`. Ledger APIs and operational server actions
enforce staff authorization independently of the client-side route gate.

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

Online booking requests expire after 30 minutes unless staff confirm or decline
them. Walk-ins reserve their table through closing time or the next booking,
whichever comes first.

The database also contains a PostgreSQL exclusion constraint to prevent
overlapping active sessions on the same table. The SQL is in:

```text
prisma/migrations/0002_session_constraint/migration.sql
```

Online bookings snapshot the table rate and reserved-slot charge when created.
The charge is visible in the ledger immediately; payment remains unpaid until
staff records it. Confirmed online bookings transition to `ONGOING` at their
start time and to `COMPLETED` at their planned end. Staff can stop an ongoing
booking early; its reserved-slot charge remains unchanged.

The supervisor Ledger and Bookings lists read from `Session` using independent
cursor-paginated queries. They load further pages as the user scrolls; no
duplicate ledger or bookings database table is maintained.

## Important routes

### Pages

| Route                         | Purpose                          |
| ----------------------------- | -------------------------------- |
| `/`                           | Public academy landing page      |
| `/booking`                    | Customer booking flow            |
| `/login`                      | Admin and supervisor login       |
| `/admin`                      | Admin dashboard                  |
| `/admin/settings`             | Admin settings navigation        |
| `/admin/settings/tournaments` | Tournament management            |
| `/admin/settings/cafeteria`   | Cafeteria item management        |
| `/admin/settings/rates`       | Hourly rate management           |
| `/supervisor`                 | Supervisor ledger and operations |

### API routes

| Route                                           | Purpose                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| `GET /api/tables/availability`                  | Read active sessions for a date/table                                 |
| `GET /api/ledger?view=ledger\|bookings&cursor=` | Cursor-paginated ledger or online booking history                     |
| `GET /api/cron/cleanup`                         | Reconcile booking start/end, expire holds, and extend active walk-ins |

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

# Seed T1-T4 and P1-P2
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Inspect the database and update schema.prisma
npx prisma db pull
```

Use `prisma db push --accept-data-loss` only when you understand and accept
the columns or tables Prisma may remove.

The connected Supabase database was previously synchronized with `prisma db
push`. Its existing schema was introspected, the additive schema updates were
synced, and its migration history was baselined against that verified schema.
`prisma migrate status` should report the database as up to date; use committed
migrations for future production schema changes.

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
  login/                    Supabase Auth staff login
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

1. Set Supabase Auth `app_metadata.role` for each staff user and verify
   server-side access controls before inviting staff.
2. Deploy to Vercel Pro/Enterprise for the configured per-minute Cron in
   `vercel.json`. Vercel Hobby only supports daily Cron scheduling, which is
   not sufficiently timely for booking start/end transitions. Set `CRON_SECRET`
   in the Vercel production environment.
3. Keep `SUPABASE_SERVICE_ROLE_KEY`, `DIRECT_URL`, and `CRON_SECRET` server
   only.
4. Verify the PostgreSQL exclusion constraint exists in the target database.
5. Configure Supabase Realtime for the `sessions` table.
6. Run the production build and test online holds, walk-ins, cancellations,
   overlap rejection, billing, and realtime availability updates.
