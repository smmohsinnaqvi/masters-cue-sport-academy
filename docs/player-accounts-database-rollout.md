# Player accounts database rollout

The player-account feature requires the additive migration at
`prisma/migrations/0010_player_accounts_and_tabs/migration.sql`. It creates
player profiles, session charge allocations, and account payment allocations;
it does not rewrite existing sessions or automatically assign legacy dues.

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
