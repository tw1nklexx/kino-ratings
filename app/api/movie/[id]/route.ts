import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchMovieDetails, shouldRefreshDetails } from "@/lib/kinopoisk";

const VALID_STATUSES = ["queued", "watched", "dropped"] as const;

export type MovieUpdateBody = {
  status?: "queued" | "watched" | "dropped";
  watchedAt?: string | null; // ISO date string
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: movieId } = await params;
  let body: MovieUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status;
  const watchedAt = body.watchedAt;

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const data: { status?: string; watchedAt?: Date | null } = {};
  if (status !== undefined) data.status = status;
  if (watchedAt !== undefined) {
    data.watchedAt = watchedAt === null || watchedAt === "" ? null : new Date(watchedAt);
  }

  const movie = await prisma.movie.update({
    where: { id: movieId },
    data,
  });

  return NextResponse.json(movie);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: movieId } = await params;
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: { ratings: true, telegramPosts: { orderBy: { postedAt: "desc" }, take: 1 } },
  });
  if (!movie) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const validRatings = movie.ratings.filter((r) => r.rating !== null);
  const averageRating =
    validRatings.length > 0
      ? Math.round(
          (validRatings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / validRatings.length) * 10
        ) / 10
      : null;

  return NextResponse.json({
    ...movie,
    averageRating,
  });
}
