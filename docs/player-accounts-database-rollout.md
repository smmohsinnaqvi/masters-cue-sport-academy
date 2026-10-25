# Player accounts database rollout

The player-account feature requires the additive migration at
`prisma/migrations/0010_player_accounts_and_tabs/migration.sql`. It creates
player profiles, session charge allocations, and account payment allocations;
it does not rewrite existing sessions or automatically assign legacy dues.

## Production rollout status

Migration `0010_player_accounts_and_tabs` was applied to the Supabase
production database on 2026-10-25 with `npx prisma migrate deploy`. Prisma
reports the schema is up to date. The four feature tables
(`player_profiles`, `session_dues`, `player_tab_payments`, and
`session_due_payments`) and the completed migration record were verified.

A PostgreSQL custom-format dump was created before the migration and validated
with `pg_restore --list`. It is stored outside the repository at
`%LOCALAPPDATA%\MCSA\backups\mcsa-before-player-migration-20261025.dump`.
The archive was not restored into a separate database as part of this rollout.
Treat it as sensitive production data; access is limited to the current user,
local administrators, and SYSTEM on the machine where it was created.

The development and production environments currently share a database. Treat
that database as production and do not run `prisma db push`, `prisma migrate dev`,
or the migration SQL against it as part of local development.

## Rollout procedure

1. Create or select an isolated staging database with the same PostgreSQL
   version and extensions as production.
2. Verify the staging connection target and take a restorable production
   backup before planning the production change.
3. Apply the committed migration to staging with `npx prisma migrate deploy`.
4. Deploy the application against staging and verify player registration,
   profile search, session dues, partial payments, oldest-first allocations,
   and statements. Confirm guest sessions still work.
5. Review the production backup and migration diff, and obtain explicit
   approval before targeting the shared production database.
6. During an approved maintenance window, point Prisma to the verified
   production connection and run `npx prisma migrate deploy`. Verify the
   migration status and the four new tables before enabling the player
   workflow in production.

The migration must be applied before deploying code that enables account
operations against that database. Do not put database connection strings in
source control or paste them into logs.
