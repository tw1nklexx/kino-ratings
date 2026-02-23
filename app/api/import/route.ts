import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseKinopoiskLink } from "@/lib/telegram";
import { fetchMovieDetails, shouldRefreshDetails } from "@/lib/kinopoisk";

export type ImportBody = { links: string[] };

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

  const results: { kinopoiskId: number; type: string; movieId: string; created: boolean }[] = [];

  for (const { kinopoiskId, type } of unique) {
    const movie = await prisma.movie.upsert({
      where: { kinopoiskId_type: { kinopoiskId, type } },
      create: { kinopoiskId, type },
      update: {},
    });

    const created = movie.createdAt.getTime() === movie.updatedAt.getTime();
    results.push({
      kinopoiskId,
      type,
      movieId: movie.id,
      created,
    });

    if (shouldRefreshDetails(movie.lastFetchedAt)) {
      const details = await fetchMovieDetails(movie.kinopoiskId, type, { timeoutMs: 6000 });
      if (details) {
        await prisma.movie.update({
          where: { id: movie.id },
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
      }
    }
  }

  return NextResponse.json({ imported: results.length, results });
}
