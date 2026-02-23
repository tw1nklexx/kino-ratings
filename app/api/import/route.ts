import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseKinopoiskLink } from "@/lib/telegram";
import { fetchMovieDetails, shouldRefreshDetails } from "@/lib/kinopoisk";

const FETCH_TIMEOUT_MS = 12000;

export type ImportBody = { links: string[] };

async function processOne(
  kinopoiskId: number,
  type: "film" | "series",
  movieId: string
): Promise<"ready" | "failed"> {
  const details = await fetchMovieDetails(kinopoiskId, type, {
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  if (details) {
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
        detailsStatus: "ready",
      },
    });
    return "ready";
  }
  await prisma.movie.update({
    where: { id: movieId },
    data: { detailsStatus: "failed" },
  });
  return "failed";
}

export async function POST(request: NextRequest) {
  let body: ImportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawLinks = Array.isArray(body.links) ? body.links : [];
  const parsed: { kinopoiskId: number; type: "film" | "series" }[] = [];
  for (const line of rawLinks) {
    const text = typeof line === "string" ? line.trim() : String(line).trim();
    if (!text) continue;
    const result = parseKinopoiskLink(text);
    if (result) parsed.push(result);
  }

  const seen = new Set<string>();
  const unique = parsed.filter((p) => {
    const key = `${p.kinopoiskId}-${p.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const results: {
    kinopoiskId: number;
    type: string;
    movieId: string;
    created: boolean;
    detailsStatus: "ready" | "failed" | "pending";
  }[] = [];

  for (const { kinopoiskId, type } of unique) {
    const movie = await prisma.movie.upsert({
      where: { kinopoiskId_type: { kinopoiskId, type } },
      create: { kinopoiskId, type, detailsStatus: "pending" },
      update: {},
    });

    const created = movie.createdAt.getTime() === movie.updatedAt.getTime();
    let detailsStatus: "ready" | "failed" | "pending";

    if (shouldRefreshDetails(movie.lastFetchedAt)) {
      detailsStatus = await processOne(kinopoiskId, type, movie.id);
    } else {
      detailsStatus = movie.detailsStatus === "ready" ? "ready" : "failed";
    }

    results.push({
      kinopoiskId,
      type,
      movieId: movie.id,
      created,
      detailsStatus,
    });
  }

  const ready = results.filter((r) => r.detailsStatus === "ready").length;
  const failed = results.filter((r) => r.detailsStatus === "failed").length;

  return NextResponse.json({
    imported: results.length,
    ready,
    failed,
    results,
  });
}
