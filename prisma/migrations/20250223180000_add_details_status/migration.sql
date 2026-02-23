-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "detailsStatus" TEXT NOT NULL DEFAULT 'pending';

-- Backfill: movies that already have fetched data are "ready"
UPDATE "Movie" SET "detailsStatus" = 'ready' WHERE "lastFetchedAt" IS NOT NULL;
