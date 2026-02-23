import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchMovieDetails } from "@/lib/kinopoisk";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: movieId } = await params;
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const details = await fetchMovieDetails(movie.kinopoiskId, movie.type as "film" | "series", {
    timeoutMs: 8000,
  });

  if (!details) {
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 502 });
  }

  await prisma.movie.update({
    where: { id: movieId },
    data: {
      titleRu: details.titleRu,
      titleOriginal: details.titleOriginal,
      year: details.year,
      durationMinutes: details.durationMinutes,
      description: details.description,
      posterUrl: details.posterUrl,
      genres: details.genres,
      countries: details.countries,
      cast: details.cast as object,
      ratingKinopoisk: details.ratingKinopoisk,
      lastFetchedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
