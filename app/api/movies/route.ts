import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SORT_VALUES = [
  "title_asc",
  "title_desc",
  "year_desc",
  "year_asc",
  "rating_desc",
  "rating_asc",
  "created_desc",
] as const;

type SortValue = (typeof SORT_VALUES)[number];

function getTitle(m: { titleRu: string | null; titleOriginal: string | null; kinopoiskId: number }) {
  return m.titleRu || m.titleOriginal || `ID ${m.kinopoiskId}`;
}

function compareNullsLast<T>(a: T | null, b: T | null, cmp: (a: T, b: T) => number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return cmp(a, b);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // queued | watched | dropped
  const unratedBy = searchParams.get("unratedBy"); // me | her | both
  const search = searchParams.get("search")?.trim() ?? "";
  const genre = searchParams.get("genre")?.trim() ?? "";
  const sortParam = searchParams.get("sort")?.trim();

  const sort: SortValue | "" =
    sortParam && SORT_VALUES.includes(sortParam as SortValue) ? (sortParam as SortValue) : "created_desc";

  const movies = await prisma.movie.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      ratings: true,
      telegramPosts: { orderBy: { postedAt: "desc" }, take: 1 },
    },
  });

  type MovieRow = (typeof movies)[number];
  type MovieWithAverage = MovieRow & { averageRating: number | null };

  const withAverage: MovieWithAverage[] = movies.map((m) => {
    const withRating = m.ratings.filter((r): r is typeof r & { rating: number } => r.rating != null);
    const averageRating =
      withRating.length > 0
        ? Math.round((withRating.reduce((sum, r) => sum + r.rating, 0) / withRating.length) * 10) / 10
        : null;
    return { ...m, averageRating };
  });

  let filtered: MovieWithAverage[] = withAverage;

  if (status && ["queued", "watched", "dropped"].includes(status)) {
    filtered = filtered.filter((m) => m.status === status);
  }

  if (unratedBy === "me") {
    filtered = filtered.filter((m) => !m.ratings.find((r) => r.userKey === "me" && r.rating != null));
  } else if (unratedBy === "her") {
    filtered = filtered.filter((m) => !m.ratings.find((r) => r.userKey === "her" && r.rating != null));
  } else if (unratedBy === "both") {
    filtered = filtered.filter((m) => {
      const me = m.ratings.find((r) => r.userKey === "me");
      const her = m.ratings.find((r) => r.userKey === "her");
      return (me?.rating == null) && (her?.rating == null);
    });
  }

  if (genre) {
    filtered = filtered.filter((m) => m.genres.includes(genre));
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((m) => {
      const titleRu = (m.titleRu ?? "").toLowerCase();
      const titleOrig = (m.titleOriginal ?? "").toLowerCase();
      return titleRu.includes(q) || titleOrig.includes(q);
    });
  }

  filtered.sort((a, b) => {
    switch (sort) {
      case "title_asc": {
        return getTitle(a).localeCompare(getTitle(b), "ru");
      }
      case "title_desc": {
        return getTitle(b).localeCompare(getTitle(a), "ru");
      }
      case "year_desc": {
        return compareNullsLast(a.year, b.year, (x, y) => y - x);
      }
      case "year_asc": {
        return compareNullsLast(a.year, b.year, (x, y) => x - y);
      }
      case "rating_desc": {
        return compareNullsLast(a.averageRating, b.averageRating, (x, y) => y - x);
      }
      case "rating_asc": {
        return compareNullsLast(a.averageRating, b.averageRating, (x, y) => x - y);
      }
      case "created_desc":
      default: {
        const aPosted = a.telegramPosts[0]?.postedAt ?? a.createdAt;
        const bPosted = b.telegramPosts[0]?.postedAt ?? b.createdAt;
        return bPosted.getTime() - aPosted.getTime();
      }
    }
  });

  return NextResponse.json(filtered);
}
