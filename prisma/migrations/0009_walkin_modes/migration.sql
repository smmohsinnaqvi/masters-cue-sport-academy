ALTER TYPE "SessionGameFormat" ADD VALUE 'SOLO';

ALTER TABLE "sessions"
  ADD COLUMN "walk_in_open_ended" BOOLEAN NOT NULL DEFAULT FALSE;
