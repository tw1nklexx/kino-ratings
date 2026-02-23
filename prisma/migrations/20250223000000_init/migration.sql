-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "kinopoiskId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "titleRu" TEXT,
    "titleOriginal" TEXT,
    "year" INTEGER,
    "durationMinutes" INTEGER,
    "description" TEXT,
    "posterUrl" TEXT,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cast" JSONB,
    "ratingKinopoisk" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "watchedAt" TIMESTAMP(3),
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramPost" (
    "id" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "telegramMessageId" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "originalText" TEXT,
    "movieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "userKey" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_kinopoiskId_type_key" ON "Movie"("kinopoiskId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramPost_telegramChatId_telegramMessageId_key" ON "TelegramPost"("telegramChatId", "telegramMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_movieId_userKey_key" ON "Rating"("movieId", "userKey");

-- AddForeignKey
ALTER TABLE "TelegramPost" ADD CONSTRAINT "TelegramPost_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
